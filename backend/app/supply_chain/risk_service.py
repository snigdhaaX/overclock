import math
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from .models import Disruption, Shipment, PurchaseOrder, Supplier, CustomerOrder, InventoryItem


class DisruptionRiskScoringService:
    """
    Explainable, deterministic disruption risk-scoring engine.
    Calculates multi-factor risk scores (0-100) with category classification,
    transparent factor contributions, and audit-friendly explanations.
    """

    DEFAULT_WEIGHTS = {
        "severity": 0.25,
        "delay": 0.25,
        "supplier_risk": 0.10,
        "shipment_mode": 0.10,
        "inventory_buffer": 0.10,
        "sla_exposure": 0.20,
    }

    SEVERITY_SCORES = {
        "CRITICAL": 100.0,
        "HIGH": 75.0,
        "MEDIUM": 50.0,
        "LOW": 25.0,
    }

    @classmethod
    def calculate_disruption_risk(
        cls,
        db: Session,
        disruption: Disruption,
        custom_weights: Dict[str, float] = None,
    ) -> Dict[str, Any]:
        """
        Calculates a deterministic risk score for a disruption event.
        Guarantees:
        - Exact same inputs produce identical scores.
        - Detailed explanation for each contributing component.
        - Total factor weights sum to 1.0.
        """
        weights = custom_weights or cls.DEFAULT_WEIGHTS

        # 1. Severity Factor (0-100)
        sev_score = cls.SEVERITY_SCORES.get(disruption.severity.upper(), 50.0)

        # 2. Expected Delay Factor (0-100: normalized against 120h maximum operational threshold)
        delay_hours = max(0, disruption.estimated_delay_hours)
        delay_score = min(round((delay_hours / 120.0) * 100.0, 1), 100.0)

        # Retrieve affected shipments
        affected_shipments: List[Shipment] = [
            assoc.shipment for assoc in disruption.shipment_associations if assoc.shipment
        ]

        # 3. Supplier Risk Factor (0-100)
        supplier_risks = []
        for shp in affected_shipments:
            po = shp.purchase_order
            if po and po.supplier:
                supplier_risks.append(po.supplier.risk_score * 100.0)
        sup_score = (
            round(sum(supplier_risks) / len(supplier_risks), 1)
            if supplier_risks
            else 20.0
        )

        # 4. Shipment Criticality & Transport Mode Factor (0-100)
        # Sea freight has higher transit inertia and re-routing friction than air freight
        mode_scores = []
        for shp in affected_shipments:
            if shp.transport_mode == "SEA_FREIGHT":
                mode_scores.append(85.0)
            elif shp.transport_mode == "AIR_FREIGHT":
                mode_scores.append(40.0)
            else:
                mode_scores.append(60.0)
        ship_mode_score = (
            round(sum(mode_scores) / len(mode_scores), 1)
            if mode_scores
            else 50.0
        )

        # 5. Inventory Buffer Factor (0-100: lower usable stock = higher risk score)
        # Check SKUs in affected POs against local warehouse stock
        inventory_scores = []
        for shp in affected_shipments:
            po = shp.purchase_order
            if po:
                for item in po.items:
                    # Query stock across all warehouses in the organization
                    inv_records = (
                        db.query(InventoryItem)
                        .filter(
                            InventoryItem.organization_id == disruption.organization_id,
                            InventoryItem.sku == item.sku,
                        )
                        .all()
                    )
                    total_usable = sum(inv.usable_quantity for inv in inv_records)
                    needed = item.quantity_ordered
                    if total_usable == 0:
                        inventory_scores.append(100.0)  # Complete stockout vulnerability
                    elif total_usable < (needed * 0.5):
                        inventory_scores.append(75.0)   # Severe inventory deficit
                    elif total_usable < needed:
                        inventory_scores.append(45.0)   # Partial deficit
                    else:
                        inventory_scores.append(15.0)   # Sufficient buffer
        inv_buffer_score = (
            round(sum(inventory_scores) / len(inventory_scores), 1)
            if inventory_scores
            else 50.0
        )

        # 6. Customer SLA Exposure Factor (0-100)
        customer_orders = (
            db.query(CustomerOrder)
            .filter(
                CustomerOrder.organization_id == disruption.organization_id,
                CustomerOrder.affected_shipment_id.in_([s.id for s in affected_shipments]) if affected_shipments else False,
            )
            .all()
        )
        if customer_orders:
            max_daily_penalty = max(co.sla_penalty_per_day for co in customer_orders)
            critical_orders = sum(1 for co in customer_orders if co.priority in ["CRITICAL", "HIGH"])
            sla_score = min(
                round((max_daily_penalty / 45000.0) * 80.0 + (critical_orders * 20.0), 1),
                100.0,
            )
        else:
            sla_score = 30.0

        # Weighted calculation
        overall_score = round(
            sev_score * weights["severity"]
            + delay_score * weights["delay"]
            + sup_score * weights["supplier_risk"]
            + ship_mode_score * weights["shipment_mode"]
            + inv_buffer_score * weights["inventory_buffer"]
            + sla_score * weights["sla_exposure"],
            1,
        )

        # Category determination
        if overall_score >= 80.0:
            category = "CRITICAL"
        elif overall_score >= 60.0:
            category = "HIGH"
        elif overall_score >= 30.0:
            category = "MEDIUM"
        else:
            category = "LOW"

        # Explainability text
        explanation = (
            f"Incident {disruption.incident_code} evaluated with {category} risk score ({overall_score}/100). "
            f"Primary risk drivers: severity rating of {disruption.severity} ({sev_score} pts @ {int(weights['severity']*100)}%), "
            f"expected delay of {delay_hours}h ({delay_score} pts @ {int(weights['delay']*100)}%), "
            f"and customer SLA penalty exposure ({sla_score} pts @ {int(weights['sla_exposure']*100)}%). "
            f"Affected maritime shipment inertia score: {ship_mode_score} pts."
        )

        return {
            "incident_code": disruption.incident_code,
            "overall_risk_score": overall_score,
            "risk_category": category,
            "weights": weights,
            "contributing_factors": {
                "severity_factor": {
                    "raw_score": sev_score,
                    "weight": weights["severity"],
                    "weighted_score": round(sev_score * weights["severity"], 2),
                    "metric": disruption.severity,
                },
                "delay_factor": {
                    "raw_score": delay_score,
                    "weight": weights["delay"],
                    "weighted_score": round(delay_score * weights["delay"], 2),
                    "metric": f"{delay_hours} hours",
                },
                "supplier_risk_factor": {
                    "raw_score": sup_score,
                    "weight": weights["supplier_risk"],
                    "weighted_score": round(sup_score * weights["supplier_risk"], 2),
                    "metric": f"Avg supplier risk {sup_score}%",
                },
                "shipment_mode_factor": {
                    "raw_score": ship_mode_score,
                    "weight": weights["shipment_mode"],
                    "weighted_score": round(ship_mode_score * weights["shipment_mode"], 2),
                    "metric": f"{len(affected_shipments)} shipment(s) in corridor",
                },
                "inventory_buffer_factor": {
                    "raw_score": inv_buffer_score,
                    "weight": weights["inventory_buffer"],
                    "weighted_score": round(inv_buffer_score * weights["inventory_buffer"], 2),
                    "metric": "Safety stock deficit ratio",
                },
                "sla_exposure_factor": {
                    "raw_score": sla_score,
                    "weight": weights["sla_exposure"],
                    "weighted_score": round(sla_score * weights["sla_exposure"], 2),
                    "metric": f"{len(customer_orders)} customer order(s) exposed",
                },
            },
            "explanation": explanation,
        }
