import datetime
import secrets
import hashlib
from typing import Any, Dict, Optional, Tuple
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_defunct
from sqlalchemy.orm import Session
from .config import settings
from .database import WalletNonce, UserWallet, WalletSession
from .contract_service import ContractService

class WalletVerificationError(Exception):
    """Base error for wallet verification failures."""
    pass

class NonceExpiredError(WalletVerificationError):
    pass

class NonceConsumedError(WalletVerificationError):
    pass

class NonceNotFoundError(WalletVerificationError):
    pass

class SignatureMismatchError(WalletVerificationError):
    pass

class SessionInvalidError(WalletVerificationError):
    pass

class SessionExpiredError(WalletVerificationError):
    pass

class WalletService:
    """
    Nonce-based wallet ownership verification using EIP-191 personal_sign domain-bound messages.
    Prevents replay attacks, expires nonces, and validates on-chain authorization.
    """

    @classmethod
    def generate_message(
        cls,
        user_id: str,
        organization_id: str,
        nonce: str,
        issued_at: datetime.datetime,
        expires_at: datetime.datetime,
        chain_id: Optional[int] = None,
    ) -> str:
        cid = chain_id or settings.POLYGON_AMOY_CHAIN_ID
        issued_str = issued_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        expires_str = expires_at.strftime("%Y-%m-%dT%H:%M:%SZ")
        return (
            f"{settings.APP_NAME} Wallet Linking Verification\n"
            f"Domain: {settings.APP_DOMAIN}\n"
            f"Chain ID: {cid}\n"
            f"User ID: {user_id}\n"
            f"Organization ID: {organization_id}\n"
            f"Nonce: {nonce}\n"
            f"Issued At: {issued_str}\n"
            f"Expires At: {expires_str}\n\n"
            f"Sign this message to link your wallet to your TRUSTCHAIN account."
        )

    @classmethod
    def create_nonce(
        cls,
        db: Session,
        user_id: str,
        organization_id: str,
        expiry_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Generates and stores a unique cryptographic nonce with expiry."""
        now = datetime.datetime.utcnow()
        expiry_sec = expiry_seconds or settings.NONCE_EXPIRY_SECONDS
        expires_at = now + datetime.timedelta(seconds=expiry_sec)
        nonce_val = secrets.token_hex(32)

        nonce_record = WalletNonce(
            nonce=nonce_val,
            user_id=user_id,
            organization_id=organization_id,
            issued_at=now,
            expires_at=expires_at,
            consumed=False,
        )
        db.add(nonce_record)
        db.commit()
        db.refresh(nonce_record)

        domain_message = cls.generate_message(
            user_id=user_id,
            organization_id=organization_id,
            nonce=nonce_val,
            issued_at=now,
            expires_at=expires_at,
        )

        return {
            "nonce": nonce_val,
            "user_id": user_id,
            "organization_id": organization_id,
            "issued_at": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "expires_at": expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "message": domain_message,
        }

    @classmethod
    def verify_and_link_wallet(
        cls,
        db: Session,
        user_id: str,
        organization_id: str,
        wallet_address: str,
        nonce: str,
        signature: str,
        contract_service: Optional[ContractService] = None,
    ) -> Dict[str, Any]:
        """
        Atomically verifies the signature, consumes the nonce, and links the wallet to the user.
        Checks on-chain registration if a contract service is available.
        """
        # 1. Fetch nonce record
        nonce_record = db.query(WalletNonce).filter(WalletNonce.nonce == nonce).first()
        if not nonce_record:
            raise NonceNotFoundError("The specified nonce was not found.")
        
        # 2. Check user & organization match
        if nonce_record.user_id != user_id or nonce_record.organization_id != organization_id:
            raise WalletVerificationError("Nonce was issued for a different user or organization.")

        # 3. Check already consumed
        if nonce_record.consumed:
            raise NonceConsumedError("This nonce has already been consumed (replay prevention).")

        # 4. Check expiration
        now = datetime.datetime.utcnow()
        if now > nonce_record.expires_at:
            raise NonceExpiredError("This wallet-linking nonce has expired.")

        # 5. Reconstruct domain message
        expected_message = cls.generate_message(
            user_id=nonce_record.user_id,
            organization_id=nonce_record.organization_id,
            nonce=nonce_record.nonce,
            issued_at=nonce_record.issued_at,
            expires_at=nonce_record.expires_at,
        )

        # 6. EIP-191 signature recovery
        try:
            signable = encode_defunct(text=expected_message)
            recovered_address = Account.recover_message(signable, signature=signature)
        except Exception as e:
            raise SignatureMismatchError(f"Malformed signature or verification error: {str(e)}")

        if recovered_address.lower() != wallet_address.strip().lower():
            raise SignatureMismatchError(
                f"Signature recovered address {recovered_address} does not match claimed wallet {wallet_address}."
            )

        # 7. Atomically consume the nonce
        nonce_record.consumed = True

        # 8. Upsert UserWallet
        checksum_address = Web3.to_checksum_address(wallet_address)
        user_wallet = (
            db.query(UserWallet)
            .filter(UserWallet.user_id == user_id, UserWallet.wallet_address == checksum_address)
            .first()
        )
        if not user_wallet:
            user_wallet = UserWallet(
                user_id=user_id,
                organization_id=organization_id,
                wallet_address=checksum_address,
                linked_at=now,
                active=True,
            )
            db.add(user_wallet)
        else:
            user_wallet.organization_id = organization_id
            user_wallet.active = True
            user_wallet.linked_at = now

        db.commit()
        db.refresh(user_wallet)

        # 9. Create cryptographic authenticated session token (stored as SHA-256 hash)
        session_token = f"tcs_{secrets.token_urlsafe(32)}"
        token_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()
        session_expires_at = now + datetime.timedelta(hours=24)
        wallet_session = WalletSession(
            token_hash=token_hash,
            session_token=None,  # Zero plaintext token storage in database
            user_id=user_id,
            organization_id=organization_id,
            wallet_address=checksum_address,
            created_at=now,
            expires_at=session_expires_at,
            active=True,
        )
        db.add(wallet_session)
        db.commit()
        db.refresh(wallet_session)

        # 10. Query on-chain registration status if contract service is configured
        on_chain_status = None
        if contract_service and contract_service.contract_address:
            try:
                on_chain_status = contract_service.get_wallet(checksum_address)
            except Exception:
                pass

        return {
            "status": "LINKED",
            "user_id": user_id,
            "organization_id": organization_id,
            "wallet_address": checksum_address,
            "session_token": session_token,
            "session_expires_at": session_expires_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "linked_at": user_wallet.linked_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "on_chain_status": on_chain_status,
        }

    @classmethod
    def validate_session(cls, db: Session, token: str) -> Optional[WalletSession]:
        """Validates a cryptographic session token using SHA-256 hash matching. Returns active session or None."""
        if not token:
            return None
        clean_token = token.strip()
        if clean_token.lower().startswith("bearer "):
            clean_token = clean_token[7:].strip()
        token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()
        
        # Look up by SHA-256 hash or legacy plaintext token
        session = (
            db.query(WalletSession)
            .filter(
                (WalletSession.token_hash == token_hash) | (WalletSession.session_token == clean_token),
                WalletSession.active == True,
            )
            .first()
        )
        if not session:
            return None
        now = datetime.datetime.utcnow()
        if now > session.expires_at:
            session.active = False
            db.commit()
            return None
        return session

    @classmethod
    def revoke_session(cls, db: Session, token: str) -> bool:
        """Revokes an active session token server-side."""
        clean_token = token.strip()
        if clean_token.lower().startswith("bearer "):
            clean_token = clean_token[7:].strip()
        token_hash = hashlib.sha256(clean_token.encode("utf-8")).hexdigest()
        
        session = (
            db.query(WalletSession)
            .filter(
                (WalletSession.token_hash == token_hash) | (WalletSession.session_token == clean_token)
            )
            .first()
        )
        if session:
            session.active = False
            db.commit()
            return True
        return False

    @classmethod
    def get_linked_wallet(cls, db: Session, user_id: str) -> Optional[Dict[str, Any]]:
        wallet = db.query(UserWallet).filter(UserWallet.user_id == user_id, UserWallet.active == True).first()
        if not wallet:
            return None
        return {
            "user_id": wallet.user_id,
            "organization_id": wallet.organization_id,
            "wallet_address": wallet.wallet_address,
            "linked_at": wallet.linked_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "active": wallet.active,
        }

    @classmethod
    def unlink_wallet(cls, db: Session, user_id: str, wallet_address: str) -> bool:
        checksum = Web3.to_checksum_address(wallet_address)
        wallet = (
            db.query(UserWallet)
            .filter(UserWallet.user_id == user_id, UserWallet.wallet_address == checksum)
            .first()
        )
        if wallet:
            wallet.active = False
            db.commit()
            return True
        return False
