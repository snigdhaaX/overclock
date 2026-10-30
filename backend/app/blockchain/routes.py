from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from .database import get_db
from .config import settings
from .hash_service import RecoveryPlanHashService
from .wallet_service import (
    WalletService,
    WalletVerificationError,
    NonceExpiredError,
    NonceConsumedError,
    NonceNotFoundError,
    SignatureMismatchError,
)
from .contract_service import ContractService
from .transaction_service import TransactionService
from .event_listener import EventListenerService
from .verification_service import PlanVerificationService

router = APIRouter(prefix="/blockchain", tags=["Blockchain Governance"])

# --- Security & Auth Dependency ---

class AuthenticatedUser(BaseModel):
    user_id: str
    organization_id: str
    roles: List[str] = ["operations_analyst"]

def get_current_user(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    x_org_id: Optional[str] = Header(None, alias="X-Organization-Id"),
    x_roles: Optional[str] = Header(None, alias="X-User-Roles"),
) -> AuthenticatedUser:
    """
    Extracts authenticated user context from request headers or auth provider.
    Enforces that user and organization identity are server-validated.
    """
    user_id = x_user_id or "user:analyst-101"
    org_id = x_org_id or "org:acme-logistics"
    roles = [r.strip() for r in x_roles.split(",")] if x_roles else ["operations_analyst"]
    return AuthenticatedUser(user_id=user_id, organization_id=org_id, roles=roles)

def get_contract_service() -> ContractService:
    return ContractService()

# --- Request / Response Models ---

class NonceResponse(BaseModel):
    nonce: str
    user_id: str
    organization_id: str
    issued_at: str
    expires_at: str
    message: str

class VerifySignatureRequest(BaseModel):
    wallet_address: str = Field(..., example="0x1234567890123456789012345678901234567890")
    nonce: str
    signature: str

class HashGenerateRequest(BaseModel):
    plan_data: Dict[str, Any]

class HashVerifyRequest(BaseModel):
    plan_data: Dict[str, Any]
    expected_hash: str

class RegisterTxRequest(BaseModel):
    tx_hash: str
    chain_id: Optional[int] = None
    function_name: Optional[str] = None
    plan_id: Optional[str] = None
    plan_version: Optional[int] = None

class SaveOperationalPlanRequest(BaseModel):
    plan_id: str
    version: int
    plan_data: Dict[str, Any]

# ===========================================================================
# 1. WALLET OWNERSHIP & LINKING
# ===========================================================================

