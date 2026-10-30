from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .blockchain.routes import router as blockchain_router
from .blockchain.database import init_db
from . import models as _all_tables  # noqa: F401
from .auth import router as auth_router
from .ops.routes import router as ops_router
from .risk.routes import router as risk_router

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
app.include_router(risk_router)
app.include_router(auth_router)
app.include_router(ops_router)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "TRUSTCHAIN-API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
