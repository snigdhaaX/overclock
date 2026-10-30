from pathlib import Path
import os
from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from .db import Base, engine, SessionLocal
from . import models  # noqa: F401 - register SQLAlchemy models
from .seed import seed_demo_data
from .routers.api import router as api_router

FRONTEND_DIR = Path(os.getenv("FRONTEND_DIR", str(Path(__file__).resolve().parents[2] / "frontend")))

app = FastAPI(
    title="TRUSTCHAIN API",
    description=(
        "Prototype modular-monolith API for supply-chain disruption detection, "
        "downstream impact analysis, deterministic risk scoring and governed recovery plans."
    ),
    version="0.1.0",
)
app.include_router(api_router)
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")


@app.on_event("startup")
def startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_data(db)


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(FRONTEND_DIR / "index.html")
