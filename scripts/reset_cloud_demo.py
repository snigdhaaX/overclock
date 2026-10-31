"""Resets the hosted demo data and fires the SHP-101 delay. Run from the repo root:

    backend\\.venv\\Scripts\\python.exe scripts\\reset_cloud_demo.py

Reopen the app and sign in again afterwards, because a reset invalidates existing logins.
"""
import datetime
import json
import os
import re
import subprocess
import sys
import urllib.request
import uuid
from pathlib import Path

API = "https://trustchain-api-ube3.onrender.com/api/v1"
ROOT = Path(__file__).resolve().parents[1]
values = dict(re.findall(r"^([A-Z_]+)=(.*)$", (ROOT / ".env").read_text(encoding="utf-8-sig"), re.M))


def post(path, body, headers=None):
    request = urllib.request.Request(API + path, method="POST", data=json.dumps(body).encode(), headers={"Content-Type": "application/json", **(headers or {})})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


env = dict(os.environ, DATABASE_URL=values["TRUSTCHAIN_SUPABASE_POOLER_URL"].strip(), PYTHONIOENCODING="utf-8", TRUSTCHAIN_KEY_ANALYST="", TRUSTCHAIN_KEY_MANAGER="")
subprocess.run([sys.executable, "-m", "backend.app.ops.cli", "seed"], cwd=ROOT, env=env, check=True, capture_output=True)
event = {
    "event_id": uuid.uuid4().hex, "carrier": "OceanTrans", "shipment_id": "SHP-101", "event_type": "SHIPMENT_DELAYED",
    "event_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(), "estimated_delay_hours": 96, "reason": "Port congestion at Singapore",
}
print(post("/webhooks/carriers/simulated", event, {"X-Webhook-Secret": values["TRUSTCHAIN_WEBHOOK_SECRET"].strip()}))
