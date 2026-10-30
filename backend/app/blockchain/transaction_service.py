import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from .config import settings
from .database import BlockchainTransaction
from .contract_service import ContractService

class TransactionService:
    """
    Persistent transaction tracker tracking statuses:
    CREATED, PENDING, SUBMITTED, INCLUDED, CONFIRMED, FAILED, REORG_REVIEW.
    Never marks confirmed without validating receipt and required confirmations.
    """

    @classmethod
    def register_transaction(
        cls,
        db: Session,
        tx_hash: str,
        chain_id: int,
        contract_address: str,
        submitter_wallet: str,
        function_name: Optional[str] = None,
        plan_id: Optional[str] = None,
        plan_version: Optional[int] = None,
    ) -> BlockchainTransaction:
        """Register a transaction submitted by MetaMask."""
        normalized_hash = tx_hash.strip().lower()
        if not normalized_hash.startswith("0x"):
            normalized_hash = "0x" + normalized_hash

        tx = db.query(BlockchainTransaction).filter(BlockchainTransaction.tx_hash == normalized_hash).first()
        if not tx:
            tx = BlockchainTransaction(
                tx_hash=normalized_hash,
                chain_id=chain_id,
                contract_address=contract_address.lower(),
                submitter_wallet=submitter_wallet.lower(),
                function_name=function_name,
                plan_id=plan_id,
                plan_version=plan_version,
                status="SUBMITTED",
                confirmations=0,
                created_at=datetime.datetime.utcnow(),
            )
            db.add(tx)
            db.commit()
            db.refresh(tx)
        return tx

    @classmethod
    def update_transaction_status(
        cls,
        db: Session,
        tx_hash: str,
        contract_service: ContractService,
        required_confirmations: Optional[int] = None,
    ) -> BlockchainTransaction:
        """
        Polls RPC receipt, verifies inclusion, checks receipt status,
        counts confirmations, and updates database status atomically.
        """
        normalized_hash = tx_hash.strip().lower()
        if not normalized_hash.startswith("0x"):
            normalized_hash = "0x" + normalized_hash

        tx = db.query(BlockchainTransaction).filter(BlockchainTransaction.tx_hash == normalized_hash).first()
        if not tx:
            raise ValueError(f"Transaction {normalized_hash} is not registered.")

        target_confirmations = required_confirmations or settings.CONFIRMATION_BLOCKS

        try:
            receipt = contract_service.get_transaction_receipt(normalized_hash)
        except Exception as e:
            # Temporary RPC error — do not fail transaction immediately
            tx.error_message = f"RPC transient query error: {str(e)}"
            db.commit()
            db.refresh(tx)
            return tx

        if receipt is None:
            # Transaction is still pending or dropped
            if tx.status not in ["FAILED", "CONFIRMED"]:
                tx.status = "PENDING"
            db.commit()
            db.refresh(tx)
            return tx

        # Transaction has a receipt
        tx_block = receipt.get("blockNumber")
        receipt_status = receipt.get("status")  # 1 for success, 0 for revert
        gas_used = receipt.get("gasUsed")

        # Detect potential reorg if blockNumber changed unexpectedly
        if tx.block_number and tx.block_number != tx_block:
            tx.status = "REORG_REVIEW"
            tx.error_message = f"Reorg detected: recorded block {tx.block_number} differs from receipt block {tx_block}."
            db.commit()
            db.refresh(tx)
            return tx

        tx.block_number = tx_block
        tx.receipt_status = receipt_status
        tx.gas_used = gas_used

        if receipt_status == 0:
            tx.status = "FAILED"
            tx.error_message = "Transaction execution reverted on-chain."
            db.commit()
            db.refresh(tx)
            return tx

        # Compute current confirmations
        try:
            latest_block = contract_service.get_block_number()
            conf_count = max(0, latest_block - tx_block + 1)
        except Exception:
            conf_count = 1

        tx.confirmations = conf_count

        if conf_count >= target_confirmations:
            tx.status = "CONFIRMED"
            if not tx.confirmed_at:
                tx.confirmed_at = datetime.datetime.utcnow()
            tx.error_message = None
        else:
            tx.status = "INCLUDED"

        db.commit()
        db.refresh(tx)
        return tx

    @classmethod
    def reconcile_unconfirmed_transactions(
        cls,
        db: Session,
        contract_service: ContractService,
    ) -> List[BlockchainTransaction]:
        """Reconciliation routine after backend restart to reconcile SUBMITTED/PENDING/INCLUDED txs."""
        unconfirmed = (
            db.query(BlockchainTransaction)
            .filter(BlockchainTransaction.status.in_(["SUBMITTED", "PENDING", "INCLUDED"]))
            .all()
        )
        reconciled = []
        for tx in unconfirmed:
            try:
                updated = cls.update_transaction_status(db, tx.tx_hash, contract_service)
                reconciled.append(updated)
            except Exception:
                continue
        return reconciled

    @classmethod
    def get_transaction(cls, db: Session, tx_hash: str) -> Optional[Dict[str, Any]]:
        normalized_hash = tx_hash.strip().lower()
        if not normalized_hash.startswith("0x"):
            normalized_hash = "0x" + normalized_hash
        tx = db.query(BlockchainTransaction).filter(BlockchainTransaction.tx_hash == normalized_hash).first()
        if not tx:
            return None
        return {
            "tx_hash": tx.tx_hash,
            "chain_id": tx.chain_id,
            "contract_address": tx.contract_address,
            "function_name": tx.function_name,
            "plan_id": tx.plan_id,
            "plan_version": tx.plan_version,
            "submitter_wallet": tx.submitter_wallet,
            "block_number": tx.block_number,
            "gas_used": tx.gas_used,
            "status": tx.status,
            "receipt_status": tx.receipt_status,
            "confirmations": tx.confirmations,
            "created_at": tx.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if tx.created_at else None,
            "confirmed_at": tx.confirmed_at.strftime("%Y-%m-%dT%H:%M:%SZ") if tx.confirmed_at else None,
            "error_message": tx.error_message,
        }

    @classmethod
    def list_transactions(cls, db: Session, limit: int = 50) -> List[Dict[str, Any]]:
        """List recently tracked transactions ordered by creation date."""
        records = db.query(BlockchainTransaction).order_by(BlockchainTransaction.created_at.desc()).limit(limit).all()
        return [
            {
                "tx_hash": tx.tx_hash,
                "chain_id": tx.chain_id,
                "contract_address": tx.contract_address,
                "function_name": tx.function_name,
                "plan_id": tx.plan_id,
                "plan_version": tx.plan_version,
                "submitter_wallet": tx.submitter_wallet,
                "block_number": tx.block_number,
                "gas_used": tx.gas_used,
                "status": tx.status,
                "receipt_status": tx.receipt_status,
                "confirmations": tx.confirmations,
                "created_at": tx.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if tx.created_at else None,
                "confirmed_at": tx.confirmed_at.strftime("%Y-%m-%dT%H:%M:%SZ") if tx.confirmed_at else None,
                "error_message": tx.error_message,
            }
            for tx in records
        ]
