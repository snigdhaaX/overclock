import datetime
from sqlalchemy.orm import Session
from sqlalchemy import select
from .models import (
    Supplier,
    PurchaseOrder,
    OrderItem,
    Shipment,
    ShipmentCheckpoint,
    Warehouse,
    InventoryItem,
    Disruption,
    DisruptionShipment,
    CustomerOrder,
    CustomerOrderLine,
)


def seed_supply_chain_data(db: Session, organization_id: str = "ORG-APEX-GLOBAL") -> dict:
    """
    Idempotent seed script for a realistic global electronics supply chain.
    Populates interconnected suppliers, purchase orders, shipments, checkpoints,
    warehouses, inventory items, and disruption scenarios.
    """
    now = datetime.datetime.utcnow()
    created_counts = {
        "suppliers": 0,
        "purchase_orders": 0,
        "shipments": 0,
        "checkpoints": 0,
        "warehouses": 0,
        "inventory_items": 0,
        "disruptions": 0,
        "customer_orders": 0,
    }

    # -------------------------------------------------------------
    # 1. Warehouses
    # -------------------------------------------------------------
    warehouses_data = [
        {
            "warehouse_code": "WH-ROTTERDAM-01",
            "warehouse_name": "Rotterdam Mega Distribution Centre",
            "location": "Haven 8200, Port of Rotterdam",
            "country": "Netherlands",
            "storage_capacity": 50000,
            "current_utilisation": 41200,
            "operational_status": "OPERATIONAL",
        },
        {
            "warehouse_code": "WH-FRANKFURT-02",
            "warehouse_name": "Frankfurt Advanced Tech Logistics Hub",
            "location": "CargoCity Süd, Frankfurt Airport",
            "country": "Germany",
            "storage_capacity": 30000,
            "current_utilisation": 24500,
            "operational_status": "OPERATIONAL",
        },
        {
            "warehouse_code": "WH-SINGAPORE-03",
            "warehouse_name": "APAC Regional Transshipment Hub",
            "location": "Jurong Port Rd, Singapore",
            "country": "Singapore",
            "storage_capacity": 45000,
            "current_utilisation": 38000,
            "operational_status": "OPERATIONAL",
        },
        {
            "warehouse_code": "WH-CHICAGO-04",
            "warehouse_name": "Midwest North America Logistics Gateway",
            "location": "O'Hare Logistics Corridor, Chicago, IL",
            "country": "United States",
            "storage_capacity": 60000,
            "current_utilisation": 49000,
            "operational_status": "OPERATIONAL",
        },
    ]

    warehouse_records = {}
    for w_data in warehouses_data:
        existing_wh = db.query(Warehouse).filter_by(
            organization_id=organization_id, warehouse_code=w_data["warehouse_code"]
        ).first()
        if not existing_wh:
            existing_wh = Warehouse(organization_id=organization_id, **w_data)
            db.add(existing_wh)
            db.flush()
            created_counts["warehouses"] += 1
        warehouse_records[w_data["warehouse_code"]] = existing_wh

    # -------------------------------------------------------------
    # 2. Suppliers
    # -------------------------------------------------------------
    suppliers_data = [
        {
            "supplier_code": "SUP-NORDIC-FREIGHT",
            "name": "Nordic Marine & Freight Systems GmbH",
            "country": "Germany",
            "city": "Hamburg",
            "tier": "Tier 1",
            "reliability_score": 0.94,
            "risk_score": 0.12,
            "average_lead_time_days": 18,
            "contact_email": "ops@nordicfreight.de",
            "contact_phone": "+49-40-5521-00",
            "status": "ACTIVE",
        },
        {
            "supplier_code": "SUP-TOKYO-SEMI",
            "name": "Tokyo Microelectronics Ltd",
            "country": "Japan",
            "city": "Tokyo",
            "tier": "Tier 1",
            "reliability_score": 0.98,
            "risk_score": 0.04,
            "average_lead_time_days": 14,
            "contact_email": "b2b@tokyosemi.jp",
            "contact_phone": "+81-3-3501-1122",
            "status": "ACTIVE",
        },
        {
            "supplier_code": "SUP-TAIWAN-FOUNDRY",
            "name": "Formosa High-Precision Silicon Corp",
            "country": "Taiwan",
            "city": "Hsinchu",
            "tier": "Tier 1",
            "reliability_score": 0.97,
            "risk_score": 0.15,
            "average_lead_time_days": 21,
            "contact_email": "export@formosasilicon.tw",
            "contact_phone": "+886-3-577-8000",
            "status": "ACTIVE",
        },
        {
            "supplier_code": "SUP-SHENZHEN-OPTICS",
            "name": "Shenzhen Precision Sensor Tech Ltd",
            "country": "China",
            "city": "Shenzhen",
            "tier": "Tier 2",
            "reliability_score": 0.89,
            "risk_score": 0.22,
            "average_lead_time_days": 12,
            "contact_email": "supply@szprecision.cn",
            "contact_phone": "+86-755-8321-4400",
            "status": "ACTIVE",
        },
        {
            "supplier_code": "SUP-AUSTIN-POWER",
            "name": "Lone Star Power Semiconductor Inc",
            "country": "United States",
            "city": "Austin",
            "tier": "Tier 1",
            "reliability_score": 0.96,
            "risk_score": 0.06,
            "average_lead_time_days": 8,
            "contact_email": "orders@lonestarpower.com",
            "contact_phone": "+1-512-400-8800",
            "status": "ACTIVE",
        },
    ]

    supplier_records = {}
    for s_data in suppliers_data:
        existing_sup = db.query(Supplier).filter_by(
            organization_id=organization_id, supplier_code=s_data["supplier_code"]
        ).first()
        if not existing_sup:
            existing_sup = Supplier(organization_id=organization_id, **s_data)
            db.add(existing_sup)
            db.flush()
            created_counts["suppliers"] += 1
        supplier_records[s_data["supplier_code"]] = existing_sup

    # -------------------------------------------------------------
    # 3. Inventory Items
    # -------------------------------------------------------------
    inventory_data = [
        # Rotterdam Inventory
        {
            "warehouse_code": "WH-ROTTERDAM-01",
            "sku": "SKU-SEMI-7720",
            "product_name": "High-Efficiency Dual-Core SoC 7nm",
            "category": "CRITICAL_COMPONENT",
            "is_critical": True,
            "available_quantity": 420,
            "reserved_quantity": 380,
            "safety_stock": 500,
            "reorder_threshold": 300,
            "unit_cost": 185.0,
        },
        {
            "warehouse_code": "WH-ROTTERDAM-01",
            "sku": "SKU-OPT-1044",
            "product_name": "Optical Multi-Band Lidar Transceiver",
            "category": "CRITICAL_COMPONENT",
            "is_critical": True,
            "available_quantity": 250,
            "reserved_quantity": 200,
            "safety_stock": 200,
            "reorder_threshold": 150,
            "unit_cost": 320.0,
        },
        {
            "warehouse_code": "WH-ROTTERDAM-01",
            "sku": "SKU-POW-3001",
            "product_name": "GaN High-Density Power Conversion Unit",
            "category": "STANDARD_ASSEMBLY",
            "is_critical": False,
            "available_quantity": 1800,
            "reserved_quantity": 600,
            "safety_stock": 800,
            "reorder_threshold": 500,
            "unit_cost": 45.0,
        },
        # Frankfurt Inventory
        {
            "warehouse_code": "WH-FRANKFURT-02",
            "sku": "SKU-SEMI-7720",
            "product_name": "High-Efficiency Dual-Core SoC 7nm",
            "category": "CRITICAL_COMPONENT",
            "is_critical": True,
            "available_quantity": 150,
            "reserved_quantity": 120,
            "safety_stock": 250,
            "reorder_threshold": 100,
            "unit_cost": 185.0,
        },
        {
            "warehouse_code": "WH-FRANKFURT-02",
            "sku": "SKU-SENS-550",
            "product_name": "Precision Gyroscopic IMU Sensor",
            "category": "STANDARD_ASSEMBLY",
            "is_critical": False,
            "available_quantity": 950,
            "reserved_quantity": 300,
            "safety_stock": 400,
            "reorder_threshold": 250,
            "unit_cost": 65.0,
        },
        # Singapore Inventory
        {
            "warehouse_code": "WH-SINGAPORE-03",
            "sku": "SKU-SEMI-7720",
            "product_name": "High-Efficiency Dual-Core SoC 7nm",
            "category": "CRITICAL_COMPONENT",
            "is_critical": True,
            "available_quantity": 1200,
            "reserved_quantity": 400,
            "safety_stock": 600,
            "reorder_threshold": 400,
            "unit_cost": 185.0,
        },
        {
            "warehouse_code": "WH-SINGAPORE-03",
            "sku": "SKU-MEM-990",
            "product_name": "LPDDR5X Low-Power 32GB DRAM Die",
            "category": "STANDARD_ASSEMBLY",
            "is_critical": False,
            "available_quantity": 3400,
            "reserved_quantity": 800,
            "safety_stock": 1000,
            "reorder_threshold": 600,
            "unit_cost": 28.0,
        },
    ]

    for inv_data in inventory_data:
        wh = warehouse_records[inv_data["warehouse_code"]]
        existing_item = db.query(InventoryItem).filter_by(
            organization_id=organization_id, warehouse_id=wh.id, sku=inv_data["sku"]
        ).first()
        if not existing_item:
            item = InventoryItem(
                organization_id=organization_id,
                warehouse_id=wh.id,
                sku=inv_data["sku"],
                product_name=inv_data["product_name"],
                category=inv_data["category"],
                is_critical=inv_data["is_critical"],
                available_quantity=inv_data["available_quantity"],
                reserved_quantity=inv_data["reserved_quantity"],
                safety_stock=inv_data["safety_stock"],
                reorder_threshold=inv_data["reorder_threshold"],
                unit_cost=inv_data["unit_cost"],
                currency="USD",
            )
            db.add(item)
            created_counts["inventory_items"] += 1

    # -------------------------------------------------------------
    # 4. Purchase Orders & Order Items
    # -------------------------------------------------------------
    pos_data = [
        # Main PO affected by Suez bottleneck
        {
            "po_number": "PO-2026-9021",
            "supplier_code": "SUP-TAIWAN-FOUNDRY",
            "order_date": now - datetime.timedelta(days=22),
            "expected_delivery_date": now + datetime.timedelta(days=2),
            "total_value": 370000.0,
            "currency": "USD",
            "status": "DELAYED",
            "priority": "CRITICAL",
            "items": [
                {
                    "sku": "SKU-SEMI-7720",
                    "product_name": "High-Efficiency Dual-Core SoC 7nm",
                    "quantity_ordered": 2000,
                    "quantity_received": 0,
                    "unit_price": 185.0,
                    "total_price": 370000.0,
                }
            ],
        },
        # Air freight PO for optical sensors
        {
            "po_number": "PO-2026-9022",
            "supplier_code": "SUP-SHENZHEN-OPTICS",
            "order_date": now - datetime.timedelta(days=8),
            "expected_delivery_date": now + datetime.timedelta(days=4),
            "total_value": 160000.0,
            "currency": "USD",
            "status": "IN_TRANSIT",
            "priority": "HIGH",
            "items": [
                {
                    "sku": "SKU-OPT-1044",
                    "product_name": "Optical Multi-Band Lidar Transceiver",
                    "quantity_ordered": 500,
                    "quantity_received": 0,
                    "unit_price": 320.0,
                    "total_price": 160000.0,
                }
            ],
        },
        # US Domestic power modules
        {
            "po_number": "PO-2026-9023",
            "supplier_code": "SUP-AUSTIN-POWER",
            "order_date": now - datetime.timedelta(days=5),
            "expected_delivery_date": now + datetime.timedelta(days=3),
            "total_value": 90000.0,
            "currency": "USD",
            "status": "ISSUED",
            "priority": "MEDIUM",
            "items": [
                {
                    "sku": "SKU-POW-3001",
                    "product_name": "GaN High-Density Power Conversion Unit",
                    "quantity_ordered": 2000,
                    "quantity_received": 0,
                    "unit_price": 45.0,
                    "total_price": 90000.0,
                }
            ],
        },
    ]

    po_records = {}
    for po_data in pos_data:
        sup = supplier_records[po_data["supplier_code"]]
        existing_po = db.query(PurchaseOrder).filter_by(
            organization_id=organization_id, po_number=po_data["po_number"]
        ).first()
        if not existing_po:
            existing_po = PurchaseOrder(
                organization_id=organization_id,
                po_number=po_data["po_number"],
                supplier_id=sup.id,
                order_date=po_data["order_date"],
                expected_delivery_date=po_data["expected_delivery_date"],
                total_value=po_data["total_value"],
                currency=po_data["currency"],
                status=po_data["status"],
                priority=po_data["priority"],
            )
            db.add(existing_po)
            db.flush()
            created_counts["purchase_orders"] += 1

            for item_data in po_data["items"]:
                po_item = OrderItem(
                    purchase_order_id=existing_po.id,
                    sku=item_data["sku"],
                    product_name=item_data["product_name"],
                    quantity_ordered=item_data["quantity_ordered"],
                    quantity_received=item_data["quantity_received"],
                    unit_price=item_data["unit_price"],
                    total_price=item_data["total_price"],
                )
                db.add(po_item)

        po_records[po_data["po_number"]] = existing_po

    # -------------------------------------------------------------
    # 5. Shipments & Checkpoints
    # -------------------------------------------------------------
    shipments_data = [
        # Main affected maritime shipment in Suez Canal
        {
            "tracking_number": "SHP-EU-88219",
            "po_number": "PO-2026-9021",
            "carrier": "Hapag-Lloyd Maritime Lines",
            "vessel_name": "MV Munich Express (IMO 9449830)",
            "transport_mode": "SEA_FREIGHT",
            "origin": "Port of Kaohsiung (TWKHH)",
            "destination": "Port of Rotterdam (NLRTM)",
            "current_location": "Suez Canal South Anchorage (EGSUZ)",
            "status": "DELAYED",
            "departure_date": now - datetime.timedelta(days=16),
            "estimated_arrival": now + datetime.timedelta(days=6),  # Was supposed to arrive in 2 days (+96 hrs)
            "delay_hours": 96,
            "route_info": '{"corridor": "Asia-Europe Maritime Route", "waypoint": "Suez Canal Convoys", "transit_status": "QUEUED_SOUTH_ANCHORAGE"}',
            "is_simulated": True,
            "checkpoints": [
                {
                    "checkpoint_name": "Port of Kaohsiung Departure",
                    "location": "Kaohsiung, Taiwan",
                    "status": "DEPARTED",
                    "timestamp": now - datetime.timedelta(days=16),
                    "notes": "Containers loaded on MV Munich Express. Departure on schedule.",
                },
                {
                    "checkpoint_name": "Malacca Strait Gateway",
                    "location": "Strait of Malacca",
                    "status": "PASSED",
                    "timestamp": now - datetime.timedelta(days=11),
                    "notes": "Passed Singapore waypoint under normal weather conditions.",
                },
                {
                    "checkpoint_name": "Bab el-Mandeb Strait Transit",
                    "location": "Red Sea Entry",
                    "status": "PASSED",
                    "timestamp": now - datetime.timedelta(days=5),
                    "notes": "Entered Red Sea corridor with international maritime escort.",
                },
                {
                    "checkpoint_name": "Suez Canal South Entrance Queue",
                    "location": "Suez Canal South Anchorage (EGSUZ)",
                    "status": "CONGESTED_HOLD",
                    "timestamp": now - datetime.timedelta(hours=36),
                    "notes": "SIMULATED: Vessel halted due to major canal obstruction and severe backlog. Estimated queue delay 96 hours.",
                },
            ],
        },
        # Air Freight shipment (fast track)
        {
            "tracking_number": "SHP-AIR-4401",
            "po_number": "PO-2026-9022",
            "carrier": "Lufthansa Cargo",
            "vessel_name": "Flight LH8401 (Boeing 777F)",
            "transport_mode": "AIR_FREIGHT",
            "origin": "Shenzhen Bao'an Airport (SZX)",
            "destination": "Frankfurt International (FRA)",
            "current_location": "En Route - Central Asian Air Corridor",
            "status": "IN_TRANSIT",
            "departure_date": now - datetime.timedelta(hours=14),
            "estimated_arrival": now + datetime.timedelta(hours=10),
            "delay_hours": 0,
            "route_info": '{"corridor": "Trans-Eurasian Air Cargo", "status": "ON_SCHEDULE"}',
            "is_simulated": True,
            "checkpoints": [
                {
                    "checkpoint_name": "Shenzhen Cargo Loading",
                    "location": "Shenzhen, China",
                    "status": "DEPARTED",
                    "timestamp": now - datetime.timedelta(hours=14),
                    "notes": "Customs clearance completed. Cargo departed.",
                },
                {
                    "checkpoint_name": "In-Flight Telemetry Checkpoint",
                    "location": "Almaty Airspace",
                    "status": "IN_TRANSIT",
                    "timestamp": now - datetime.timedelta(hours=4),
                    "notes": "Flight tracking normal. ETA intact.",
                },
            ],
        },
    ]

    shipment_records = {}
    for shp_data in shipments_data:
        po = po_records[shp_data["po_number"]]
        existing_shp = db.query(Shipment).filter_by(tracking_number=shp_data["tracking_number"]).first()
        if not existing_shp:
            existing_shp = Shipment(
                organization_id=organization_id,
                tracking_number=shp_data["tracking_number"],
                purchase_order_id=po.id,
                carrier=shp_data["carrier"],
                vessel_name=shp_data["vessel_name"],
                transport_mode=shp_data["transport_mode"],
                origin=shp_data["origin"],
                destination=shp_data["destination"],
                current_location=shp_data["current_location"],
                status=shp_data["status"],
                departure_date=shp_data["departure_date"],
                estimated_arrival=shp_data["estimated_arrival"],
                delay_hours=shp_data["delay_hours"],
                route_info=shp_data["route_info"],
                is_simulated=shp_data["is_simulated"],
            )
            db.add(existing_shp)
            db.flush()
            created_counts["shipments"] += 1

            for cp_data in shp_data["checkpoints"]:
                cp = ShipmentCheckpoint(
                    shipment_id=existing_shp.id,
                    checkpoint_name=cp_data["checkpoint_name"],
                    location=cp_data["location"],
                    status=cp_data["status"],
                    timestamp=cp_data["timestamp"],
                    notes=cp_data["notes"],
                    is_simulated=True,
                )
                db.add(cp)
                created_counts["checkpoints"] += 1

        shipment_records[shp_data["tracking_number"]] = existing_shp

    # -------------------------------------------------------------
    # 6. Customer Orders (Downstream SLA exposure)
    # -------------------------------------------------------------
    customer_orders_data = [
        {
            "order_number": "ORD-GLOBAL-4412",
            "customer_name": "Apex Global Automotive & Avionics",
            "priority": "CRITICAL",
            "sla_deadline": now + datetime.timedelta(days=3),  # 72 hours remaining, but shipment delayed 96 hrs!
            "status": "IMPACTED_BY_DISRUPTION",
            "sla_penalty_per_day": 45000.0,
            "affected_shipment_tracking": "SHP-EU-88219",
            "lines": [
                {
                    "sku": "SKU-SEMI-7720",
                    "product_name": "High-Efficiency Dual-Core SoC 7nm",
                    "quantity": 1500,
                    "unit_price": 280.0,
                }
            ],
        }
    ]

    for co_data in customer_orders_data:
        aff_shp = shipment_records.get(co_data["affected_shipment_tracking"])
        existing_co = db.query(CustomerOrder).filter_by(
            organization_id=organization_id, order_number=co_data["order_number"]
        ).first()
        if not existing_co:
            existing_co = CustomerOrder(
                organization_id=organization_id,
                order_number=co_data["order_number"],
                customer_name=co_data["customer_name"],
                priority=co_data["priority"],
                sla_deadline=co_data["sla_deadline"],
                status=co_data["status"],
                sla_penalty_per_day=co_data["sla_penalty_per_day"],
                affected_shipment_id=aff_shp.id if aff_shp else None,
            )
            db.add(existing_co)
            db.flush()
            created_counts["customer_orders"] += 1

            for line in co_data["lines"]:
                co_line = CustomerOrderLine(
                    customer_order_id=existing_co.id,
                    sku=line["sku"],
                    product_name=line["product_name"],
                    quantity=line["quantity"],
                    unit_price=line["unit_price"],
                )
                db.add(co_line)

    # -------------------------------------------------------------
    # 7. Disruption Events & Shipment Associations
    # -------------------------------------------------------------
    disruptions_data = [
        # Primary Suez disruption (Matches Milestone 5 & 6 scenario)
        {
            "incident_code": "INC-2026-0881",
            "category": "PORT_CONGESTION",
            "severity": "CRITICAL",
            "geographic_region": "Suez Canal / Red Sea Gateway",
            "description": "SIMULATED DISRUPTION: Severe maritime bottleneck and convoy stoppage in the Great Bitter Lake sector of Suez Canal. Over 180 vessels queued in southern anchorage with an expected delay of 96 hours affecting European deliveries.",
            "start_time": now - datetime.timedelta(hours=36),
            "estimated_end_time": now + datetime.timedelta(hours=60),
            "estimated_delay_hours": 96,
            "financial_exposure": 180000.0,  # 4 days potential SLA penalty @ $45k/day
            "status": "ACTIVE",
            "detection_source": "AI_SATELLITE_AIS_MONITORING",
            "confidence_score": 0.94,
            "sla_penalty_per_day": 45000.0,
            "sla_threshold_hours": 24,
            "proposed_recovery_action": "SHIPMENT_REROUTE",
            "estimated_recovery_hours": 36,
            "estimated_recovery_cost": 12500.0,
            "is_simulated": True,
            "affected_shipments": [
                {
                    "tracking_number": "SHP-EU-88219",
                    "impact_summary": "Vessel MV Munich Express stuck at Southern Anchorage; critical customer order ORD-GLOBAL-4412 SLA deadline breached by 48 hrs without reroute.",
                }
            ],
        },
        # Secondary Weather Disruption
        {
            "incident_code": "INC-2026-0412",
            "category": "WEATHER",
            "severity": "MEDIUM",
            "geographic_region": "South China Sea Corridor",
            "description": "SIMULATED DISRUPTION: Severe tropical storm formation causing minor maritime route diversions and flight holding patterns near Taiwan Strait.",
            "start_time": now - datetime.timedelta(hours=18),
            "estimated_end_time": now + datetime.timedelta(hours=24),
            "estimated_delay_hours": 12,
            "financial_exposure": 25000.0,
            "status": "MONITORING",
            "detection_source": "METEOROLOGICAL_RADAR_FEED",
            "confidence_score": 0.88,
            "sla_penalty_per_day": 10000.0,
            "sla_threshold_hours": 24,
            "proposed_recovery_action": "WEATHER_DIVERSION",
            "estimated_recovery_hours": 8,
            "estimated_recovery_cost": 4200.0,
            "is_simulated": True,
            "affected_shipments": [],
        },
    ]

    for dis_data in disruptions_data:
        existing_dis = db.query(Disruption).filter_by(
            organization_id=organization_id, incident_code=dis_data["incident_code"]
        ).first()
        if not existing_dis:
            existing_dis = Disruption(
                organization_id=organization_id,
                incident_code=dis_data["incident_code"],
                category=dis_data["category"],
                severity=dis_data["severity"],
                geographic_region=dis_data["geographic_region"],
                description=dis_data["description"],
                start_time=dis_data["start_time"],
                estimated_end_time=dis_data["estimated_end_time"],
                estimated_delay_hours=dis_data["estimated_delay_hours"],
                financial_exposure=dis_data["financial_exposure"],
                status=dis_data["status"],
                detection_source=dis_data["detection_source"],
                confidence_score=dis_data["confidence_score"],
                sla_penalty_per_day=dis_data["sla_penalty_per_day"],
                sla_threshold_hours=dis_data["sla_threshold_hours"],
                proposed_recovery_action=dis_data["proposed_recovery_action"],
                estimated_recovery_hours=dis_data["estimated_recovery_hours"],
                estimated_recovery_cost=dis_data["estimated_recovery_cost"],
                is_simulated=dis_data["is_simulated"],
            )
            db.add(existing_dis)
            db.flush()
            created_counts["disruptions"] += 1

            for aff in dis_data["affected_shipments"]:
                shp = shipment_records.get(aff["tracking_number"])
                if shp:
                    existing_assoc = db.query(DisruptionShipment).filter_by(
                        disruption_id=existing_dis.id, shipment_id=shp.id
                    ).first()
                    if not existing_assoc:
                        assoc = DisruptionShipment(
                            disruption_id=existing_dis.id,
                            shipment_id=shp.id,
                            impact_summary=aff["impact_summary"],
                        )
                        db.add(assoc)

    db.commit()
    return created_counts
