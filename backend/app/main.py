import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .blockchain.routes import router as blockchain_router
from .blockchain.database import init_db, SessionLocal
from .supply_chain.routes import router as supply_chain_router
from .supply_chain import models as _supply_chain_models  # Ensure models are registered on Base
from .supply_chain.seed_data import seed_supply_chain_data

app = FastAPI(
    title="TRUSTCHAIN Disruption Recovery & Blockchain Governance API",
    description="Unified API for supply chain disruption intelligence, recovery optimization, and Polygon Amoy blockchain verification.",
    version="1.1.0",
)

# Explicit trusted origins for CORS (resolves security vulnerability with allow_credentials=True)
CORS_ORIGINS_STR = os.getenv(
    "CORS_ALLOWED_ORIGINS",
    "http://localhost:3000,http://localhost:8081,http://localhost:19006,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:8081,http://127.0.0.1:5173",
)
CORS_ORIGINS = [orig.strip() for orig in CORS_ORIGINS_STR.split(",") if orig.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(blockchain_router)
app.include_router(supply_chain_router)


@app.on_event("startup")
def on_startup():
    # 1. Additive table creation (never drops existing tables)
    init_db()
    
    # 2. Idempotent seed check for realistic supply chain data
    db = SessionLocal()
    try:
        seed_supply_chain_data(db, organization_id="ORG-APEX-GLOBAL")
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
