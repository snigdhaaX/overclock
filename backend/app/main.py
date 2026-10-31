import os
import logging
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Header, status, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from .blockchain.routes import router as blockchain_router
from .blockchain.database import init_db, SessionLocal, get_db, OperationalRecoveryPlan
from .supply_chain.routes import router as supply_chain_router
from .supply_chain import models as _supply_chain_models  # Ensure models are registered on Base
from .supply_chain.seed_data import seed_supply_chain_data

logger = logging.getLogger("trustchain")

app = FastAPI(
    title="TRUSTCHAIN Disruption Recovery & Blockchain Governance API",
    description="Unified API for supply chain disruption intelligence, recovery optimization, and Polygon Amoy blockchain verification.",
    version="1.1.0",
)

# Explicit trusted origins for CORS (resolves security vulnerability with allow_credentials=True)
DEFAULT_CORS_ORIGINS = (
    "http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:5173,"
    "http://127.0.0.1:3000,http://127.0.0.1:8081,http://127.0.0.1:5173,"
    "http://172.31.98.170:8081,http://172.31.98.170:19006,http://172.31.98.170:8000,"
    "http://172.31.98.170:3000,http://172.31.98.170:5173,http://10.0.2.2:8081"
)
CORS_ORIGINS_STR = os.getenv("CORS_ALLOWED_ORIGINS", DEFAULT_CORS_ORIGINS)
CORS_ORIGINS = [orig.strip() for orig in CORS_ORIGINS_STR.split(",") if orig.strip()]

if "*" in CORS_ORIGINS and os.getenv("ENVIRONMENT", "development").lower() == "production":
    raise ValueError("Wildcard CORS origin '*' is strictly prohibited in production when allow_credentials=True.")

is_dev = os.getenv("ENVIRONMENT", "development").lower() != "production"

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=(
        r"^https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$"
        if is_dev
        else None
    ),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(blockchain_router)
app.include_router(supply_chain_router)

# --- API v1 Gateway Router ---
v1_router = APIRouter(prefix="/api/v1", tags=["API v1"])

class PlanSubmission(BaseModel):
    planId: str

class ApprovalDecision(BaseModel):
    planId: str
    actor: str
    role: str
    comments: Optional[str] = None
    reason: Optional[str] = None

class RevisionRequest(BaseModel):
    planId: str
    actor: str
    changeRequirements: str

SUPPLIERS_DB: List[Dict[str, Any]] = [
    {
        "id": "SUP-01",
        "name": "Global Silicon Fab Ltd",
        "category": "Raw Silicon Wafers & ICs",
        "tier": 1,
        "location": "Chennai High-Tech SEZ, Tamil Nadu",
        "status": "At Risk",
        "riskScore": 78,
        "deliveryPerformance": 88.5,
        "on_time_rate": 88.5,
        "activeDisruptions": 1,
        "spendYTD": "$1.24M",
        "productsSupplied": ["PRD-012 Industrial Microcontrollers", "PRD-014 Power MOSFETs"],
        "activeShipments": ["SHP-101", "SHP-108"],
        "contractExpiry": "15 Dec 2027",
    },
    {
        "id": "SUP-02",
        "name": "Pacific Cargo Logistics",
        "category": "Ocean & Intermodal Freight",
        "tier": 1,
        "location": "Singapore Port Terminal Hub",
        "status": "Active",
        "riskScore": 42,
        "deliveryPerformance": 94.2,
        "on_time_rate": 94.2,
        "activeDisruptions": 0,
        "spendYTD": "$840K",
        "productsSupplied": ["Express Container Freight", "Reefer Services"],
        "activeShipments": ["SHP-103"],
        "contractExpiry": "30 Jun 2028",
    },
    {
        "id": "SUP-03",
        "name": "Bharat Advanced Electronics",
        "category": "SMD Assembly & PCB Fab",
        "tier": 2,
        "location": "Electronics City, Bengaluru, Karnataka",
        "status": "Under Review",
        "riskScore": 35,
        "deliveryPerformance": None,
        "on_time_rate": None,
        "activeDisruptions": 0,
        "spendYTD": "$120K",
        "productsSupplied": ["Multi-layer PCBs", "SMD Stencils"],
        "activeShipments": [],
        "contractExpiry": "10 Jan 2029",
    },
    {
        "id": "SUP-04",
        "name": "Shenzhen Micro Technologies",
        "category": "Integrated Passives & Sensors",
        "tier": 1,
        "location": "Baoan District, Shenzhen, China",
        "status": "Critical",
        "riskScore": 86,
        "deliveryPerformance": 71.0,
        "on_time_rate": 71.0,
        "activeDisruptions": 1,
        "spendYTD": "$2.10M",
        "productsSupplied": ["PRD-056 256GB SSD Controllers", "PRD-034 RAM Modules"],
        "activeShipments": ["SHP-104", "SHP-109"],
        "contractExpiry": "01 Nov 2026",
    },
    {
        "id": "SUP-05",
        "name": "Nordic Precision Assemblies",
        "category": "Chassis & Thermal Enclosures",
        "tier": 2,
        "location": "Gothenburg Logistics Park, Sweden",
        "status": "Active",
        "riskScore": 28,
        "deliveryPerformance": 97.4,
        "on_time_rate": 97.4,
        "activeDisruptions": 0,
        "spendYTD": "$650K",
        "productsSupplied": ["Aluminum Extrusion Chassis", "Vapor Chamber Heatsinks"],
        "activeShipments": ["SHP-107"],
        "contractExpiry": "18 Aug 2028",
    },
]

