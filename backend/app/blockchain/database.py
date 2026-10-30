import datetime
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import declarative_base, sessionmaker, scoped_session
from .config import settings

Base = declarative_base()

class UserWallet(Base):
    __tablename__ = "user_wallets"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(String(128), nullable=False, index=True)
    organization_id = Column(String(128), nullable=False, index=True)
    wallet_address = Column(String(42), nullable=False, index=True)
    linked_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    active = Column(Boolean, default=True, nullable=False)
    
    __table_args__ = (
        UniqueConstraint("user_id", "wallet_address", name="uq_user_wallet"),
    )

class WalletNonce(Base):
    __tablename__ = "wallet_nonces"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    nonce = Column(String(64), nullable=False, unique=True, index=True)
    user_id = Column(String(128), nullable=False)
    organization_id = Column(String(128), nullable=False)
    issued_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    consumed = Column(Boolean, default=False, nullable=False)

class BlockchainTransaction(Base):
    __tablename__ = "blockchain_transactions"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    tx_hash = Column(String(66), nullable=False, unique=True, index=True)
    chain_id = Column(Integer, nullable=False)
    contract_address = Column(String(42), nullable=False)
    function_name = Column(String(64), nullable=True)
    plan_id = Column(String(64), nullable=True, index=True)
    plan_version = Column(Integer, nullable=True)
    submitter_wallet = Column(String(42), nullable=False, index=True)
    block_number = Column(Integer, nullable=True)
    gas_used = Column(Integer, nullable=True)
    # Statuses: CREATED, PENDING, SUBMITTED, INCLUDED, CONFIRMED, FAILED, REORG_REVIEW
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)
    receipt_status = Column(Integer, nullable=True)  # 1 = success, 0 = reverted
    confirmations = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    confirmed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)

class BlockchainEvent(Base):
    __tablename__ = "blockchain_events"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    chain_id = Column(Integer, nullable=False)
    tx_hash = Column(String(66), nullable=False, index=True)
    log_index = Column(Integer, nullable=False)
    event_name = Column(String(64), nullable=False, index=True)
    contract_address = Column(String(42), nullable=False)
    plan_id = Column(String(64), nullable=True, index=True)
    plan_version = Column(Integer, nullable=True)
    wallet_address = Column(String(42), nullable=True, index=True)
    event_data_json = Column(Text, nullable=False)
    block_number = Column(Integer, nullable=False)
    indexed_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    
    __table_args__ = (
        UniqueConstraint("chain_id", "tx_hash", "log_index", name="uq_chain_tx_log"),
    )

class OperationalRecoveryPlan(Base):
    """Authoritative local operational storage for recovery plans."""
    __tablename__ = "operational_plans"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    plan_id = Column(String(64), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    organization_id = Column(String(128), nullable=False, index=True)
    plan_data_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow, nullable=False)
    
    __table_args__ = (
        UniqueConstraint("plan_id", "version", name="uq_plan_version"),
    )

# Engine & Session creation
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {},
)

SessionLocal = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
