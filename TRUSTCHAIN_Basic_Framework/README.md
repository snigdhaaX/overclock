# TRUSTCHAIN — Basic Implementation Framework

A runnable starter implementation of the TRUSTCHAIN supply-chain disruption control tower described in the TRUSTCHAIN pitch and product requirements. It is intentionally a **prototype/MVP foundation**, not a production deployment.

## What is included

- **FastAPI modular-monolith backend** with versioned REST endpoints and interactive API docs.
- **Relational data model** for suppliers, purchase orders, shipments, warehouses, inventory, customer orders, disruption events, recovery plans and audit records.
- **SQLite development database**, with a SQLAlchemy connection configuration that can be switched to PostgreSQL using `DATABASE_URL`.
- **Seeded demo data** that is loaded automatically on first run.
- **Carrier webhook simulation** with token validation, duplicate-event idempotency, sequence checks and delay-state updates.
- **Downstream impact analysis** that traces an inbound shipment SKU to open customer-order lines and allocates unreserved inventory by order priority and SLA deadline.
- **Deterministic risk score** using the pitch's weighting: `0.35D + 0.30S + 0.20I + 0.15P`.
- **Recovery-plan workflow**: draft → submitted → approved/rejected → executed.
- **Role checks and separation of duties** for Operations Analyst, Supply Chain Manager, Warehouse Operator, Procurement Approver, Administrator and Auditor demo roles.
- **SHA-256 hash-linked audit records** for key event and plan actions.
- **Browser dashboard** for operational metrics, risk queue, event stream, impact analysis and recovery-plan actions.
- **Dockerfile and Docker Compose** for a simple container run.

## Quick start (local)

Requirements: Python 3.11 or later.

```bash
cd backend
python -m venv .venv

# macOS / Linux
source .venv/bin/activate

# Windows PowerShell
# .venv\\Scripts\\Activate.ps1

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:

- Dashboard: <http://127.0.0.1:8000>
- Swagger API docs: <http://127.0.0.1:8000/docs>
- Health check: <http://127.0.0.1:8000/api/v1/health>

The SQLite database is created at `backend/data/trustchain.db`. Demo data is seeded automatically on the first application startup. Delete that database file to reset the demo state.

## Quick start (Docker)

From the project root:

```bash
docker compose up --build
```

Open <http://127.0.0.1:8000>. Data is stored in the `trustchain_data` Docker volume.

## Demo walkthrough

1. Open the dashboard. It starts with a seeded delayed shipment and illustrative downstream order exposure.
2. Select a shipment in **Shipment impact analysis** and click **Run analysis**.
3. Click **Simulate carrier delay** to send a sample carrier event through the webhook endpoint.
4. Create a draft plan for one of the impacted orders.
5. Keep the role as **Operations Analyst** and submit the draft.
6. Switch to **Supply Chain Manager** and approve an operational recovery action. For `alternative_supplier`, switch to **Procurement Approver**.
7. Switch to **Warehouse Operator** and execute the approved plan.
8. Inspect the audit trail at <http://127.0.0.1:8000/api/v1/audit>.

The role selector is a demo convenience. The backend accepts `X-User-Id` and `X-User-Role` headers to demonstrate authorization boundaries. This is **not authentication** and must be replaced with verified OIDC/SSO tokens before any real deployment.

## Important API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/v1/dashboard` | Control-tower KPI summary and risk queue |
| `GET` | `/api/v1/suppliers` | Supplier records |
| `GET` | `/api/v1/shipments` | Shipment and inbound-PO view |
| `GET` | `/api/v1/inventory` | On-hand, reserved and usable stock |
| `GET` | `/api/v1/orders` | Customer orders and order lines |
| `POST` | `/api/v1/import/json` | Strict or partial JSON import for suppliers, warehouses and inventory |
| `POST` | `/api/v1/webhooks/carriers/simulated` | Simulated carrier event ingestion |
| `POST` | `/api/v1/analysis/shipments/{id}` | Quantity-aware downstream impact analysis |
| `POST` | `/api/v1/plans` | Create a recovery-plan draft |
| `POST` | `/api/v1/plans/{id}/submit` | Submit a plan for approval |
| `POST` | `/api/v1/plans/{id}/approve` | Approve a submitted plan |
| `POST` | `/api/v1/plans/{id}/reject` | Reject a submitted plan |
| `POST` | `/api/v1/plans/{id}/execute` | Mark an approved plan as executed |
| `GET` | `/api/v1/audit` | Recent hash-linked audit records |
| `GET` | `/api/v1/audit/verify` | Verify the audit hash chain |

### Simulate a carrier event

```bash
curl -X POST http://127.0.0.1:8000/api/v1/webhooks/carriers/simulated \\
  -H 'Content-Type: application/json' \\
  -H 'X-Webhook-Token: dev-webhook-token' \\
  -d '{
    "source": "demo-carrier",
    "event_id": "carrier-event-002",
    "shipment_id": 1,
    "event_type": "DELAY",
    "delay_days": 3,
    "sequence_no": 2
  }'
```

For local development, the default webhook token is `dev-webhook-token`. Set `WEBHOOK_TOKEN` to a long secret in any shared environment.

### Create a plan from the API

```bash
curl -X POST http://127.0.0.1:8000/api/v1/plans \\
  -H 'Content-Type: application/json' \\
  -H 'X-User-Id: analyst-01' \\
  -H 'X-User-Role: operations_analyst' \\
  -d '{
    "order_id": 1,
    "action": "stock_reallocation",
    "description": "Reallocate uncommitted stock from the west hub and confirm availability."
  }'
```

## Architecture

```text
Browser dashboard (vanilla HTML/CSS/JS)
                |
                v
        FastAPI application
                |
       Modular monolith / API
        |        |         |
     Models   Services   Routers
        |    Impact/Risk  Webhook + plans
        |    Audit/RBAC
                |
          SQLAlchemy ORM
                |
       SQLite (development)
       PostgreSQL (configurable)
```

The core services are separated from HTTP routing so that optimization, event processing and persistence can be expanded without introducing microservices prematurely.

## Current limitations / next implementation steps

The code provides a basic working path through the central TRUSTCHAIN story. The following PRD areas are **not fully implemented** and should be treated as next steps:

1. Production authentication, organization/tenant isolation and a complete permission matrix.
2. Full CSV/JSON import pipelines for all operational entities, advanced row-level validation reports and synthetic-data generation. A basic JSON import endpoint for suppliers, warehouses and inventory is included.
3. Full graph model and NetworkX-powered dependency traversal across complex multi-tier supplier relationships.
4. Constraint solver using Google OR-Tools for multi-warehouse allocation, freight cost, supplier MOQ, capacity, budget and SLA trade-offs. The current impact calculation is deterministic but simplified; it is not an optimizer.
5. Production-grade LLM integration. AI is not called by this prototype; suggestions must remain advisory and rules authoritative.
6. Recovery-plan modification/version history, approval comments, notification delivery and execution integrations.
7. External anchoring/checkpointing of the hash chain, tamper-evident backups and comprehensive audit verification.
8. Full React/React Native applications, automated test coverage, observability, performance testing and deployment hardening.

## Prototype safety notes

- Do not use real customer or supplier data in this demo.
- Do not expose the default webhook token or demo role headers to a public network.
- The `execute` endpoint changes plan status only; it does not book freight, move inventory or issue purchase orders.
- Risk scores and exposed units are illustrative outputs from a simplified allocation model. Validate all recovery actions with real operational constraints before use.
