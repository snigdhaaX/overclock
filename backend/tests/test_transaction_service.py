import pytest
from unittest.mock import MagicMock
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.blockchain.database import Base, BlockchainTransaction, BlockchainEvent
from backend.app.blockchain.transaction_service import TransactionService
from backend.app.blockchain.event_listener import EventListenerService

@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()

def test_transaction_registration(db_session):
    """Registering a transaction creates a SUBMITTED record."""
    tx_hash = "0x" + "a" * 64
    tx = TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
        function_name="anchorPlan",
        plan_id="RCP-1001",
        plan_version=1,
    )
    assert tx.tx_hash == tx_hash.lower()
    assert tx.status == "SUBMITTED"
    assert tx.confirmations == 0

def test_pending_transaction_not_confirmed(db_session):
    """When RPC returns no receipt, transaction is marked PENDING and never confirmed."""
    tx_hash = "0x" + "b" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    # Mock contract service returning None for receipt
    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.return_value = None

    updated = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract)
    assert updated.status == "PENDING"
    assert updated.confirmations == 0
    assert updated.receipt_status is None

def test_successful_receipt_is_confirmed(db_session):
    """When receipt status is 1 and confirmations >= target, status becomes CONFIRMED."""
    tx_hash = "0x" + "c" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 100,
        "status": 1,
        "gasUsed": 150000,
    }
    mock_contract.get_block_number.return_value = 102  # 102 - 100 + 1 = 3 confirmations

    updated = TransactionService.update_transaction_status(
        db_session, tx_hash, mock_contract, required_confirmations=2
    )
    assert updated.status == "CONFIRMED"
    assert updated.confirmations == 3
    assert updated.receipt_status == 1
    assert updated.confirmed_at is not None

def test_reverted_receipt_marked_failed(db_session):
    """A receipt with status 0 marks the transaction FAILED."""
    tx_hash = "0x" + "d" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 105,
        "status": 0,  # Reverted
        "gasUsed": 50000,
    }

    updated = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract)
    assert updated.status == "FAILED"
    assert updated.receipt_status == 0
    assert "reverted" in updated.error_message.lower()

def test_rpc_outage_handled_gracefully(db_session):
    """Temporary RPC outage does not mark the transaction as failed; preserves current status."""
    tx_hash = "0x" + "e" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.side_effect = RuntimeError("RPC timeout")

    updated = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract)
    assert updated.status == "SUBMITTED"  # Kept intact
    assert "RPC transient query error" in updated.error_message

def test_restart_reconciliation(db_session):
    """Reconciling unconfirmed transactions updates pending items from receipts."""
    tx_hash1 = "0x" + "1" * 64
    tx_hash2 = "0x" + "2" * 64

    TransactionService.register_transaction(db_session, tx_hash1, 80002, "0x0", "0x0")
    TransactionService.register_transaction(db_session, tx_hash2, 80002, "0x0", "0x0")

    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.side_effect = lambda h: (
        {"blockNumber": 200, "status": 1, "gasUsed": 100000} if h == tx_hash1 else None
    )
    mock_contract.get_block_number.return_value = 205

    reconciled = TransactionService.reconcile_unconfirmed_transactions(db_session, mock_contract)
    assert len(reconciled) == 2
    
    tx1 = TransactionService.get_transaction(db_session, tx_hash1)
    tx2 = TransactionService.get_transaction(db_session, tx_hash2)
    assert tx1["status"] == "CONFIRMED"
    assert tx2["status"] == "PENDING"

def test_transaction_confirming_state(db_session):
    """When confirmations are greater than 1 but less than target threshold, status is CONFIRMING."""
    tx_hash = "0x" + "f" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 100,
        "status": 1,
        "gasUsed": 50000,
    }
    mock_contract.get_block_number.return_value = 104  # 104 - 100 + 1 = 5 confirmations

    # Require 16 confirmations (Amoy production security threshold)
    updated = TransactionService.update_transaction_status(
        db_session, tx_hash, mock_contract, required_confirmations=16
    )
    assert updated.status == "CONFIRMING"
    assert updated.confirmations == 5
    assert updated.receipt_status == 1

def test_transaction_reorged_when_receipt_disappears(db_session):
    """When an included transaction disappears on subsequent poll due to a reorg, mark REORGED."""
    tx_hash = "0x" + "8" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    # 1. First poll: transaction is included at block 300
    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 300,
        "status": 1,
        "gasUsed": 60000,
    }
    mock_contract.get_block_number.return_value = 300  # 1 confirmation
    tx = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract, required_confirmations=5)
    assert tx.status == "INCLUDED"
    assert tx.block_number == 300

    # 2. Second poll: chain reorg occurs; receipt disappears
    mock_contract.get_transaction_receipt.return_value = None
    tx_reorg = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract)
    assert tx_reorg.status == "REORGED"
    assert "disappeared" in tx_reorg.error_message.lower()

def test_transaction_reorged_when_block_number_changes(db_session):
    """When recorded block differs from new receipt block, mark REORGED."""
    tx_hash = "0x" + "9" * 64
    TransactionService.register_transaction(
        db=db_session,
        tx_hash=tx_hash,
        chain_id=80002,
        contract_address="0x1234567890123456789012345678901234567890",
        submitter_wallet="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    # 1. Included at block 400
    mock_contract = MagicMock()
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 400,
        "status": 1,
        "gasUsed": 60000,
    }
    mock_contract.get_block_number.return_value = 400
    tx = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract, required_confirmations=5)
    assert tx.block_number == 400

    # 2. Re-mined into a different block 403 due to reorg
    mock_contract.get_transaction_receipt.return_value = {
        "blockNumber": 403,
        "status": 1,
        "gasUsed": 60000,
    }
    tx_reorg = TransactionService.update_transaction_status(db_session, tx_hash, mock_contract)
    assert tx_reorg.status == "REORGED"
    assert "reorg detected" in tx_reorg.error_message.lower()
