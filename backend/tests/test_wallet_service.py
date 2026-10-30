import datetime
import pytest
from eth_account import Account
from eth_account.messages import encode_defunct
from sqlalchemy.pool import StaticPool
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.blockchain.database import Base, WalletNonce, UserWallet
from backend.app.blockchain.database import create_all_tables, drop_all_tables
from backend.app.blockchain.wallet_service import (
    WalletService,
    NonceExpiredError,
    NonceConsumedError,
    NonceNotFoundError,
    SignatureMismatchError,
    WalletVerificationError,
)

@pytest.fixture
def db_session():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    create_all_tables(engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()

def test_valid_signature_succeeds(db_session):
    """A valid EIP-191 signature over the domain message correctly links the wallet."""
    user_id = "user:analyst-101"
    org_id = "org:acme-logistics"
    acct = Account.create()

    # 1. Generate nonce
    nonce_data = WalletService.create_nonce(db_session, user_id, org_id)
    message_text = nonce_data["message"]
    nonce = nonce_data["nonce"]

    # 2. Sign using eth-account (mimics MetaMask personal_sign)
    signable = encode_defunct(text=message_text)
    sig = acct.sign_message(signable)

    # 3. Verify and link
    res = WalletService.verify_and_link_wallet(
        db=db_session,
        user_id=user_id,
        organization_id=org_id,
        wallet_address=acct.address,
        nonce=nonce,
        signature=sig.signature.hex(),
    )
    assert res["status"] == "LINKED"
    assert res["wallet_address"].lower() == acct.address.lower()

    # 4. Check linked wallet query
    linked = WalletService.get_linked_wallet(db_session, user_id)
    assert linked is not None
    assert linked["wallet_address"].lower() == acct.address.lower()

def test_incorrect_signature_fails(db_session):
    """Signing with a different wallet than the claimed address fails with SignatureMismatchError."""
    user_id = "user:analyst-101"
    org_id = "org:acme-logistics"
    acct1 = Account.create()
    acct2 = Account.create()  # Impersonator

    nonce_data = WalletService.create_nonce(db_session, user_id, org_id)
    message_text = nonce_data["message"]
    nonce = nonce_data["nonce"]

    # Signed by acct2, but claimed to be acct1
    sig = acct2.sign_message(encode_defunct(text=message_text))

    with pytest.raises(SignatureMismatchError):
        WalletService.verify_and_link_wallet(
            db=db_session,
            user_id=user_id,
            organization_id=org_id,
            wallet_address=acct1.address,  # Claiming acct1
            nonce=nonce,
            signature=sig.signature.hex(),
        )

def test_expired_nonce_fails(db_session):
    """Nonces past their expiration cannot be used to link a wallet."""
    user_id = "user:analyst-101"
    org_id = "org:acme-logistics"
    acct = Account.create()

    # Create nonce with negative expiry (already expired)
    now = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)
    nonce_record = WalletNonce(
        nonce="expired-test-nonce-12345",
        user_id=user_id,
        organization_id=org_id,
        issued_at=now - datetime.timedelta(seconds=300),
        expires_at=now,
        consumed=False,
    )
    db_session.add(nonce_record)
    db_session.commit()

    msg = WalletService.generate_message(
        user_id=user_id,
        organization_id=org_id,
        nonce=nonce_record.nonce,
        issued_at=nonce_record.issued_at,
        expires_at=nonce_record.expires_at,
    )
    sig = acct.sign_message(encode_defunct(text=msg))

    with pytest.raises(NonceExpiredError):
        WalletService.verify_and_link_wallet(
            db=db_session,
            user_id=user_id,
            organization_id=org_id,
            wallet_address=acct.address,
            nonce=nonce_record.nonce,
            signature=sig.signature.hex(),
        )

def test_reused_nonce_fails_replay_protection(db_session):
    """A nonce consumed once cannot be replayed for subsequent requests."""
    user_id = "user:analyst-101"
    org_id = "org:acme-logistics"
    acct = Account.create()

    nonce_data = WalletService.create_nonce(db_session, user_id, org_id)
    message_text = nonce_data["message"]
    nonce = nonce_data["nonce"]
    sig = acct.sign_message(encode_defunct(text=message_text))

    # First attempt succeeds
    WalletService.verify_and_link_wallet(
        db=db_session,
        user_id=user_id,
        organization_id=org_id,
        wallet_address=acct.address,
        nonce=nonce,
        signature=sig.signature.hex(),
    )

    # Second attempt with same nonce fails
    with pytest.raises(NonceConsumedError):
        WalletService.verify_and_link_wallet(
            db=db_session,
            user_id=user_id,
            organization_id=org_id,
            wallet_address=acct.address,
            nonce=nonce,
            signature=sig.signature.hex(),
        )

def test_cross_user_nonce_fails(db_session):
    """A nonce issued to User A cannot be used by User B."""
    user_a = "user:analyst-101"
    user_b = "user:analyst-102"
    org_id = "org:acme-logistics"
    acct = Account.create()

    nonce_data = WalletService.create_nonce(db_session, user_a, org_id)
    nonce = nonce_data["nonce"]
    sig = acct.sign_message(encode_defunct(text=nonce_data["message"]))

    with pytest.raises(WalletVerificationError):
        WalletService.verify_and_link_wallet(
            db=db_session,
            user_id=user_b,  # User B attempting to consume User A's nonce
            organization_id=org_id,
            wallet_address=acct.address,
            nonce=nonce,
            signature=sig.signature.hex(),
        )

def test_unlinking_wallet(db_session):
    """Controlled unlinking sets wallet inactive."""
    user_id = "user:analyst-101"
    org_id = "org:acme-logistics"
    acct = Account.create()

    nonce_data = WalletService.create_nonce(db_session, user_id, org_id)
    sig = acct.sign_message(encode_defunct(text=nonce_data["message"]))
    WalletService.verify_and_link_wallet(
        db_session, user_id, org_id, acct.address, nonce_data["nonce"], sig.signature.hex()
    )

    # Unlink
    assert WalletService.unlink_wallet(db_session, user_id, acct.address) is True
    # Linked wallet query should now return None
    assert WalletService.get_linked_wallet(db_session, user_id) is None