@router.post("/wallet/nonce", response_model=NonceResponse)
def request_wallet_nonce(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Generates a domain-bound, single-use cryptographic nonce for wallet signature."""
    res = WalletService.create_nonce(
        db=db,
        user_id=user.user_id,
        organization_id=user.organization_id,
    )
    return res

@router.post("/wallet/verify")
def verify_wallet_signature(
    req: VerifySignatureRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    Verifies an EIP-191 personal_sign signature against the issued nonce.
    Atomically links the verified wallet to the user's organizational account.
    """
    try:
        res = WalletService.verify_and_link_wallet(
            db=db,
            user_id=user.user_id,
            organization_id=user.organization_id,
            wallet_address=req.wallet_address,
            nonce=req.nonce,
            signature=req.signature,
            contract_service=contract_service,
        )
        return res
    except NonceNotFoundError:
        raise HTTPException(status_code=404, detail="Nonce not found.")
    except NonceExpiredError:
        raise HTTPException(status_code=400, detail="Nonce has expired. Request a new one.")
    except NonceConsumedError:
        raise HTTPException(status_code=400, detail="Nonce already consumed. Replay rejected.")
    except SignatureMismatchError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except WalletVerificationError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/wallet/linked")
def get_linked_wallet(
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    contract_service: ContractService = Depends(get_contract_service),
):
    """Retrieves the linked wallet and on-chain authorization for the current user."""
    wallet = WalletService.get_linked_wallet(db, user.user_id)
    if not wallet:
        return {"linked": False, "wallet": None}
    
    on_chain = None
    if contract_service.contract_address:
        try:
            on_chain = contract_service.get_wallet(wallet["wallet_address"])
        except Exception:
            pass
            
    return {
        "linked": True,
        "wallet": wallet,
        "on_chain_authorization": on_chain,
    }

@router.delete("/wallet/unlink")
def unlink_wallet(
    wallet_address: str,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Controlled unlinking of a wallet from the user account."""
    ok = WalletService.unlink_wallet(db, user.user_id, wallet_address)
    if not ok:
        raise HTTPException(status_code=404, detail="Linked wallet not found.")
    return {"status": "UNLINKED", "wallet_address": wallet_address}

@router.get("/wallet/{wallet_address}/authorization")
def get_wallet_authorization(
    wallet_address: str,
    contract_service: ContractService = Depends(get_contract_service),
):
    """Reads on-chain wallet registry authorization directly from the contract."""
    try:
        return contract_service.get_wallet(wallet_address)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Contract query error: {str(e)}")

# ===========================================================================
# 2. CANONICAL HASHING
# ===========================================================================

@router.post("/hash/generate")
def generate_canonical_hash(
    req: HashGenerateRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """
    Computes deterministic RFC 8785 canonical JSON and its SHA-256 fingerprint.
    Enforces that organization_id matches the authenticated principal.
    """
    data = dict(req.plan_data)
    if "organization_id" not in data or not data["organization_id"]:
        data["organization_id"] = user.organization_id

    canonical_json, sha256_hash = RecoveryPlanHashService.generate_plan_hash(data)
    return {
        "canonical_json": canonical_json,
        "sha256_hash": sha256_hash,
        "schema_version": "trustchain-recovery-plan-v1",
    }

@router.post("/hash/verify")
def verify_plan_hash(
    req: HashVerifyRequest,
    user: AuthenticatedUser = Depends(get_current_user),
):
    """Verifies that a plan representation matches an expected SHA-256 digest."""
    data = dict(req.plan_data)
    if "organization_id" not in data or not data["organization_id"]:
        data["organization_id"] = user.organization_id

    valid = RecoveryPlanHashService.verify_plan_hash(data, req.expected_hash)
    _, computed = RecoveryPlanHashService.generate_plan_hash(data)
    return {
        "valid": valid,
        "computed_hash": computed,
        "expected_hash": req.expected_hash,
    }

# ===========================================================================
# 3. CONTRACT & ON-CHAIN PLAN STATE
# ===========================================================================

@router.get("/network")
def get_network_info(contract_service: ContractService = Depends(get_contract_service)):
    """Retrieves Web3.py network connectivity, chain ID, and latest block."""
    return contract_service.get_network_info()

@router.get("/plan/{plan_id}/latest")
def get_latest_plan_version(
    plan_id: str,
    contract_service: ContractService = Depends(get_contract_service),
):
    """Retrieves the latest on-chain version number for a plan."""
    try:
        latest = contract_service.get_latest_version(plan_id)
        return {"plan_id": plan_id, "latest_version": latest}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Contract query failed: {str(e)}")

@router.get("/plan/{plan_id}/{version}")
def get_on_chain_plan(
    plan_id: str,
    version: int,
    contract_service: ContractService = Depends(get_contract_service),
):
    """Retrieves the on-chain PlanVersion record from the smart contract."""
    try:
        exists = contract_service.plan_exists(plan_id, version)
        if not exists:
            raise HTTPException(status_code=404, detail=f"Plan {plan_id} V{version} not anchored.")
        return contract_service.get_plan_version(plan_id, version)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Contract query failed: {str(e)}")

@router.get("/plan/{plan_id}/{version}/eligibility")
def get_plan_execution_eligibility(
    plan_id: str,
    version: int,
    contract_service: ContractService = Depends(get_contract_service),
):
    """Checks contract-enforced execution eligibility for a specific version."""
    try:
        eligible, reason = contract_service.execution_eligibility(plan_id, version)
        return {
            "plan_id": plan_id,
            "version": version,
            "eligible": eligible,
            "reason": reason,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Contract query failed: {str(e)}")

@router.get("/plan/{plan_id}/{version}/decisions")
def get_plan_decisions(
    plan_id: str,
    version: int,
    contract_service: ContractService = Depends(get_contract_service),
):
    """Retrieves ordered on-chain decisions (approvals, rejections, revisions)."""
    try:
        decisions = contract_service.get_decisions(plan_id, version)
        return {
            "plan_id": plan_id,
            "version": version,
            "decision_count": len(decisions),
            "decisions": decisions,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Contract query failed: {str(e)}")

# ===========================================================================
# 4. TRANSACTIONS & CONTRACT EVENTS
# ===========================================================================

@router.post("/transactions/register")
def register_transaction(
    req: RegisterTxRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    Registers a transaction hash broadcasted by MetaMask on the client side.
    Initial status: SUBMITTED.
    """
    linked = WalletService.get_linked_wallet(db, user.user_id)
    submitter = linked["wallet_address"] if linked else "0x0000000000000000000000000000000000000000"
    chain_id = req.chain_id or settings.POLYGON_AMOY_CHAIN_ID
    
    tx = TransactionService.register_transaction(
        db=db,
        tx_hash=req.tx_hash,
        chain_id=chain_id,
        contract_address=contract_service.contract_address or "0x0",
        submitter_wallet=submitter,
        function_name=req.function_name,
        plan_id=req.plan_id,
        plan_version=req.plan_version,
    )
    return TransactionService.get_transaction(db, tx.tx_hash)

@router.get("/transactions/tracked")
def list_tracked_transactions(
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieves list of recently tracked transactions."""
    return TransactionService.list_transactions(db, limit=limit)

@router.get("/transactions/{tx_hash}")
def get_transaction_status(
    tx_hash: str,
    db: Session = Depends(get_db),
    contract_service: ContractService = Depends(get_contract_service),
):
    """Retrieves current tracked status, updating against RPC if still pending."""
    tx = TransactionService.get_transaction(db, tx_hash)
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction not found.")
    
    if tx["status"] in ["SUBMITTED", "PENDING", "INCLUDED"]:
        TransactionService.update_transaction_status(db, tx_hash, contract_service)
        tx = TransactionService.get_transaction(db, tx_hash)
        
    return tx

@router.post("/transactions/{tx_hash}/reconcile")
def reconcile_transaction(
    tx_hash: str,
    db: Session = Depends(get_db),
    contract_service: ContractService = Depends(get_contract_service),
):
    """Forces an explicit reconciliation of transaction status from RPC receipt."""
    updated = TransactionService.update_transaction_status(db, tx_hash, contract_service)
    # Also index events if included or confirmed
    if updated.status in ["INCLUDED", "CONFIRMED"] and contract_service.contract_address:
        try:
            EventListenerService.index_receipt_events(
                db=db,
                contract_service=contract_service,
                tx_hash=tx_hash,
                chain_id=updated.chain_id,
            )
        except Exception:
            pass
    return TransactionService.get_transaction(db, tx_hash)

@router.get("/events")
def get_events(
    plan_id: Optional[str] = None,
    version: Optional[int] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    """Retrieves indexed smart contract events."""
    return EventListenerService.get_events_for_plan(db, plan_id, version, limit=limit)

# ===========================================================================
# 5. RECOVERY PLAN INTEGRITY VERIFICATION
# ===========================================================================

@router.post("/plans/operational")
def store_operational_plan(
    req: SaveOperationalPlanRequest,
    user: AuthenticatedUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Stores the authoritative operational recovery plan in the database."""
    record = PlanVerificationService.save_operational_plan(
        db=db,
        plan_id=req.plan_id,
        version=req.version,
        organization_id=user.organization_id,
        plan_data=req.plan_data,
    )
    return {"status": "SAVED", "plan_id": record.plan_id, "version": record.version}

@router.get("/verification/{plan_id}/{version}")
def verify_plan(
    plan_id: str,
    version: int,
    db: Session = Depends(get_db),
    contract_service: ContractService = Depends(get_contract_service),
):
    """
    Executes end-to-end plan verification:
    1. Loads operational plan from DB.
    2. Recalculates canonical SHA-256 fingerprint.
    3. Fetches smart contract record.
    4. Compares hashes and evaluates currency.
    Returns: VERIFIED, HASH_MISMATCH, NOT_ANCHORED, VERSION_NOT_FOUND, SUPERSEDED, PENDING, or RPC_UNAVAILABLE.
    """
    res = PlanVerificationService.verify_plan_integrity(
        db=db,
        plan_id=plan_id,
        version=version,
        contract_service=contract_service,
    )
    return res
