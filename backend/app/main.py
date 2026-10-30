from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
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

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/health")
def health_check():
    return {"status": "HEALTHY", "service": "TRUSTCHAIN-API"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
