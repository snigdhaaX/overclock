import datetime
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.main import app
from backend.app.blockchain.database import Base, get_db
from backend.app.blockchain.database import create_all_tables, drop_all_tables
from backend.app.supply_chain.models import (
    Supplier,
    PurchaseOrder,
    OrderItem,
    Shipment,
    ShipmentCheckpoint,
    Warehouse,
    InventoryItem,
    Disruption,
    DisruptionShipment,
)
from backend.app.supply_chain.seed_data import seed_supply_chain_data

client = TestClient(app)

# Use in-memory SQLite with StaticPool so all connections share the memory DB
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    app.dependency_overrides[get_db] = override_get_db
    create_all_tables(test_engine)
    db = TestingSessionLocal()
    seed_supply_chain_data(db, organization_id="ORG-APEX-GLOBAL")
    db.close()
    yield
    app.dependency_overrides.clear()
    drop_all_tables(test_engine)


# ------------------------------------------------------------------------------
# 1. Supplier Creation and Retrieval
# ------------------------------------------------------------------------------

def test_get_suppliers_default_org():
    response = client.get("/api/v1/supply-chain/suppliers", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 5
    assert len(data["items"]) >= 5
    supplier_codes = [s["supplier_code"] for s in data["items"]]
    assert "SUP-TAIWAN-FOUNDRY" in supplier_codes
    assert "SUP-NORDIC-FREIGHT" in supplier_codes


def test_get_supplier_by_id():
    response = client.get("/api/v1/supply-chain/suppliers?search=SUP-TAIWAN-FOUNDRY", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert response.status_code == 200
    supplier_id = response.json()["items"][0]["id"]

    detail_resp = client.get(f"/api/v1/supply-chain/suppliers/{supplier_id}", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert detail_resp.status_code == 200
    sup = detail_resp.json()
    assert sup["supplier_code"] == "SUP-TAIWAN-FOUNDRY"
    assert sup["country"] == "Taiwan"
    assert sup["reliability_score"] >= 0.9


def test_create_supplier():
    new_sup = {
        "supplier_code": "SUP-BERLIN-SENSORS",
        "name": "Berlin Precision Sensors GmbH",
        "country": "Germany",
        "city": "Berlin",
        "tier": "Tier 2",
        "reliability_score": 0.91,
        "risk_score": 0.09,
        "average_lead_time_days": 10,
        "contact_email": "info@berlinsensors.de",
        "contact_phone": "+49-30-123456",
        "status": "ACTIVE",
    }
    response = client.post(
        "/api/v1/supply-chain/suppliers",
        json=new_sup,
        headers={"X-Organization-Id": "ORG-APEX-GLOBAL"},
    )
    assert response.status_code == 201
    created = response.json()
    assert created["supplier_code"] == "SUP-BERLIN-SENSORS"
    assert created["id"] is not None


# ------------------------------------------------------------------------------
# 2. Purchase Order & Line-Item Relationships
# ------------------------------------------------------------------------------

def test_purchase_orders_and_items():
    response = client.get("/api/v1/supply-chain/orders", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 3
    
    # Check PO-2026-9021 (the Suez-impacted order)
    po = next(p for p in data["items"] if p["po_number"] == "PO-2026-9021")
    assert po["status"] == "DELAYED"
    assert po["priority"] == "CRITICAL"
    assert len(po["items"]) >= 1
    assert po["items"][0]["sku"] == "SKU-SEMI-7720"
    assert po["items"][0]["quantity_ordered"] == 2000


# ------------------------------------------------------------------------------
# 3. Shipment & Checkpoint Relationships
# ------------------------------------------------------------------------------

def test_shipment_and_checkpoints():
    response = client.get("/api/v1/supply-chain/shipments?delayed_only=true", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    
    shp = next(s for s in data["items"] if s["tracking_number"] == "SHP-EU-88219")
    assert shp["delay_hours"] == 96
    assert shp["is_simulated"] is True

    # Retrieve detailed shipment with checkpoints
    detail_resp = client.get(f"/api/v1/supply-chain/shipments/{shp['id']}", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["checkpoints"]) == 4
    cp_statuses = [cp["status"] for cp in detail["checkpoints"]]
    assert "CONGESTED_HOLD" in cp_statuses


# ------------------------------------------------------------------------------
# 4. Warehouse & Inventory Relationships
# ------------------------------------------------------------------------------

def test_warehouses_and_inventory():
    wh_resp = client.get("/api/v1/supply-chain/warehouses", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert wh_resp.status_code == 200
    warehouses = wh_resp.json()
    assert len(warehouses) >= 4
    rotterdam = next(w for w in warehouses if w["warehouse_code"] == "WH-ROTTERDAM-01")
    assert rotterdam["storage_capacity"] == 50000

    inv_resp = client.get(f"/api/v1/supply-chain/inventory?warehouse_id={rotterdam['id']}&is_critical=true", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert inv_resp.status_code == 200
    inv = inv_resp.json()
    assert inv["total"] >= 2
    skus = [item["sku"] for item in inv["items"]]
    assert "SKU-SEMI-7720" in skus


# ------------------------------------------------------------------------------
# 5. Disruption to Shipment Relationships
# ------------------------------------------------------------------------------

def test_disruptions_and_affected_shipments():
    dis_resp = client.get("/api/v1/disruptions/active", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert dis_resp.status_code == 200
    disruptions = dis_resp.json()
    assert len(disruptions) >= 2

    suez = next(d for d in disruptions if d["incident_code"] == "INC-2026-0881")
    assert suez["category"] == "PORT_CONGESTION"
    assert suez["severity"] == "CRITICAL"
    assert suez["estimated_delay_hours"] == 96
    assert suez["proposed_recovery_action"] == "SHIPMENT_REROUTE"
    assert suez["sla_penalty_per_day"] == 45000.0

    # Retrieve detail
    detail_resp = client.get(f"/api/v1/disruptions/{suez['id']}", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert len(detail["affected_shipments"]) == 1
    assert detail["affected_shipments"][0]["tracking_number"] == "SHP-EU-88219"


# ------------------------------------------------------------------------------
# 6. Organisation Isolation
# ------------------------------------------------------------------------------

def test_organization_isolation():
    # User from another org queries suppliers
    response = client.get("/api/v1/supply-chain/suppliers", headers={"X-Organization-Id": "ORG-COMPETITOR-CORP"})
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0  # Zero suppliers visible to foreign org

    # Foreign org attempts to access APEX supplier directly by ID
    sup_apex = client.get("/api/v1/supply-chain/suppliers", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).json()["items"][0]
    unauth_resp = client.get(f"/api/v1/supply-chain/suppliers/{sup_apex['id']}", headers={"X-Organization-Id": "ORG-COMPETITOR-CORP"})
    assert unauth_resp.status_code == 404  # 404 prevents tenant record enumeration


# ------------------------------------------------------------------------------
# 7. Invalid Identifiers Return 404
# ------------------------------------------------------------------------------

def test_invalid_identifiers():
    assert client.get("/api/v1/supply-chain/suppliers/999999", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404
    assert client.get("/api/v1/supply-chain/orders/999999", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404
    assert client.get("/api/v1/supply-chain/shipments/999999", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404
    assert client.get("/api/v1/supply-chain/inventory/999999", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404
    assert client.get("/api/v1/disruptions/999999", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"}).status_code == 404


# ------------------------------------------------------------------------------
# 8. Pagination and Filtering
# ------------------------------------------------------------------------------

def test_pagination_and_filtering():
    # Page size 2
    resp = client.get("/api/v1/supply-chain/suppliers?page=1&page_size=2", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["page"] == 1
    assert data["page_size"] == 2
    assert len(data["items"]) == 2
    assert data["total_pages"] >= 3

    # Filter by tier
    tier1_resp = client.get("/api/v1/supply-chain/suppliers?tier=Tier 1", headers={"X-Organization-Id": "ORG-APEX-GLOBAL"})
    assert tier1_resp.status_code == 200
    for s in tier1_resp.json()["items"]:
        assert s["tier"] == "Tier 1"


# ------------------------------------------------------------------------------
# 9. Seed Script Idempotency
# ------------------------------------------------------------------------------

def test_seed_script_idempotency():
    db = TestingSessionLocal()
    initial_sup_count = db.query(Supplier).filter_by(organization_id="ORG-APEX-GLOBAL").count()
    initial_shp_count = db.query(Shipment).filter_by(organization_id="ORG-APEX-GLOBAL").count()
    
    # Run seed again
    seed_supply_chain_data(db, organization_id="ORG-APEX-GLOBAL")
    
    after_sup_count = db.query(Supplier).filter_by(organization_id="ORG-APEX-GLOBAL").count()
    after_shp_count = db.query(Shipment).filter_by(organization_id="ORG-APEX-GLOBAL").count()
    db.close()
    
    assert initial_sup_count == after_sup_count
    assert initial_shp_count == after_shp_count


# ------------------------------------------------------------------------------
# 10. Existing Blockchain API Compatibility
# ------------------------------------------------------------------------------

def test_existing_blockchain_api_compatibility():
    # Canonical plan hash generation endpoint
    plan_payload = {
        "plan_data": {
            "plan_id": "RCP-SHP-88219",
            "version": 1,
            "organization_id": "ORG-APEX-GLOBAL",
            "action_category": "SHIPMENT_REROUTE",
            "action_mask": 4,
            "parameters": {"reroute": "Cape of Good Hope"},
            "expected_delay_reduction_hours": 60,
            "estimated_recovery_cost_usd": 12500.0,
        }
    }
    hash_resp = client.post("/blockchain/hash/generate", json=plan_payload)
    assert hash_resp.status_code == 200
    data = hash_resp.json()
    assert "sha256_hash" in data
    assert len(data["sha256_hash"]) == 66  # 0x + 64 hex chars

    # Health check reflects unified service
    health_resp = client.get("/health")
    assert health_resp.status_code == 200
    assert health_resp.json()["status"] == "HEALTHY"


# ------------------------------------------------------------------------------
# 11. Database Persistence Simulation
# ------------------------------------------------------------------------------

def test_database_persistence():
    now = datetime.datetime.utcnow()
    db1 = TestingSessionLocal()
    new_po = PurchaseOrder(
        organization_id="ORG-APEX-GLOBAL",
        po_number="PO-TEST-PERSISTENCE-01",
        supplier_id=1,
        expected_delivery_date=now + datetime.timedelta(days=5),
        total_value=5000.0,
        currency="USD",
        status="ISSUED",
        priority="LOW",
    )
    db1.add(new_po)
    db1.commit()
    saved_id = new_po.id
    db1.close()

    # Re-open session and verify persistence
    db2 = TestingSessionLocal()
    retrieved = db2.query(PurchaseOrder).filter_by(id=saved_id).first()
    assert retrieved is not None
    assert retrieved.po_number == "PO-TEST-PERSISTENCE-01"
    db2.close()
