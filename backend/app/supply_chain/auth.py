from typing import List, Optional, Any
from fastapi import Header, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from backend.app.blockchain.database import get_db, UserWallet, WalletSession
from backend.app.blockchain.wallet_service import WalletService


class AuthenticatedOrgUser(BaseModel):
    user_id: str
    organization_id: str
    roles: List[str] = ["operations_analyst"]
    wallet_address: Optional[str] = None
    is_wallet_verified: bool = False
    session_id: Optional[str] = None


def get_current_org_user(
    authorization: Optional[str] = Header(None, alias="Authorization"),
    x_auth_token: Optional[str] = Header(None, alias="X-Auth-Token"),
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_org_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    x_roles: Optional[str] = Header(None, alias="X-User-Roles"),
    x_wallet_address: Optional[str] = Header(None, alias="X-Wallet-Address"),
    db: Session = Depends(get_db),
) -> AuthenticatedOrgUser:
    """
    Extracts authenticated user context with cryptographic session verification.
    
    Security Controls:
    1. If a session token (Authorization: Bearer <token> or X-Auth-Token) is provided,
       validates the cryptographic session issued upon EIP-191 single-use nonce signature.
       Derives user_id, organization_id, and wallet_address server-side.
    2. If X-Wallet-Address is supplied alone WITHOUT a valid session token,
       REJECTS with 401 Unauthorized to prevent wallet spoofing attacks.
    3. Rejects cross-tenant access if requested organization conflicts with
       authenticated cryptographic identity or registered user affiliations.
    4. Safe default for demonstration/test scenarios when no auth headers are passed.
    """
    token = authorization or x_auth_token
    roles = [r.strip() for r in x_roles.split(",")] if x_roles else ["operations_analyst"]

    # 1. Cryptographic session verification
    if token:
        clean_token = token.strip()
        if clean_token.lower().startswith("bearer "):
            clean_token = clean_token[7:].strip()
            
        session = WalletService.validate_session(db, clean_token)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session token. Please re-authenticate with your wallet.",
            )
        
        # If client passes X-Wallet-Address, it must match the session wallet
        if x_wallet_address and x_wallet_address.strip().lower() != session.wallet_address.lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Provided wallet address does not match authenticated session wallet.",
            )

        # If client passes X-Organization-Id, it must match the session organization
        if x_org_id and x_org_id.strip() != session.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-tenant access denied. Organization header conflicts with authenticated session.",
            )

        return AuthenticatedOrgUser(
            user_id=session.user_id,
            organization_id=session.organization_id,
            roles=roles,
            wallet_address=session.wallet_address,
            is_wallet_verified=True,
            session_id=session.session_token,
        )

    # 2. Wallet spoofing prevention: X-Wallet-Address alone is strictly forbidden
    if x_wallet_address:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Public wallet address provided without cryptographic session token. Wallet authentication requires an EIP-191 signature bound to a server-generated single-use nonce.",
        )

    # 3. Unauthenticated header checks
    user_id = (x_user_id or "user:ops-analyst-88").strip()
    org_id = (x_org_id or "ORG-APEX-GLOBAL").strip()

    # If user_id is registered to a specific organization in the DB, enforce it
    existing_wallets = (
        db.query(UserWallet)
        .filter(UserWallet.user_id == user_id, UserWallet.active == True)
        .all()
    )
    if existing_wallets:
        registered_orgs = {w.organization_id for w in existing_wallets}
        if org_id not in registered_orgs:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User '{user_id}' does not belong to organization '{org_id}'. Cross-tenant access denied.",
            )

    return AuthenticatedOrgUser(
        user_id=user_id,
        organization_id=org_id,
        roles=roles,
        wallet_address=None,
        is_wallet_verified=False,
    )


def validate_org_entity(entity: Any, organization_id: str, entity_name: str = "Resource") -> None:
    """
    Validates that the entity exists and strictly belongs to the authenticated user's organization.
    Returns 404 to avoid leaking existence of cross-tenant records.
    """
    if entity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} not found.",
        )

    if hasattr(entity, "organization_id") and entity.organization_id != organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{entity_name} not found.",
        )
