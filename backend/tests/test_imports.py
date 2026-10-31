"""CSV and JSON imports through the real API (PRD 6.18-6.20)."""
import json
from .test_ops_workflow import boot, client, login  # noqa: F401


def upload(client, headers, entity, content, kind="csv", mode="PARTIAL", name="file"):
    return client.post(f"/api/v1/imports/{kind}", headers=headers, json={"entity_type": entity, "file_name": f"{name}.{kind}", "content": content, "mode": mode})


def test_only_an_administrator_can_import(client):
    assert upload(client, login(client, "analyst@trustchain.com"), "suppliers", "code,name\nS,N\n").status_code == 403


def test_partial_import_reports_bad_rows_and_never_overwrites(client):
    admin = login(client, "admin@trustchain.com")
    content = "supplier_code,supplier_name,country\nSUP-900,New Supplier,India\nSUP-003,Hijacked Name,X\nSUP-900,Again,X\n,No Code,X\n"
    job = upload(client, admin, "suppliers", content).json()
    assert (job["status"], job["totalRows"], job["acceptedRows"], job["rejectedRows"]) == ("VALIDATED", 4, 1, 3)
    assert {e["code"] for e in job["errors"]} == {"ALREADY_EXISTS", "DUPLICATE_IN_FILE", "MISSING_REQUIRED"}
    assert {e["row"] for e in job["errors"]} == {2, 3, 4}

    # Nothing is saved until it's confirmed.
    assert "SUP-900" not in [s["code"] for s in boot(client, admin)["suppliers"]]
    done = client.post(f"/api/v1/imports/{job['id']}/confirm", headers=admin).json()
    assert done["status"] == "COMPLETED"

    # Other roles see it, and the existing supplier kept its name.
    suppliers = {s["code"]: s["name"] for s in boot(client, login(client, "analyst@trustchain.com"))["suppliers"]}
    assert suppliers["SUP-900"] == "New Supplier"
    assert suppliers["SUP-003"] == "TechParts Ltd"
    assert client.post(f"/api/v1/imports/{job['id']}/confirm", headers=admin).status_code == 409


def test_strict_mode_cannot_confirm_a_file_with_errors(client):
    admin = login(client, "admin@trustchain.com")
    job = upload(client, admin, "suppliers", "code,name\nSUP-901,Good\nSUP-003,Duplicate\n", mode="STRICT").json()
    assert job["canConfirm"] is False
    assert client.post(f"/api/v1/imports/{job['id']}/confirm", headers=admin).json()["status"] == "REJECTED"
    assert "SUP-901" not in [s["code"] for s in boot(client, admin)["suppliers"]]


def test_invalid_values_and_unknown_references_name_the_row(client):
    admin = login(client, "admin@trustchain.com")
    content = "warehouse_code,sku,on_hand\nWH-NOPE,SKU-MIC-012,5\nWH-MUM,SKU-SEN-034,-4\nWH-MUM,SKU-SEN-034,abc\n"
    errors = upload(client, admin, "inventory", content).json()["errors"]
    assert [(e["row"], e["code"]) for e in errors] == [(1, "UNKNOWN_REFERENCE"), (2, "INVALID_VALUE"), (3, "INVALID_VALUE")]


def test_missing_columns_and_bad_json_are_refused_up_front(client):
    admin = login(client, "admin@trustchain.com")
    missing = upload(client, admin, "shipments", "shipment_code\nX\n")
    assert missing.status_code == 422 and missing.json()["detail"]["code"] == "MISSING_COLUMNS"
    assert upload(client, admin, "suppliers", "{not json", kind="json").json()["detail"]["code"] == "INVALID_JSON"


def test_imported_shipment_and_order_flow_through_to_a_real_disruption(client):
    admin = login(client, "admin@trustchain.com")
    shipment = json.dumps([{"shipment_code": "SHP-900", "supplier_code": "SUP-003", "carrier_code": "CAR-01", "warehouse_code": "WH-MUM", "sku": "SKU-MIC-012", "quantity": 50, "eta": "2030-01-01T00:00:00Z", "origin": "Chennai"}])
    job = upload(client, admin, "shipments", shipment, kind="json").json()
    assert client.post(f"/api/v1/imports/{job['id']}/confirm", headers=admin).json()["status"] == "COMPLETED"

    order = "order_code,customer,sku,quantity,required_date,priority,shipment_code\nORD-900,Imported Customer,SKU-MIC-012,50,2030-01-02,1,SHP-900\n"
    job = upload(client, admin, "orders", order).json()
    assert job["errors"] == []
    assert client.post(f"/api/v1/imports/{job['id']}/confirm", headers=admin).json()["status"] == "COMPLETED"

    response = client.post("/api/v1/webhooks/carriers/simulated", headers={"X-Webhook-Secret": "demo-carrier-secret"}, json={
        "event_id": "imported-1", "carrier": "OceanTrans", "shipment_id": "SHP-900", "event_type": "SHIPMENT_DELAYED", "event_timestamp": "2029-12-30T00:00:00Z", "estimated_delay_hours": 96, "reason": "Storm",
    })
    assert response.status_code == 200, response.text
    data = boot(client, login(client, "analyst@trustchain.com"))
    assert "SHP-900" in [d["id"] for d in data["disruptions"]]
    assert "ORD-900" in [o["id"] for o in data["orders"]]


def test_order_cannot_take_more_stock_than_is_free(client):
    admin = login(client, "admin@trustchain.com")
    content = "order_code,customer,sku,quantity,required_date,warehouse_code\nORD-910,A,SKU-MIC-012,400,2030-01-02,WH-BLR\nORD-911,B,SKU-MIC-012,400,2030-01-02,WH-BLR\n"
    errors = upload(client, admin, "orders", content).json()["errors"]
    assert [(e["row"], e["code"]) for e in errors] == [(2, "INSUFFICIENT_STOCK")]