@v1_router.get("/suppliers")
def get_suppliers():
    return SUPPLIERS_DB

@v1_router.post("/recovery/plans/{plan_id}/submit")
def submit_plan(plan_id: str):
    return {
        "success": True,
        "planId": plan_id,
        "status": "Pending Approval",
        "message": "Recovery plan submitted for Supply Chain Manager authorization",
    }

@v1_router.post("/approvals/{plan_id}/approve")
def approve_plan(
    plan_id: str,
    payload: ApprovalDecision,
    x_user_roles: Optional[str] = Header(None, alias="X-User-Roles"),
):
    actor_lower = payload.actor.lower()
    # Enforce CREATOR_CANNOT_DECIDE governance rule
    if "analyst" in actor_lower or x_user_roles == "operations-analyst":
        raise HTTPException(
            status_code=400,
            detail="CREATOR_CANNOT_DECIDE",
        )

    return {
        "success": True,
        "planId": plan_id,
        "status": "Approved",
        "approvedBy": payload.actor,
        "message": f"Plan {plan_id} authorized under Zero-Trust Governance Policy. On-chain transaction must be broadcast via connected wallet.",
    }

@v1_router.post("/approvals/{plan_id}/reject")
def reject_plan(plan_id: str, payload: ApprovalDecision):
    return {
        "success": True,
        "planId": plan_id,
        "status": "Rejected",
        "reason": payload.reason or "Governance policy rejection",
    }

@v1_router.post("/approvals/{plan_id}/request-revision")
def request_revision(plan_id: str, payload: RevisionRequest):
    return {
        "success": True,
        "planId": plan_id,
        "status": "Draft",
        "changeRequirements": payload.changeRequirements,
    }

@v1_router.get("/blockchain/verify/plan/{plan_id}")
def verify_plan(plan_id: str, db: Session = Depends(get_db)):
    op = db.query(OperationalRecoveryPlan).filter(OperationalRecoveryPlan.plan_id == plan_id).first()
    if op:
        from .blockchain.routes import resolve_contract_service, LOCAL_HARDHAT_CHAIN_ID
        svc = resolve_contract_service(LOCAL_HARDHAT_CHAIN_ID)
        is_anchored = False
        try:
            is_anchored = svc.plan_exists(plan_id, op.version)
        except Exception:
            pass
        return {
            "planId": plan_id,
            "version": op.version,
            "network": "Hardhat Local (31337)",
            "contract": getattr(svc, "contract_address", ""),
            "verified": is_anchored,
            "status": "Anchored" if is_anchored else "Draft",
        }
    return {
        "planId": plan_id,
        "verified": False,
        "status": "Not Found",
        "message": f"No operational recovery plan found for '{plan_id}'.",
    }

@v1_router.get("/chain/status")
def chain_status():
    from .blockchain.routes import resolve_contract_service, LOCAL_HARDHAT_CHAIN_ID
    try:
        svc = resolve_contract_service(LOCAL_HARDHAT_CHAIN_ID)
        is_conn = svc.is_connected
        cid = svc.w3.eth.chain_id if is_conn else LOCAL_HARDHAT_CHAIN_ID
        return {
            "network": "Hardhat Local" if cid == 31337 else "Polygon Amoy",
            "chainId": cid,
            "status": "CONNECTED" if is_conn else "DISCONNECTED",
            "contract": getattr(svc, "contract_address", ""),
        }
    except Exception as e:
        return {
            "network": "Hardhat Local",
            "chainId": 31337,
            "status": "DISCONNECTED",
            "contract": "",
            "error": str(e),
        }

app.include_router(v1_router)

@app.on_event("startup")
def on_startup():
    # 1. Additive table creation (never drops existing tables)
    init_db()

    # 2. Idempotent seed check for realistic supply chain data
    db = SessionLocal()
    try:
        seed_supply_chain_data(db, organization_id="ORG-APEX-GLOBAL")
        
        # 3. Startup transaction reconciliation across restarts
        try:
            from .blockchain.contract_service import ContractService
            from .blockchain.transaction_service import TransactionService
            from .blockchain.routes import LOCAL_HARDHAT_CONTRACT_ADDRESS
            contract_svc = ContractService(rpc_url="http://127.0.0.1:8545", contract_address=LOCAL_HARDHAT_CONTRACT_ADDRESS)
            if contract_svc.is_connected:
                TransactionService.reconcile_unconfirmed_transactions(db, contract_svc)
        except Exception as recon_err:
            logger.warning(f"Startup transaction reconciliation notice: {recon_err}")
    finally:
        db.close()

@app.get("/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "TRUSTCHAIN-UNIFIED-API",
        "modules": ["blockchain_governance", "supply_chain_intelligence"],
        "version": "1.1.0",
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
