import datetime
from typing import Dict, Any, List, Set
from sqlalchemy.orm import Session
from .models import (
    Disruption,
    Shipment,
    PurchaseOrder,
    OrderItem,
    Supplier,
    CustomerOrder,
    InventoryItem,
    Warehouse,
)


class DisruptionImpactAnalysisService:
    """
    Multi-Tier Supply Chain Impact Dependency Analysis Engine.
    Traverses the operational graph:
    Disruption -> Shipment -> Purchase Order -> Supplier -> SKUs -> Customer Orders -> SLA Deadline.
    Prevents double-counting of customer order penalties and maps inventory buffer gaps.
    """

    @classmethod
    def analyze_disruption_impact(
        cls,
        db: Session,
        disruption: Disruption,
    ) -> Dict[str, Any]:
        now = datetime.datetime.utcnow()

        # Step 1: Disruption -> Shipments
        affected_shipments: List[Shipment] = [
            assoc.shipment for assoc in disruption.shipment_associations if assoc.shipment
        ]

        shipment_summaries = []
        po_ids: Set[int] = set()
        for shp in affected_shipments:
            shipment_summaries.append({
                "shipment_id": shp.id,
                "tracking_number": shp.tracking_number,
                "carrier": shp.carrier,
                "origin": shp.origin,
                "destination": shp.destination,
                "current_location": shp.current_location,
                "delay_hours": shp.delay_hours,
                "status": shp.status,
                "transport_mode": shp.transport_mode,
            })
            if shp.purchase_order_id:
                po_ids.add(shp.purchase_order_id)

        # Step 2: Shipments -> Purchase Orders
        purchase_orders = (
            db.query(PurchaseOrder)
            .filter(PurchaseOrder.id.in_(po_ids))
            .all()
            if po_ids
            else []
        )

        po_summaries = []
        supplier_ids: Set[int] = set()
        affected_skus: Set[str] = set()
        total_po_value = 0.0

        for po in purchase_orders:
            po_summaries.append({
                "po_id": po.id,
                "po_number": po.po_number,
                "supplier_name": po.supplier.name if po.supplier else "Unknown",
                "total_value": po.total_value,
                "currency": po.currency,
                "status": po.status,
                "priority": po.priority,
                "expected_delivery": po.expected_delivery_date.isoformat(),
                "items_count": len(po.items),
            })
            total_po_value += po.total_value
            if po.supplier_id:
                supplier_ids.add(po.supplier_id)
            for item in po.items:
                affected_skus.add(item.sku)

        # Step 3: Purchase Orders -> Suppliers (Concentration Analysis)
        suppliers = (
            db.query(Supplier)
            .filter(Supplier.id.in_(supplier_ids))
            .all()
            if supplier_ids
            else []
        )
        supplier_concentration = []
        for sup in suppliers:
            sup_pos = [p for p in purchase_orders if p.supplier_id == sup.id]
            exposure = sum(p.total_value for p in sup_pos)
            supplier_concentration.append({
                "supplier_id": sup.id,
                "supplier_code": sup.supplier_code,
                "supplier_name": sup.name,
                "country": sup.country,
                "reliability_score": sup.reliability_score,
                "risk_score": sup.risk_score,
                "associated_pos_count": len(sup_pos),
                "financial_exposure_usd": exposure,
            })

        # Step 4: SKUs -> Inventory & Warehouse Deficit Analysis
        inventory_shortages = []
        for sku in affected_skus:
            inv_items = (
                db.query(InventoryItem)
                .filter(
                    InventoryItem.organization_id == disruption.organization_id,
                    InventoryItem.sku == sku,
                )
                .all()
            )
            total_on_hand = sum(item.available_quantity for item in inv_items)
            total_reserved = sum(item.reserved_quantity for item in inv_items)
            total_safety = sum(item.safety_stock for item in inv_items)
            total_usable = max(0, total_on_hand - total_reserved)

            # Demand in transit
            transit_demand = sum(
                item.quantity_ordered
                for po in purchase_orders
                for item in po.items
                if item.sku == sku
            )

            is_deficit = total_usable < total_safety
            deficit_amount = max(0, total_safety - total_usable)

            # Check alternative warehouses
            wh_breakdown = [
                {
                    "warehouse_code": item.warehouse.warehouse_code if item.warehouse else "N/A",
                    "warehouse_name": item.warehouse.warehouse_name if item.warehouse else "N/A",
                    "location": item.warehouse.location if item.warehouse else "N/A",
                    "available": item.available_quantity,
                    "reserved": item.reserved_quantity,
                    "usable": item.usable_quantity,
                    "safety_stock": item.safety_stock,
                }
                for item in inv_items
            ]

            inventory_shortages.append({
                "sku": sku,
                "product_name": inv_items[0].product_name if inv_items else sku,
                "total_on_hand": total_on_hand,
                "total_reserved": total_reserved,
                "total_usable": total_usable,
                "safety_stock_threshold": total_safety,
                "transit_demand": transit_demand,
                "is_deficit": is_deficit,
                "deficit_quantity": deficit_amount,
                "warehouse_breakdown": wh_breakdown,
            })

        # Step 5: Downstream Customer Orders (SLA & Financial Penalty Exposure)
        # Query customer orders linked directly to affected shipments
        shipment_ids = [s.id for s in affected_shipments]
        customer_orders = (
            db.query(CustomerOrder)
            .filter(
                CustomerOrder.organization_id == disruption.organization_id,
                CustomerOrder.affected_shipment_id.in_(shipment_ids) if shipment_ids else False,
            )
            .all()
        )

        customer_order_impacts = []
        total_sla_exposure = 0.0
        seen_order_ids: Set[int] = set()

        for co in customer_orders:
            # Enforce single-counting: each customer order evaluated once
            if co.id in seen_order_ids:
                continue
            seen_order_ids.add(co.id)

            # Find delay on associated shipment
            rel_shipment = next((s for s in affected_shipments if s.id == co.affected_shipment_id), None)
            delay_h = rel_shipment.delay_hours if rel_shipment else disruption.estimated_delay_hours

            # Calculate deadline breach
            expected_delivery = now + datetime.timedelta(hours=delay_h)
            is_breached = expected_delivery > co.sla_deadline
            hours_overdue = 0
            penalty_amount = 0.0

            if is_breached:
                overdue_seconds = (expected_delivery - co.sla_deadline).total_seconds()
                hours_overdue = max(0, int(overdue_seconds // 3600))
                # Apply penalty for days past deadline (pro-rated per day or fractional)
                days_overdue = hours_overdue / 24.0
                penalty_amount = round(days_overdue * co.sla_penalty_per_day, 2)

            total_sla_exposure += penalty_amount

            # Inventory coverage percentage for this order
            order_sku_coverage = []
            for line in co.lines:
                sku_inv = next((inv for inv in inventory_shortages if inv["sku"] == line.sku), None)
                if sku_inv and sku_inv["total_usable"] >= line.quantity:
                    order_sku_coverage.append(1.0)
                elif sku_inv and sku_inv["total_usable"] > 0:
                    order_sku_coverage.append(sku_inv["total_usable"] / line.quantity)
                else:
                    order_sku_coverage.append(0.0)

            avg_coverage = round((sum(order_sku_coverage) / len(order_sku_coverage)) * 100.0, 1) if order_sku_coverage else 0.0

            customer_order_impacts.append({
                "customer_order_id": co.id,
                "order_number": co.order_number,
                "customer_name": co.customer_name,
                "priority": co.priority,
                "sla_deadline": co.sla_deadline.isoformat(),
                "projected_delivery": expected_delivery.isoformat(),
                "delay_hours": delay_h,
                "is_sla_breached": is_breached,
                "hours_past_deadline": hours_overdue,
                "daily_penalty_rate_usd": co.sla_penalty_per_day,
                "sla_penalty_exposure_usd": penalty_amount,
                "inventory_coverage_pct": avg_coverage,
                "affected_skus": [line.sku for line in co.lines],
            })

        # Calculate total financial exposure (Penalty exposure + disruption direct estimated exposure)
        total_financial_exposure = round(total_sla_exposure, 2)
        if total_financial_exposure == 0.0 and disruption.financial_exposure > 0:
            total_financial_exposure = disruption.financial_exposure

        # Construct dependency chain trace
        chain_trace = [
            f"1. Disruption [{disruption.incident_code}] detected in {disruption.geographic_region} with {disruption.estimated_delay_hours}h estimated delay.",
            f"2. {len(affected_shipments)} active shipment(s) intercepted in corridor ({', '.join(s.tracking_number for s in affected_shipments)}).",
            f"3. Linked {len(purchase_orders)} upstream purchase order(s) totaling ${total_po_value:,.2f} USD.",
            f"4. Sourced from {len(suppliers)} critical component supplier(s).",
            f"5. Analyzed {len(affected_skus)} SKU inventory buffers; detected {sum(1 for i in inventory_shortages if i['is_deficit'])} component deficit(s).",
            f"6. Identified {len(customer_orders)} downstream customer order(s) exposed to SLA penalty.",
            f"7. Total non-duplicative financial SLA exposure computed at ${total_financial_exposure:,.2f} USD.",
        ]

        return {
            "disruption_id": disruption.id,
            "incident_code": disruption.incident_code,
            "category": disruption.category,
            "severity": disruption.severity,
            "geographic_region": disruption.geographic_region,
            "total_affected_shipments": len(affected_shipments),
            "total_affected_purchase_orders": len(purchase_orders),
            "total_affected_suppliers": len(suppliers),
            "total_affected_customer_orders": len(customer_orders),
            "total_po_value_usd": total_po_value,
            "total_financial_exposure_usd": total_financial_exposure,
            "affected_shipments": shipment_summaries,
            "affected_purchase_orders": po_summaries,
            "supplier_concentration": supplier_concentration,
            "inventory_shortages": inventory_shortages,
            "customer_order_impacts": customer_order_impacts,
            "chain_trace": chain_trace,
        }
