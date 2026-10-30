import math
import json
import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc, asc

from backend.app.blockchain.database import get_db, OperationalRecoveryPlan
from backend.app.blockchain.hash_service import (
    RecoveryPlanHashService,
    SCHEMA_VERSION_V1,
    SCHEMA_VERSION_V2,
    ZERO_MANIFEST_SENTINEL,
)
from .auth import AuthenticatedOrgUser, get_current_org_user, validate_org_entity
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
)
from .schemas import (
    PaginatedResponse,
    SupplierRead,
    SupplierCreate,
    PurchaseOrderRead,
    PurchaseOrderCreate,
    OrderItemCreate,
    ShipmentRead,
    ShipmentDetailRead,
    ShipmentCheckpointRead,
    WarehouseRead,
    WarehouseCreate,
    InventoryItemRead,
    InventoryItemCreate,
    DisruptionRead,
    DisruptionDetailRead,
    DisruptionShipmentSummary,
    DisruptionRiskRead,
    DisruptionImpactRead,
    RecoveryRecommendationRead,
    SimulationEvaluationRead,
    RecoveryPlanGenerateRequest,
    RecoveryPlanDataContractRead,
)
from .seed_data import seed_supply_chain_data
from .disruption_service import DisruptionIntelligenceService
from .risk_service import DisruptionRiskScoringService
from .impact_service import DisruptionImpactAnalysisService
from .recommendation_service import RecoveryRecommendationService
from .simulation_service import RecoverySimulationService
from .ingestion_service import DisruptionIngestionService

router = APIRouter(prefix="/api/v1", tags=["Supply Chain Operations"])



# ==============================================================================
# 1. SUPPLIERS
# ==============================================================================

