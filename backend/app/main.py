from typing import Any, Dict, List, Optional
from fastapi import FastAPI, APIRouter, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from .blockchain.routes import router as blockchain_router
from .blockchain.database import init_db

app = FastAPI(
    title="TRUSTCHAIN Disruption Recovery & Blockchain Governance API",
    description="Backend API for supply chain disruption intelligence, recovery optimization, and Polygon Amoy blockchain verification.",
    version="1.0.0",
)

# CORS configuration for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include blockchain module
app.include_router(blockchain_router)

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

    tx_hash = "0x" + "a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0"[2:66]
    return {
        "success": True,
        "planId": plan_id,
        "status": "Approved",
        "approvedBy": payload.actor,
        "txHash": tx_hash,
        "message": f"Plan {plan_id} authorized under Zero-Trust Governance Policy.",
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
def verify_plan(plan_id: str):
    return {
        "planId": plan_id,
        "network": "Polygon Amoy (80002)",
        "contract": "0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A",
        "verified": True,
        "status": "Anchored",
    }

@v1_router.get("/chain/status")
def chain_status():
    return {
        "network": "Polygon Amoy",
        "chainId": 80002,
        "status": "CONNECTED",
        "contract": "0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A",
    }

app.include_router(v1_router)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "TRUSTCHAIN-API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
