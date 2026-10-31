"""Writes ready-to-upload CSV and JSON files to docs/sample-imports. Run from the repo root.

Dates are relative to today, so regenerate them if a demo is more than a few days away.
Import in number order, because later files refer to records created by earlier ones.
"""
import csv
import datetime
import json
from pathlib import Path

OUT = Path(__file__).resolve().parents[1] / "docs" / "sample-imports"
today = datetime.datetime.now(datetime.timezone.utc).replace(hour=12, minute=0, second=0, microsecond=0)


def day(offset: int) -> str:
    return (today + datetime.timedelta(days=offset)).strftime("%Y-%m-%dT%H:%M:%SZ")


FILES = {
    "1_suppliers": [
        {"code": "SUP-101", "name": "Bharat Circuits Pvt Ltd", "country": "India", "category": "Electronics"},
        {"code": "SUP-102", "name": "Kyoto Precision Co", "country": "Japan", "category": "Electronics"},
        {"code": "SUP-103", "name": "Rhine Sensor Works", "country": "Germany", "category": "Sensors"},
    ],
    "2_products": [
        {"sku": "SKU-CTRL-201", "name": "PRD-201 Motor Controllers", "category": "Electronics"},
        {"sku": "SKU-RLY-202", "name": "PRD-202 Industrial Relays", "category": "Electronics"},
    ],
    "3_warehouses": [
        {"code": "WH-PUN", "name": "Pune West Hub", "latitude": 18.52, "longitude": 73.86},
        {"code": "WH-HYD", "name": "Hyderabad South Hub", "latitude": 17.39, "longitude": 78.49},
    ],
    "4_carriers": [
        {"code": "CAR-11", "name": "BlueDart Freight", "capacity": 4000},
        {"code": "CAR-12", "name": "Maersk Line", "capacity": 9000},
    ],
    "5_inventory": [
        {"warehouse_code": "WH-PUN", "sku": "SKU-CTRL-201", "on_hand": 600, "reserved": 100, "safety": 50},
        {"warehouse_code": "WH-HYD", "sku": "SKU-RLY-202", "on_hand": 300, "reserved": 0, "safety": 25},
    ],
    # SHP-301 uses the Singapore to Mumbai route so a delay on it produces recovery options.
    "6_shipments": [
        {"shipment_code": "SHP-301", "supplier_code": "SUP-101", "carrier_code": "CAR-12", "warehouse_code": "WH-MUM", "sku": "SKU-MIC-012", "quantity": 400, "eta": day(1), "origin": "Singapore", "route_risk": 0.8, "weather_severity": 0.7, "customs_hours": 30, "freight_cost": 5000},
        {"shipment_code": "SHP-302", "supplier_code": "SUP-102", "carrier_code": "CAR-11", "warehouse_code": "WH-PUN", "sku": "SKU-CTRL-201", "quantity": 250, "eta": day(5), "origin": "Yokohama", "route_risk": 0.3, "weather_severity": 0.2, "customs_hours": 12, "freight_cost": 2200},
    ],
    "7_orders": [
        {"order_code": "ORD-601", "customer": "Vidya Robotics", "sku": "SKU-MIC-012", "quantity": 240, "required_date": day(2), "priority": 1, "shipment_code": "SHP-301", "warehouse_code": "", "destination": "Mumbai"},
        {"order_code": "ORD-602", "customer": "Kaveri Instruments", "sku": "SKU-MIC-012", "quantity": 160, "required_date": day(2), "priority": 2, "shipment_code": "SHP-301", "warehouse_code": "", "destination": "Pune"},
        {"order_code": "ORD-603", "customer": "Deccan Motors", "sku": "SKU-CTRL-201", "quantity": 120, "required_date": day(9), "priority": 3, "shipment_code": "", "warehouse_code": "WH-PUN", "destination": "Pune"},
    ],
}
ERRORS = [
    {"code": "SUP-104", "name": "Valid Supplier Ltd", "country": "India", "category": "Electronics"},
    {"code": "SUP-003", "name": "Tries To Overwrite An Existing Supplier", "country": "Nowhere", "category": "Electronics"},
    {"code": "SUP-104", "name": "Duplicate Row In This File", "country": "India", "category": "Electronics"},
    {"code": "", "name": "Missing Code Ltd", "country": "India", "category": "Electronics"},
]


def write_csv(path: Path, rows) -> None:
    with path.open("w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


OUT.mkdir(parents=True, exist_ok=True)
for old in OUT.iterdir():
    old.unlink()
for name, rows in FILES.items():
    write_csv(OUT / f"{name}.csv", rows)
    clean = [{k: v for k, v in row.items() if v != ""} for row in rows]
    (OUT / f"{name}.json").write_text(json.dumps(clean, indent=2), encoding="utf-8")
write_csv(OUT / "0_demo_suppliers_with_errors.csv", ERRORS)
print(f"Wrote {len(list(OUT.iterdir()))} files to {OUT}")