@router.get("/supply-chain/suppliers", response_model=PaginatedResponse[SupplierRead])
def get_suppliers(
    search: Optional[str] = Query(None, description="Search by name or code"),
    tier: Optional[str] = Query(None, description="Filter by tier: Tier 1, Tier 2, Tier 3"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: ACTIVE, INACTIVE"),
    sort_by: str = Query("name", description="Sort field: name, reliability_score, risk_score"),
    sort_order: str = Query("asc", description="Sort order: asc, desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = db.query(Supplier).filter(Supplier.organization_id == user.organization_id)

    if search:
        search_fmt = f"%{search.strip()}%"
        query = query.filter(or_(Supplier.name.ilike(search_fmt), Supplier.supplier_code.ilike(search_fmt)))

    if tier:
        query = query.filter(Supplier.tier == tier.strip())

    if status_filter:
        query = query.filter(Supplier.status == status_filter.strip().upper())

    # Sorting
    sort_col = getattr(Supplier, sort_by, Supplier.name)
    query = query.order_by(desc(sort_col) if sort_order.lower() == "desc" else asc(sort_col))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/supply-chain/suppliers/{supplier_id}", response_model=SupplierRead)
def get_supplier_by_id(
    supplier_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    validate_org_entity(supplier, user.organization_id, "Supplier")
    return supplier


@router.post("/supply-chain/suppliers", response_model=SupplierRead, status_code=status.HTTP_201_CREATED)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    existing = db.query(Supplier).filter_by(
        organization_id=user.organization_id, supplier_code=payload.supplier_code
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Supplier code '{payload.supplier_code}' already exists in your organization.",
        )

    supplier = Supplier(organization_id=user.organization_id, **payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


# ==============================================================================
# 2. PURCHASE ORDERS
# ==============================================================================

@router.get("/supply-chain/orders", response_model=PaginatedResponse[PurchaseOrderRead])
def get_purchase_orders(
    supplier_id: Optional[int] = Query(None, description="Filter by supplier ID"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: ISSUED, IN_TRANSIT, DELAYED, FULFILLED"),
    priority: Optional[str] = Query(None, description="Filter by priority: LOW, MEDIUM, HIGH, CRITICAL"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = db.query(PurchaseOrder).filter(PurchaseOrder.organization_id == user.organization_id)

    if supplier_id:
        query = query.filter(PurchaseOrder.supplier_id == supplier_id)

    if status_filter:
        query = query.filter(PurchaseOrder.status == status_filter.strip().upper())

    if priority:
        query = query.filter(PurchaseOrder.priority == priority.strip().upper())

    query = query.order_by(desc(PurchaseOrder.created_at))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/supply-chain/orders/{order_id}", response_model=PurchaseOrderRead)
def get_purchase_order_by_id(
    order_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    order = db.query(PurchaseOrder).filter(PurchaseOrder.id == order_id).first()
    validate_org_entity(order, user.organization_id, "Purchase Order")
    return order


@router.post("/supply-chain/orders", response_model=PurchaseOrderRead, status_code=status.HTTP_201_CREATED)
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    # Cross-tenant validation: ensure supplier belongs to this organization
    supplier = db.query(Supplier).filter(Supplier.id == payload.supplier_id).first()
    validate_org_entity(supplier, user.organization_id, "Supplier")

    existing = db.query(PurchaseOrder).filter_by(
        organization_id=user.organization_id, po_number=payload.po_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"PO number '{payload.po_number}' already exists in your organization.",
        )

    order_data = payload.model_dump()
    items_data = order_data.pop("items", [])

    order = PurchaseOrder(organization_id=user.organization_id, **order_data)
    db.add(order)
    db.flush()

    for item_data in items_data:
        item = OrderItem(purchase_order_id=order.id, **item_data)
        db.add(item)

    db.commit()
    db.refresh(order)
    return order


# ==============================================================================
# 3. SHIPMENTS
# ==============================================================================

@router.get("/supply-chain/shipments", response_model=PaginatedResponse[ShipmentRead])
def get_shipments(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status: IN_TRANSIT, DELAYED, DELIVERED"),
    transport_mode: Optional[str] = Query(None, description="SEA_FREIGHT, AIR_FREIGHT, ROAD_FREIGHT"),
    delayed_only: bool = Query(False, description="Filter only shipments with delay_hours > 0"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = db.query(Shipment).filter(Shipment.organization_id == user.organization_id)

    if status_filter:
        query = query.filter(Shipment.status == status_filter.strip().upper())

    if transport_mode:
        query = query.filter(Shipment.transport_mode == transport_mode.strip().upper())

    if delayed_only:
        query = query.filter(Shipment.delay_hours > 0)

    query = query.order_by(desc(Shipment.created_at))

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/supply-chain/shipments/{shipment_id}", response_model=ShipmentDetailRead)
def get_shipment_by_id(
    shipment_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    shipment = db.query(Shipment).filter(Shipment.id == shipment_id).first()
    validate_org_entity(shipment, user.organization_id, "Shipment")
    return shipment


# ==============================================================================
# 4. WAREHOUSES & INVENTORY
# ==============================================================================

@router.get("/supply-chain/warehouses", response_model=List[WarehouseRead])
def get_warehouses(
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    warehouses = db.query(Warehouse).filter(
        Warehouse.organization_id == user.organization_id
    ).order_by(Warehouse.warehouse_name).all()
    return warehouses


@router.get("/supply-chain/inventory", response_model=PaginatedResponse[InventoryItemRead])
def get_inventory(
    warehouse_id: Optional[int] = Query(None, description="Filter by warehouse ID"),
    sku: Optional[str] = Query(None, description="Filter by product SKU"),
    is_critical: Optional[bool] = Query(None, description="Filter by critical component flag"),
    category: Optional[str] = Query(None, description="Filter by component category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = db.query(InventoryItem).filter(InventoryItem.organization_id == user.organization_id)

    if warehouse_id:
        query = query.filter(InventoryItem.warehouse_id == warehouse_id)

    if sku:
        query = query.filter(InventoryItem.sku.ilike(f"%{sku.strip()}%"))

    if is_critical is not None:
        query = query.filter(InventoryItem.is_critical == is_critical)

    if category:
        query = query.filter(InventoryItem.category == category.strip().upper())

    query = query.order_by(InventoryItem.sku)

    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/supply-chain/inventory/{inventory_id}", response_model=InventoryItemRead)
def get_inventory_item_by_id(
    inventory_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    item = db.query(InventoryItem).filter(InventoryItem.id == inventory_id).first()
    validate_org_entity(item, user.organization_id, "Inventory item")
    return item


# ==============================================================================
# 5. DISRUPTIONS
# ==============================================================================

@router.get("/disruptions/active", response_model=List[DisruptionRead])
def get_active_disruptions(
    severity: Optional[str] = Query(None, description="LOW, MEDIUM, HIGH, CRITICAL"),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = db.query(Disruption).filter(
        Disruption.organization_id == user.organization_id,
        Disruption.status.in_(["ACTIVE", "INVESTIGATING", "MONITORING"]),
    )

    if severity:
        query = query.filter(Disruption.severity == severity.strip().upper())

    query = query.order_by(desc(Disruption.severity), desc(Disruption.start_time))
    disruptions = query.all()

    results = []
    for d in disruptions:
        d_dict = DisruptionRead.model_validate(d)
        d_dict.affected_shipments_count = len(d.shipment_associations)
        results.append(d_dict)

    return results


@router.get("/disruptions/{disruption_id}", response_model=DisruptionDetailRead)
def get_disruption_by_id(
    disruption_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    validate_org_entity(disruption, user.organization_id, "Disruption incident")

    detail = DisruptionDetailRead.model_validate(disruption)
    detail.affected_shipments_count = len(disruption.shipment_associations)

    affected = []
    for assoc in disruption.shipment_associations:
        shp = assoc.shipment
        if shp:
            affected.append(
                DisruptionShipmentSummary(
                    shipment_id=shp.id,
                    tracking_number=shp.tracking_number,
                    carrier=shp.carrier,
                    origin=shp.origin,
                    destination=shp.destination,
                    delay_hours=shp.delay_hours,
                    status=shp.status,
                    impact_summary=assoc.impact_summary,
                )
            )

    detail.affected_shipments = affected
    return detail


# ==============================================================================
# 6. SEED / DEMO INITIALIZATION
# ==============================================================================

@router.post("/supply-chain/seed", status_code=status.HTTP_200_OK)
def trigger_seed_dataset(
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """
    Idempotently seeds or refreshes realistic supply chain demonstration data.
    """
    results = seed_supply_chain_data(db, organization_id=user.organization_id)
    return {
        "status": "SUCCESS",
        "organization_id": user.organization_id,
        "message": "Realistic supply chain dataset verified and populated idempotently.",
        "records_created": results,
    }


# ==============================================================================
# 7. AI DISRUPTION RISK SCORING
# ==============================================================================

@router.get("/disruptions/{disruption_id}/risk", response_model=DisruptionRiskRead)
def get_disruption_risk(
    disruption_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    validate_org_entity(disruption, user.organization_id, "Disruption incident")

    # Correlate any newly matching shipments first
    DisruptionIntelligenceService.correlate_affected_shipments(db, disruption)

    risk_result = DisruptionRiskScoringService.calculate_disruption_risk(db, disruption)
    return risk_result


# ==============================================================================
# 8. IMPACT DEPENDENCY ANALYSIS
# ==============================================================================

@router.post("/disruptions/{disruption_id}/simulate-impact", response_model=DisruptionImpactRead)
@router.get("/disruptions/{disruption_id}/impact", response_model=DisruptionImpactRead)
def get_disruption_impact(
    disruption_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    validate_org_entity(disruption, user.organization_id, "Disruption incident")

    DisruptionIntelligenceService.correlate_affected_shipments(db, disruption)
    impact_report = DisruptionImpactAnalysisService.analyze_disruption_impact(db, disruption)
    return impact_report


# ==============================================================================
# 9. RECOVERY RECOMMENDATION ENGINE
# ==============================================================================

@router.post("/disruptions/{disruption_id}/recommend-actions", response_model=List[RecoveryRecommendationRead])
def get_recovery_recommendations(
    disruption_id: int,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    disruption = db.query(Disruption).filter(Disruption.id == disruption_id).first()
    validate_org_entity(disruption, user.organization_id, "Disruption incident")

    DisruptionIntelligenceService.correlate_affected_shipments(db, disruption)
    recommendations = RecoveryRecommendationService.generate_recommendations(db, disruption)
    return recommendations


# ==============================================================================
# 10. RECOVERY SIMULATION & OPTIMIZATION
# ==============================================================================

class EvaluateSimulationRequest(BaseModel):
    disruption_id: int
    custom_candidates: Optional[List[Dict[str, Any]]] = None


@router.post("/simulation/evaluate", response_model=SimulationEvaluationRead)
def evaluate_recovery_simulation(
    payload: EvaluateSimulationRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    disruption = db.query(Disruption).filter(Disruption.id == payload.disruption_id).first()
    validate_org_entity(disruption, user.organization_id, "Disruption incident")

    DisruptionIntelligenceService.correlate_affected_shipments(db, disruption)
    simulation_results = RecoverySimulationService.evaluate_and_simulate(
        db, disruption, candidate_recommendations=payload.custom_candidates
    )
    return simulation_results


@router.get("/simulation/{simulation_id}", response_model=SimulationEvaluationRead)
def get_simulation_by_id(
    simulation_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    record = RecoverySimulationService.get_simulation_by_id(
        db, simulation_id=simulation_id, organization_id=user.organization_id
    )
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Simulation '{simulation_id}' not found.",
        )
    return record


# ==============================================================================
# 11. RECOVERY PLAN GENERATION & DATA CONTRACT
# ==============================================================================

@router.post("/recovery-plans/generate", response_model=RecoveryPlanDataContractRead, status_code=status.HTTP_201_CREATED)
def generate_recovery_plan(
    payload: RecoveryPlanGenerateRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    disruption = db.query(Disruption).filter(Disruption.id == payload.incident_id).first()
    validate_org_entity(disruption, user.organization_id, "Disruption incident")

    # Generate recommendations & simulation to ground the plan in verified data
    recs = RecoveryRecommendationService.generate_recommendations(db, disruption)
    selected_rec = next((r for r in recs if r["recommendation_id"] == payload.recommendation_id), None)
    if not selected_rec:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recommendation '{payload.recommendation_id}' not found for incident {disruption.incident_code}.",
        )

    sim_eval = RecoverySimulationService.evaluate_and_simulate(db, disruption, [selected_rec])
    simulated_plan = sim_eval["candidate_plans"][0]
    risk_info = DisruptionRiskScoringService.calculate_disruption_risk(db, disruption)

    # Resolve evidence manifest for disruption with tenant boundary validation
    manifest_info = DisruptionIngestionService.resolve_evidence_manifest_for_disruption(
        db=db,
        disruption=disruption,
        organization_id=user.organization_id,
        explicit_event_id=payload.event_id,
    )

    plan_id = payload.plan_id or f"RCP-{disruption.incident_code}-{selected_rec['action_type'][:3]}"
    
    # Determine version
    latest_op = (
        db.query(OperationalRecoveryPlan)
        .filter_by(organization_id=user.organization_id, plan_id=plan_id)
        .order_by(desc(OperationalRecoveryPlan.version))
        .first()
    )
    next_version = (latest_op.version + 1) if latest_op else 1
    now_iso = datetime.datetime.utcnow().isoformat()

    # Recovery action structured entries
    action_item = {
        "action_type": selected_rec["action_type"],
        "source_warehouse": None,
        "destination_warehouse": None,
        "product_reference": None,
        "quantity": 1.0,
        "supplier_reference": None,
        "estimated_cost": selected_rec["estimated_cost_usd"],
        "currency": "USD",
        "constraints": {"disruption_code": disruption.incident_code},
    }

    plan_dict = {
        "schema_version": SCHEMA_VERSION_V2,
        "plan_id": plan_id,
        "version": next_version,
        "organization_id": user.organization_id,
        "disruption_id": disruption.incident_code,
        "incident_id": disruption.incident_code,
        "action_categories": [selected_rec["action_mask"]],
        "action_mask": selected_rec["action_mask"],
        "proposed_actions": [selected_rec["proposed_action"]],
        "recovery_actions": [action_item],
        "affected_shipments": selected_rec["affected_shipments"],
        "affected_purchase_orders": [s.shipment.purchase_order.po_number for s in disruption.shipment_associations if s.shipment and s.shipment.purchase_order],
        "affected_customer_orders": selected_rec["affected_orders"],
        "estimated_recovery_time": selected_rec["estimated_recovery_time_hours"],
        "estimated_total_cost": selected_rec["estimated_cost_usd"],
        "recovery_cost": selected_rec["estimated_cost_usd"],
        "currency": "USD",
        "simulation_hash": sim_eval.get("simulation_hash"),
        "simulation_results": simulated_plan,
        "evidence_manifest_id": manifest_info.get("manifest_id"),
        "evidence_manifest_hash": manifest_info.get("manifest_root_hash"),
        "risk_score": risk_info["overall_risk_score"],
        "assumptions": selected_rec["assumptions"],
        "status": "DRAFT",
        "creation_timestamp": now_iso,
    }

    # Generate RFC 8785 canonical hash with v2 schema
    canonical_json, canonical_hash = RecoveryPlanHashService.generate_plan_hash(
        plan_dict, schema_version=SCHEMA_VERSION_V2
    )
    plan_dict["canonical_plan_hash"] = canonical_hash

    # Save to authoritative operational store (never anchored on-chain automatically)
    operational_plan = OperationalRecoveryPlan(
        plan_id=plan_id,
        version=next_version,
        organization_id=user.organization_id,
        canonical_schema_version=SCHEMA_VERSION_V2,
        disruption_id=disruption.incident_code,
        evidence_manifest_id=manifest_info.get("manifest_id"),
        evidence_manifest_hash=manifest_info.get("manifest_root_hash"),
        canonical_plan_hash=canonical_hash,
        is_anchored=False,
        plan_data_json=json.dumps(plan_dict),
    )
    db.add(operational_plan)
    db.commit()

    return plan_dict


@router.get("/recovery-plans", response_model=PaginatedResponse[RecoveryPlanDataContractRead])
def get_recovery_plans(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = (
        db.query(OperationalRecoveryPlan)
        .filter(OperationalRecoveryPlan.organization_id == user.organization_id)
        .order_by(desc(OperationalRecoveryPlan.created_at))
    )
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    records = query.offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for r in records:
        try:
            data = json.loads(r.plan_data_json)
            schema_ver = r.canonical_schema_version or data.get("schema_version") or SCHEMA_VERSION_V1
            data["schema_version"] = schema_ver
            data["evidence_manifest_id"] = r.evidence_manifest_id or data.get("evidence_manifest_id")
            data["evidence_manifest_hash"] = r.evidence_manifest_hash or data.get("evidence_manifest_hash")
            # Ensure required schema fields exist
            if "canonical_plan_hash" not in data or not data["canonical_plan_hash"]:
                _, chash = RecoveryPlanHashService.generate_plan_hash(data, schema_version=schema_ver)
                data["canonical_plan_hash"] = chash
            items.append(data)
        except Exception:
            continue

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/recovery-plans/{plan_id}", response_model=RecoveryPlanDataContractRead)
def get_recovery_plan_by_id(
    plan_id: str,
    version: Optional[int] = Query(None, description="Specific version; defaults to latest"),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    query = db.query(OperationalRecoveryPlan).filter(
        OperationalRecoveryPlan.organization_id == user.organization_id,
        OperationalRecoveryPlan.plan_id == plan_id,
    )
    if version is not None:
        query = query.filter(OperationalRecoveryPlan.version == version)
    else:
        query = query.order_by(desc(OperationalRecoveryPlan.version))

    record = query.first()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Recovery plan '{plan_id}' not found.",
        )

    data = json.loads(record.plan_data_json)
    schema_ver = record.canonical_schema_version or data.get("schema_version") or SCHEMA_VERSION_V1
    data["schema_version"] = schema_ver
    data["evidence_manifest_id"] = record.evidence_manifest_id or data.get("evidence_manifest_id")
    data["evidence_manifest_hash"] = record.evidence_manifest_hash or data.get("evidence_manifest_hash")
    if "canonical_plan_hash" not in data or not data["canonical_plan_hash"]:
        _, chash = RecoveryPlanHashService.generate_plan_hash(data, schema_version=schema_ver)
        data["canonical_plan_hash"] = chash
    return data


# ==============================================================================
# 11. EXTERNAL DISRUPTION INTELLIGENCE & INGESTION (Phase 5)
# ==============================================================================

from .models import (
    IntelligenceSource,
    ExternalDisruptionEvent,
    EventEvidence,
    EventCorrelation,
    EventReview,
    IngestionRun,
)
from .schemas import (
    IntelligenceSourceRead,
    ExternalDisruptionEventRead,
    IngestionRunRead,
    ManualEventIngestRequest,
    ReviewEventActionRequest,
    EventIntegrityVerificationRead,
    SupplierWebhookPayload,
)
from .ingestion_service import DisruptionIngestionService
from .connectors import (
    NormalizedExternalEvent,
    verify_supplier_webhook_signature,
    sanitize_untrusted_text,
)
from fastapi import Request


@router.get("/intelligence/sources", response_model=List[IntelligenceSourceRead])
def get_intelligence_sources(
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Lists configured external intelligence connectors with live/demo status and telemetry."""
    DisruptionIngestionService.initialize_sources(db)
    sources = db.query(IntelligenceSource).all()
    return sources


@router.post("/intelligence/ingest/run")
def trigger_ingestion_run(
    source_id: Optional[str] = Query(None, description="Optional specific source ID"),
    force_demo: bool = Query(False, description="Explicitly force demonstration/synthetic mode"),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Triggers an intelligence ingestion cycle for external providers with strict mode separation."""
    # Ensure user has analyst or manager permissions
    user_roles = [r.lower() for r in (user.roles or [])]
    if not any(r in ["operations_analyst", "supply_chain_manager", "admin"] for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Operations Analysts or Supply Chain Managers can trigger ingestion runs.",
        )

    results = DisruptionIngestionService.run_ingestion_cycle(
        db=db,
        organization_id=user.organization_id,
        source_id=source_id,
        force_demo=force_demo,
    )
    return {"status": "COMPLETED", "runs": results}


@router.post("/intelligence/ingest/manual", response_model=ExternalDisruptionEventRead)
def submit_manual_intelligence_report(
    payload: ManualEventIngestRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Allows an authorized analyst to manually register a verified field intelligence report."""
    user_roles = [r.lower() for r in (user.roles or [])]
    if not any(r in ["operations_analyst", "supply_chain_manager", "admin"] for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Operations Analysts or Supply Chain Managers can submit manual intelligence reports.",
        )

    now = datetime.datetime.utcnow()
    norm_event = NormalizedExternalEvent(
        source_id="SRC-MANUAL-ANALYST",
        source_type="MANUAL_REPORT",
        provider_name=f"Manual Submission by {user.user_id}",
        mode="MANUAL",
        external_event_id=f"MANUAL-{int(now.timestamp())}",
        title=payload.title,
        description=payload.description,
        category=payload.category,
        severity=payload.severity,
        geographic_region=payload.geographic_region,
        latitude=payload.latitude,
        longitude=payload.longitude,
        affected_corridor=payload.affected_corridor,
        event_timestamp=now,
        source_url=payload.source_url,
        source_reliability_score=0.95,
        raw_payload_preview=json.dumps({"submitted_by": user.user_id, "wallet": user.wallet_address}),
        evidence_items=[{"type": "FIELD_REPORT", "summary": payload.evidence_summary or payload.title}],
    )

    db_event, _ = DisruptionIngestionService.process_incoming_event(db, norm_event, user.organization_id)
    return db_event


@router.post("/intelligence/webhook/supplier", status_code=status.HTTP_201_CREATED)
async def ingest_supplier_webhook(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Ingests automated supplier status notifications and EDI alerts.
    Validates HMAC-SHA256 signature and enforces a strict 1MB payload limit.
    """
    raw_body = await request.body()
    if len(raw_body) > 1024 * 1024:  # 1MB limit
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Webhook payload exceeds maximum permitted limit of 1MB.",
        )

    signature = request.headers.get("X-TrustChain-Signature")
    if not verify_supplier_webhook_signature(raw_body, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-TrustChain-Signature for supplier webhook.",
        )

    try:
        data = json.loads(raw_body.decode("utf-8"))
        payload = SupplierWebhookPayload(**data)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Malformed supplier webhook payload: {str(e)}",
        )

    now = datetime.datetime.utcnow()
    norm_event = NormalizedExternalEvent(
        source_id="SRC-SUPPLIER-EDI",
        source_type="SUPPLIER_TELEMETRY",
        provider_name=f"Supplier Webhook [{payload.supplier_code}]",
        mode="LIVE",
        external_event_id=f"EDI-{payload.supplier_code}-{int(now.timestamp())}",
        title=f"Supplier {payload.supplier_code} Facility Incident: {payload.incident_type}",
        description=payload.description,
        category="SUPPLIER_INSOLVENCY" if "INSOLVENCY" in payload.incident_type else "SUPPLIER_TELEMETRY",
        severity=payload.severity,
        geographic_region=payload.geographic_region or "Supplier Operations Zone",
        event_timestamp=now,
        source_reliability_score=0.98,
        raw_payload_preview=raw_body.decode("utf-8")[:500],
        evidence_items=[
            {
                "type": "SUPPLIER_EDI_NOTICE",
                "summary": f"Facility: {payload.affected_facility}; Downtime: {payload.downtime_hours}h; Components: {', '.join(payload.affected_components)}",
            }
        ],
    )

    db_event, is_dup = DisruptionIngestionService.process_incoming_event(db, norm_event, "ORG-APEX-GLOBAL")
    return {
        "status": "INGESTED",
        "event_id": db_event.event_id,
        "is_duplicate": is_dup,
        "validation_status": db_event.validation_status,
    }


@router.get("/intelligence/events", response_model=PaginatedResponse[ExternalDisruptionEventRead])
def get_external_events(
    status_filter: Optional[str] = Query(None, alias="status", description="VALIDATED, PENDING_REVIEW, REJECTED, DUPLICATE, CONFIRMED_AS_DISRUPTION"),
    category: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    mode: Optional[str] = Query(None, description="LIVE, DEMO, MANUAL"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Retrieves paginated external disruption intelligence events with provenance metadata."""
    query = db.query(ExternalDisruptionEvent)

    if status_filter:
        query = query.filter(ExternalDisruptionEvent.validation_status == status_filter.strip().upper())
    if category:
        query = query.filter(ExternalDisruptionEvent.category == category.strip().upper())
    if severity:
        query = query.filter(ExternalDisruptionEvent.severity == severity.strip().upper())
    if mode:
        query = query.filter(ExternalDisruptionEvent.mode == mode.strip().upper())

    query = query.order_by(desc(ExternalDisruptionEvent.event_timestamp))
    total = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items = query.offset((page - 1) * page_size).limit(page_size).all()

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/intelligence/events/{event_id}", response_model=ExternalDisruptionEventRead)
def get_external_event_by_id(
    event_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Retrieves an external disruption event by its ID with full evidence and supply-chain correlation links."""
    event = db.query(ExternalDisruptionEvent).filter_by(event_id=event_id).first()
    if not event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"External intelligence event '{event_id}' not found.",
        )
    return event


@router.get("/intelligence/events/{event_id}/integrity", response_model=EventIntegrityVerificationRead)
def verify_event_evidence_integrity(
    event_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """
    Verifies cryptographic integrity of an external event and all its evidence records.
    Detects tampering, summary alterations, or deleted evidence references.
    """
    result = DisruptionIngestionService.verify_event_integrity(db, event_id, user.organization_id)
    if result.get("status") == "EVENT_NOT_FOUND":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"External intelligence event '{event_id}' not found.",
        )
    return result


@router.post("/intelligence/events/{event_id}/confirm", response_model=DisruptionRead)
def confirm_intelligence_event(
    event_id: str,
    payload: ReviewEventActionRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """
    Authorizes transition of a validated external event into an Operational Disruption.
    Enforces role check, idempotency, and human review before risk scoring is triggered.
    """
    user_roles = [r.lower() for r in (user.roles or [])]
    if not any(r in ["operations_analyst", "supply_chain_manager", "admin"] for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Operations Analysts or Supply Chain Managers can confirm disruption events.",
        )

    try:
        disruption = DisruptionIngestionService.confirm_event_as_disruption(
            db=db,
            event_id=event_id,
            user_id=user.user_id,
            organization_id=user.organization_id,
            notes=payload.notes,
            reviewer_wallet=user.wallet_address,
        )
        return disruption
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/intelligence/events/{event_id}/reject", response_model=ExternalDisruptionEventRead)
def reject_intelligence_event(
    event_id: str,
    payload: ReviewEventActionRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Rejects an external event as false alarm with full review audit history."""
    user_roles = [r.lower() for r in (user.roles or [])]
    if not any(r in ["operations_analyst", "supply_chain_manager", "admin"] for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Operations Analysts or Supply Chain Managers can reject disruption events.",
        )

    try:
        updated = DisruptionIngestionService.reject_event(
            db=db,
            event_id=event_id,
            user_id=user.user_id,
            organization_id=user.organization_id,
            notes=payload.notes,
            reviewer_wallet=user.wallet_address,
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/intelligence/events/{event_id}/link", response_model=ExternalDisruptionEventRead)
def link_intelligence_event(
    event_id: str,
    payload: ReviewEventActionRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Links an external event to an existing active disruption incident."""
    user_roles = [r.lower() for r in (user.roles or [])]
    if not any(r in ["operations_analyst", "supply_chain_manager", "admin"] for r in user_roles):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Operations Analysts or Supply Chain Managers can link disruption events.",
        )

    if not payload.target_disruption_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="target_disruption_id is required to link an event.",
        )
    try:
        updated = DisruptionIngestionService.merge_or_link_event(
            db=db,
            event_id=event_id,
            target_disruption_id=payload.target_disruption_id,
            user_id=user.user_id,
            organization_id=user.organization_id,
            notes=payload.notes,
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/intelligence/ingestion/status", response_model=List[IngestionRunRead])
def get_ingestion_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: AuthenticatedOrgUser = Depends(get_current_org_user),
):
    """Retrieves chronological ingestion run logs with execution durations and errors."""
    runs = db.query(IngestionRun).order_by(desc(IngestionRun.started_at)).limit(limit).all()
    return runs


