import json
import datetime
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from .database import OperationalRecoveryPlan
from .hash_service import RecoveryPlanHashService
from .contract_service import ContractService

class VerificationResult:
    VERIFIED = "VERIFIED"
    HASH_MISMATCH = "HASH_MISMATCH"
    NOT_ANCHORED = "NOT_ANCHORED"
    VERSION_NOT_FOUND = "VERSION_NOT_FOUND"
    SUPERSEDED = "SUPERSEDED"
    PENDING = "PENDING"
    RPC_UNAVAILABLE = "RPC_UNAVAILABLE"

class PlanVerificationService:
    """
    End-to-end recovery plan integrity verification service.
    Reconstructs canonical representation, recalculates SHA-256, compares against
    on-chain anchor, and evaluates historical and current status.
    """

    @classmethod
    def save_operational_plan(
        cls,
        db: Session,
        plan_id: str,
        version: int,
        organization_id: str,
        plan_data: Dict[str, Any],
    ) -> OperationalRecoveryPlan:
        """Stores or updates the authoritative operational plan record."""
        existing = (
            db.query(OperationalRecoveryPlan)
            .filter(
                OperationalRecoveryPlan.plan_id == plan_id,
                OperationalRecoveryPlan.version == version,
            )
            .first()
        )
        plan_json = json.dumps(plan_data)
        now = datetime.datetime.utcnow()
        if existing:
            existing.organization_id = organization_id
            existing.plan_data_json = plan_json
            existing.updated_at = now
            record = existing
        else:
            record = OperationalRecoveryPlan(
                plan_id=plan_id,
                version=version,
                organization_id=organization_id,
                plan_data_json=plan_json,
                created_at=now,
                updated_at=now,
            )
            db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @classmethod
    def get_operational_plan(
        cls,
        db: Session,
        plan_id: str,
        version: int,
    ) -> Optional[Dict[str, Any]]:
        record = (
            db.query(OperationalRecoveryPlan)
            .filter(
                OperationalRecoveryPlan.plan_id == plan_id,
                OperationalRecoveryPlan.version == version,
            )
            .first()
        )
        if not record:
            return None
        return json.loads(record.plan_data_json)

    @classmethod
    def verify_plan_integrity(
        cls,
        db: Session,
        plan_id: str,
        version: int,
        contract_service: ContractService,
        plan_data_override: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Executes complete verification workflow.
        Returns explicit status: VERIFIED, HASH_MISMATCH, NOT_ANCHORED,
        VERSION_NOT_FOUND, SUPERSEDED, PENDING, or RPC_UNAVAILABLE.
        """
        now_str = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")

        # 1. Retrieve operational plan
        plan_data = plan_data_override or cls.get_operational_plan(db, plan_id, version)
        if not plan_data:
            return {
                "result": VerificationResult.VERSION_NOT_FOUND,
                "plan_id": plan_id,
                "version": version,
                "details": "Operational plan not found in database.",
                "verification_timestamp": now_str,
            }

        # 2. Recalculate canonical hash
        canonical_json, db_hash = RecoveryPlanHashService.generate_plan_hash(plan_data)

        # 3. Query contract state
        if not contract_service.is_connected and not getattr(contract_service, "_mock_mode", False):
            return {
                "result": VerificationResult.RPC_UNAVAILABLE,
                "plan_id": plan_id,
                "version": version,
                "database_hash": db_hash,
                "details": "RPC connection unavailable. Cannot verify against blockchain.",
                "verification_timestamp": now_str,
            }

        try:
            exists = contract_service.plan_exists(plan_id, version)
            if not exists:
                return {
                    "result": VerificationResult.NOT_ANCHORED,
                    "plan_id": plan_id,
                    "version": version,
                    "database_hash": db_hash,
                    "on_chain_hash": None,
                    "hashes_match": False,
                    "details": "Plan version is not anchored on the blockchain.",
                    "verification_timestamp": now_str,
                }

            on_chain = contract_service.get_plan_version(plan_id, version)
            latest_version = contract_service.get_latest_version(plan_id)
            on_chain_hash = on_chain["plan_hash"]
            hashes_match = (db_hash.lower() == on_chain_hash.lower())
            is_current = (version == latest_version and on_chain["status"] != "SUPERSEDED")

            # 4. Compare hashes
            if not hashes_match:
                return {
                    "result": VerificationResult.HASH_MISMATCH,
                    "plan_id": plan_id,
                    "version": version,
                    "database_hash": db_hash,
                    "on_chain_hash": on_chain_hash,
                    "hashes_match": False,
                    "is_current_version": is_current,
                    "latest_on_chain_version": latest_version,
                    "on_chain_status": on_chain["status"],
                    "details": "Plan data has been altered. Database hash does not match anchored hash.",
                    "verification_timestamp": now_str,
                }

            # 5. Evaluate currency and status
            eligible, elig_reason = contract_service.execution_eligibility(plan_id, version)
            decisions = contract_service.get_decisions(plan_id, version)

            if not is_current or on_chain["status"] == "SUPERSEDED":
                result = VerificationResult.SUPERSEDED
                details = f"Plan integrity is verified, but this version has been superseded by V{latest_version}."
            elif on_chain["status"] == "PENDING_APPROVAL":
                result = VerificationResult.PENDING
                details = "Plan integrity is verified. Awaiting required approval stages."
            elif on_chain["status"] in ["APPROVED", "EXECUTED"]:
                result = VerificationResult.VERIFIED
                details = f"Plan integrity fully verified. Status: {on_chain['status']}."
            else:
                result = on_chain["status"]
                details = f"Plan integrity verified. Status: {on_chain['status']}."

            return {
                "result": result,
                "plan_id": plan_id,
                "version": version,
                "database_hash": db_hash,
                "on_chain_hash": on_chain_hash,
                "hashes_match": True,
                "is_current_version": is_current,
                "latest_on_chain_version": latest_version,
                "on_chain_status": on_chain["status"],
                "required_stages": on_chain["required_stages"],
                "completed_stages": on_chain["completed_stages"],
                "execution_eligible": eligible,
                "execution_eligibility_reason": elig_reason,
                "execution_evidence_hash": on_chain.get("execution_evidence_hash"),
                "decisions": decisions,
                "details": details,
                "verification_timestamp": now_str,
            }

        except Exception as e:
            return {
                "result": VerificationResult.RPC_UNAVAILABLE,
                "plan_id": plan_id,
                "version": version,
                "database_hash": db_hash,
                "details": f"Error communicating with smart contract: {str(e)}",
                "verification_timestamp": now_str,
            }
