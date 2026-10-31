"""Every test run gets its own empty database, so tests can't touch real data or rely on leftovers."""
import os
import tempfile
from pathlib import Path

_TEST_DIR = tempfile.mkdtemp(prefix="trustchain-tests-")
# Set before the app is imported. load_dotenv doesn't override values that are already set.
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_TEST_DIR, 'test.db').as_posix()}"
os.environ["TRUSTCHAIN_ALLOW_HEADER_AUTH"] = "1"
os.environ["TRUSTCHAIN_WEBHOOK_SECRET"] = "demo-carrier-secret"
os.environ["TRUSTCHAIN_RISK_MODEL_DIR"] = str(Path(_TEST_DIR, "models"))
os.environ.pop("GEMINI_API_KEY", None)
os.environ["TRUSTCHAIN_KEY_ANALYST"] = ""
os.environ["TRUSTCHAIN_KEY_MANAGER"] = ""

from backend.app.blockchain.database import init_db  # noqa: E402
from backend.app import models as _all_tables  # noqa: E402,F401

init_db()

# Seeded data some suites read, so they don't depend on a developer's old local database.
from backend.app.blockchain.database import SessionLocal, UserWallet  # noqa: E402
from backend.app.supply_chain.seed_data import seed_supply_chain_data  # noqa: E402

_db = SessionLocal()
try:
    seed_supply_chain_data(_db, organization_id="ORG-APEX-GLOBAL")
    _db.add(UserWallet(user_id="user:seed-analyst", organization_id="ORG-APEX-GLOBAL", wallet_address="0x70997970c51812dc3a010c7d01b50e0d17dc79c8", active=True))
    _db.commit()
finally:
    _db.close()
