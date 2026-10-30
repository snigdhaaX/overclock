import json
import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy.orm import Session
from .database import BlockchainEvent
from .contract_service import ContractService

class EventListenerService:
    """
    Indexes actual events emitted by TrustChainGovernance.sol.
    Enforces idempotency using unique key (chain_id, tx_hash, log_index).
    """

    @staticmethod
    def decode_plan_id(plan_id_bytes: Any) -> str:
        """Decodes bytes32 plan identifier to readable string if ASCII, else hex."""
        if isinstance(plan_id_bytes, (bytes, bytearray)):
            try:
                # Strip null bytes
                s = plan_id_bytes.rstrip(b"\x00").decode("utf-8")
                if s.isprintable() and len(s) > 0:
                    return s
            except Exception:
                pass
            return "0x" + plan_id_bytes.hex()
        elif isinstance(plan_id_bytes, str):
            return plan_id_bytes
        return str(plan_id_bytes)

    @classmethod
    def index_receipt_events(
        cls,
        db: Session,
        contract_service: ContractService,
        tx_hash: str,
        chain_id: int,
    ) -> List[Dict[str, Any]]:
        """Parses all contract event logs from a transaction receipt and persists them idempotently."""
        receipt = contract_service.get_transaction_receipt(tx_hash)
        if not receipt:
            return []

        contract = contract_service._get_contract()
        indexed_events = []

        # Process each log through web3 contract event decoders
        target_events = [
            contract.events.WalletRegistered,
            contract.events.WalletCategoriesUpdated,
            contract.events.WalletRevoked,
            contract.events.PlanAnchored,
            contract.events.PlanActionsDeclared,
            contract.events.PlanSuperseded,
            contract.events.PlanApproved,
            contract.events.PlanRejected,
            contract.events.PlanRevisionRequested,
            contract.events.PlanFinalized,
            contract.events.ExecutionAnchored,
        ]

        for evt_parser in target_events:
            try:
                processed_logs = evt_parser().process_receipt(receipt)
            except Exception:
                continue

            for log in processed_logs:
                event_name = log.event
                log_index = log.logIndex
                block_number = log.blockNumber
                args = dict(log.args)

                # Extract standard fields
                plan_id = None
                plan_version = None
                wallet_address = None

                if "planId" in args:
                    plan_id = cls.decode_plan_id(args["planId"])
                if "version" in args:
                    plan_version = int(args["version"])
                if "wallet" in args:
                    wallet_address = str(args["wallet"])
                elif "creator" in args:
                    wallet_address = str(args["creator"])
                elif "approver" in args:
                    wallet_address = str(args["approver"])
                elif "rejector" in args:
                    wallet_address = str(args["rejector"])
                elif "requester" in args:
                    wallet_address = str(args["requester"])
                elif "executor" in args:
                    wallet_address = str(args["executor"])

                # Serialize args to JSON (converting bytes to hex)
                serializable_args = {}
                for k, v in args.items():
                    if isinstance(v, (bytes, bytearray)):
                        serializable_args[k] = "0x" + v.hex()
                    else:
                        serializable_args[k] = v

                # Check if already indexed (idempotency)
                existing = (
                    db.query(BlockchainEvent)
                    .filter(
                        BlockchainEvent.chain_id == chain_id,
                        BlockchainEvent.tx_hash == tx_hash.lower(),
                        BlockchainEvent.log_index == log_index,
                    )
                    .first()
                )

                if not existing:
                    evt_record = BlockchainEvent(
                        chain_id=chain_id,
                        tx_hash=tx_hash.lower(),
                        log_index=log_index,
                        event_name=event_name,
                        contract_address=contract_service.contract_address.lower(),
                        plan_id=plan_id,
                        plan_version=plan_version,
                        wallet_address=wallet_address.lower() if wallet_address else None,
                        event_data_json=json.dumps(serializable_args),
                        block_number=block_number,
                        indexed_at=datetime.datetime.utcnow(),
                    )
                    db.add(evt_record)
                    db.commit()
                    db.refresh(evt_record)

                indexed_events.append({
                    "event_name": event_name,
                    "log_index": log_index,
                    "plan_id": plan_id,
                    "version": plan_version,
                    "wallet_address": wallet_address,
                    "args": serializable_args,
                })

        return indexed_events

    @classmethod
    def get_events_for_plan(
        cls,
        db: Session,
        plan_id: Optional[str] = None,
        version: Optional[int] = None,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        query = db.query(BlockchainEvent)
        if plan_id is not None:
            query = query.filter(BlockchainEvent.plan_id == plan_id)
        if version is not None:
            query = query.filter(BlockchainEvent.plan_version == version)
        records = query.order_by(BlockchainEvent.block_number.desc(), BlockchainEvent.log_index.desc()).limit(limit).all()

        return [
            {
                "tx_hash": r.tx_hash,
                "event_name": r.event_name,
                "log_index": r.log_index,
                "plan_id": r.plan_id,
                "plan_version": r.plan_version,
                "wallet_address": r.wallet_address,
                "block_number": r.block_number,
                "indexed_at": r.indexed_at.strftime("%Y-%m-%dT%H:%M:%SZ"),
                "event_data": json.loads(r.event_data_json),
            }
            for r in records
        ]
