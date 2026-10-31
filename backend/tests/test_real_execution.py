"""Confirming execution changes the records each recovery action covers."""
from backend.app.models.inventory import StockTransfer
from backend.app.models.supply_chain import Carrier, PurchaseOrder, Shipment
from .test_ops_workflow import boot, client, delay, login  # noqa: F401


def run_plan(client, key):
    analyst, manager = login(client, "analyst@trustchain.com"), login(client, "manager@trustchain.com")
    assert client.post(f"/api/v1/recovery/plans/{key}/submit", headers=analyst).status_code == 200
    assert client.post(f"/api/v1/approvals/{key}/approve", headers=manager, json={"comments": "ok"}).status_code == 200
    response = client.post(f"/api/v1/execution/{key}/confirm", headers=manager)
    assert response.status_code == 200, response.text
    return boot(client, manager)


def test_reroute_changes_the_shipment(client):
    assert delay(client).status_code == 200
    before = client.db.query(Shipment).filter_by(code="SHP-101").one()
    old_carrier, old_risk = before.carrier_id, before.route_risk
    data = run_plan(client, "RP-SHP-101-reroute")
    client.db.expire_all()
    after = client.db.query(Shipment).filter_by(code="SHP-101").one()
    assert after.carrier_id != old_carrier
    assert after.route_risk < old_risk
    assert after.tracking_reference == "Northern corridor"
    assert client.db.get(Carrier, after.carrier_id).code == "CAR-02"
    stage = data["execution"]["stages"][0]
    assert "Northern corridor" in stage["details"]
    assert "imulated" not in stage["responsibleRole"]


def test_stock_transfer_moves_stock_and_records_it(client):
    assert delay(client).status_code == 200
    run_plan(client, "RP-SHP-101-transfer")
    client.db.expire_all()
    transfers = client.db.query(StockTransfer).all()
    assert transfers and all(t.status == "COMPLETED" and t.recovery_action_id for t in transfers)


def test_no_purchase_order_is_invented_for_other_plans(client):
    assert delay(client).status_code == 200
    before = client.db.query(PurchaseOrder).count()
    run_plan(client, "RP-SHP-101-reroute")
    assert client.db.query(PurchaseOrder).count() == before
