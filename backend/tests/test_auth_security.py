import datetime
from eth_account import Account
from eth_account.messages import encode_defunct
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.blockchain.database import SessionLocal, UserWallet, WalletNonce, WalletSession
from backend.app.blockchain.wallet_service import WalletService

client = TestClient(app)

def test_wallet_spoofing_rejected_without_session():
    """
    Requirement 10: Prove that simply spoofing another user's wallet address
    via an HTTP header cannot access their organisation's records.
    """
    db = SessionLocal()
    # Find an active registered wallet
    wallet = db.query(UserWallet).filter(UserWallet.active == True).first()
    db.close()
    assert wallet is not None

    # Attacker tries to pass the victim's wallet address without a cryptographic session token
    response = client.get(
        "/api/v1/disruptions/active",
        headers={"X-Wallet-Address": wallet.wallet_address},
    )
    assert response.status_code == 401
    assert "cryptographic session token" in response.json()["detail"].lower()


def test_full_cryptographic_nonce_session_flow():
    """
    Requirement 10: EIP-191 signature verification must be bound to a server-generated,
    single-use nonce, issuing an authenticated session token.
    """
    db = SessionLocal()
    # Generate local keypair
    acc = Account.create()
    test_user_id = f"test-sec-user-{acc.address[:8]}"
    test_org_id = "ORG-APEX-GLOBAL"

    # Step 1: Request single-use nonce
    nonce_res = client.post(
        "/blockchain/wallet/nonce",
        headers={"X-User-Id": test_user_id, "X-Organization-Id": test_org_id},
    )
    assert nonce_res.status_code == 200
    nonce_data = nonce_res.json()
    nonce = nonce_data["nonce"]
    message = nonce_data["message"]

    # Step 2: Sign message using private key (EIP-191 personal_sign)
    signable = encode_defunct(text=message)
    signed = acc.sign_message(signable)
    signature = signed.signature.hex()
    if not signature.startswith("0x"):
        signature = f"0x{signature}"

    # Step 3: Verify signature and receive session token
    verify_res = client.post(
        "/blockchain/wallet/verify",
        headers={"X-User-Id": test_user_id, "X-Organization-Id": test_org_id},
        json={
            "wallet_address": acc.address,
            "nonce": nonce,
            "signature": signature,
        },
    )
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert "session_token" in verify_data
    session_token = verify_data["session_token"]

    # Step 4: Replay attack prevention - reusing the same nonce must fail
    replay_res = client.post(
        "/blockchain/wallet/verify",
        headers={"X-User-Id": test_user_id, "X-Organization-Id": test_org_id},
        json={
            "wallet_address": acc.address,
            "nonce": nonce,
            "signature": signature,
        },
    )
    assert replay_res.status_code == 400
    assert "consumed" in replay_res.json()["detail"].lower()

    # Step 5: Authenticated request using Bearer session token succeeds
    auth_res = client.get(
        "/api/v1/disruptions/active",
        headers={"Authorization": f"Bearer {session_token}"},
    )
    assert auth_res.status_code == 200

    # Step 6: Cross-tenant attack - passing another organization header with valid session is rejected
    cross_org_res = client.get(
        "/api/v1/disruptions/active",
        headers={
            "Authorization": f"Bearer {session_token}",
            "X-Organization-Id": "ORG-COMPETITOR-X",
        },
    )
    assert cross_org_res.status_code == 403
    assert "cross-tenant" in cross_org_res.json()["detail"].lower()

    # Step 7: Wallet mismatch attack - claiming a different wallet with this session is rejected
    mismatch_res = client.get(
        "/api/v1/disruptions/active",
        headers={
            "Authorization": f"Bearer {session_token}",
            "X-Wallet-Address": "0x000000000000000000000000000000000000dEaD",
        },
    )
    assert mismatch_res.status_code == 403
    assert "does not match" in mismatch_res.json()["detail"].lower()

    # Step 8: Expired or invalidated session is rejected
    import hashlib
    t_hash = hashlib.sha256(session_token.encode("utf-8")).hexdigest()
    db_session = db.query(WalletSession).filter(
        (WalletSession.token_hash == t_hash) | (WalletSession.session_token == session_token)
    ).first()
    db_session.expires_at = datetime.datetime.utcnow() - datetime.timedelta(seconds=10)
    db.commit()

    expired_res = client.get(
        "/api/v1/disruptions/active",
        headers={"Authorization": f"Bearer {session_token}"},
    )
    assert expired_res.status_code == 401
    assert "expired" in expired_res.json()["detail"].lower()
    db.close()
