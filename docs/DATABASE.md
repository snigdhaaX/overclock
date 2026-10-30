# TRUSTCHAIN Database

The schema behind every TRUSTCHAIN workflow, based on PRD section 9 and Appendix A.

| | |
|---|---|
| **Database** | PostgreSQL in production, SQLite for quick local development and tests |
| **Models** | [`backend/app/models/`](../backend/app/models) (SQLAlchemy) |
| **Migrations** | [`backend/migrations/`](../backend/migrations) (Alembic) |
| **Size** | 52 tables, 109 foreign keys, 63 check constraints |

> **Testing status:** the rule tests in `backend/tests/test_schema.py` pass on both SQLite and PostgreSQL 18, including the migration up and down. See [Run it on PostgreSQL](#run-it-on-postgresql).

## The big picture

Seven domains, each in its own file. An arrow means "depends on".

```mermaid
flowchart LR
    I["Identity & access<br/>identity.py"]
    S["Supply chain<br/>supply_chain.py"]
    N["Inventory & orders<br/>inventory.py"]
    A["Intelligence<br/>intelligence.py"]
    R["Recovery<br/>recovery.py"]
    G["Governance<br/>governance.py"]
    X["Integrations<br/>integrations.py"]

    S --> I
    N --> S
    A --> N
    R --> A
    G --> I
    X --> I
    N -. "reservations, transfers" .-> R
    R -. "evidence hashes" .-> C[("Polygon Amoy")]
```

## Core dependency chain

This chain is what makes downstream impact traceable, from a late supplier to the exact order line it affects.

```mermaid
flowchart LR
    SUP[Supplier] --> PO[Purchase order] --> SHP[Shipment] --> SI[Shipment item]
    SI --> FA[Fulfilment allocation]
    INV[Inventory] --> FA
    FA --> OI[Order line] --> CO[Customer order]
```

An allocation draws from **either** stock on hand **or** an inbound shipment, and the database enforces exactly one. So a delayed shipment only affects orders actually relying on it.

## Identity and access

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ USERS : has
    ORGANIZATIONS ||--o{ ROLES : defines
    USERS ||--o{ USER_ROLES : holds
    ROLES ||--o{ USER_ROLES : "granted through"
    ROLES ||--o{ ROLE_PERMISSIONS : includes
    PERMISSIONS ||--o{ ROLE_PERMISSIONS : "listed in"
    ROLES ||--o{ APPROVAL_AUTHORITIES : "may approve"
    USERS ||--o{ SESSIONS : opens
    USERS ||--o{ USER_WAREHOUSE_ASSIGNMENTS : "assigned to"

    USERS {
        uuid id PK
        uuid organization_id FK
        string email "unique per organization"
        text password_hash "Argon2id"
        string status
        boolean mfa_enabled
    }
    USER_ROLES {
        uuid user_id FK
        uuid role_id FK
        timestamp revoked_at "one active copy per role"
    }
    APPROVAL_AUTHORITIES {
        uuid role_id FK
        string action_category
        int stage
        decimal max_amount "null means no limit"
    }
    SESSIONS {
        string refresh_token_hash "unique"
        timestamp expires_at
        timestamp revoked_at
    }
```

## Supply chain and events

```mermaid
erDiagram
    SUPPLIERS ||--o{ SUPPLIER_PRODUCTS : offers
    PRODUCTS ||--o{ SUPPLIER_PRODUCTS : "sourced via"
    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : contains
    PURCHASE_ORDERS ||--o{ SHIPMENTS : "fulfilled by"
    CARRIERS ||--o{ SHIPMENTS : moves
    WAREHOUSES ||--o{ SHIPMENTS : "destination of"
    SHIPMENTS ||--o{ SHIPMENT_ITEMS : carries
    SHIPMENTS ||--o{ CARRIER_EVENTS : "reported by"
    SUPPLIERS ||--o{ SUPPLIER_EVENTS : "reported by"

    SHIPMENTS {
        uuid id PK
        string code "unique per organization"
        string status
        timestamp current_eta
        timestamp physical_arrival_at
        timestamp receiving_completed_at
        timestamp quality_completed_at
        timestamp usable_at
        int version "optimistic lock"
    }
    CARRIER_EVENTS {
        string source
        string event_id "unique with source"
        bigint source_sequence
        timestamp event_timestamp
        json payload
        string processing_status
        int retry_count
    }
```

## Inventory and orders

```mermaid
erDiagram
    WAREHOUSES ||--o{ INVENTORY : stores
    PRODUCTS ||--o{ INVENTORY : "stocked as"
    INVENTORY ||--o{ INVENTORY_LOTS : "split into"
    INVENTORY ||--o{ INVENTORY_ADJUSTMENTS : "changed by"
    INVENTORY ||--o{ RESERVATIONS : "claimed by"
    CUSTOMER_ORDERS ||--o{ ORDER_ITEMS : contains
    ORDER_ITEMS ||--o{ RESERVATIONS : holds
    ORDER_ITEMS ||--o{ FULFILMENT_ALLOCATIONS : "supplied by"
    INVENTORY ||--o{ FULFILMENT_ALLOCATIONS : "source A"
    SHIPMENT_ITEMS ||--o{ FULFILMENT_ALLOCATIONS : "source B"
    PRODUCTS ||--o{ STOCK_TRANSFERS : moves

    INVENTORY {
        decimal on_hand_quantity
        decimal reserved_quantity
        decimal safety_stock_quantity
        decimal damaged_quantity
        decimal quarantined_quantity
        decimal available_quantity "calculated by database"
        int version "optimistic lock"
    }
    ORDER_ITEMS {
        decimal required_quantity
        decimal allocated_quantity
        decimal fulfilled_quantity
        decimal remaining_quantity "calculated by database"
    }
```

`available_quantity = on_hand - reserved - safety_stock - damaged - quarantined` (PRD 6.30). It's allowed to go negative, because stock below its safety level is a real shortage worth seeing.

## Intelligence

```mermaid
erDiagram
    DISRUPTIONS ||--o{ IMPACT_ASSESSMENTS : "assessed by"
    DISRUPTIONS ||--o{ DEPENDENCY_SNAPSHOTS : "traced in"
    IMPACT_ASSESSMENTS ||--o{ IMPACT_ASSESSMENT_LINES : lists
    ORDER_ITEMS ||--o{ IMPACT_ASSESSMENT_LINES : "affected in"
    ORDER_ITEMS ||--o{ RISK_ASSESSMENTS : "scored in"
    DISRUPTIONS ||--o{ RISK_ASSESSMENTS : causes
    DISRUPTIONS ||--o{ SIMULATION_SNAPSHOTS : "explored in"

    RISK_ASSESSMENTS {
        string method "ml or formula"
        float score "0 to 100"
        string category
        float miss_probability
        json components
        json factor_effects
        string policy_version
        int model_version "required for ml"
    }
    SIMULATION_SNAPSHOTS {
        string optimization_mode
        json inputs
        json entity_versions "detects stale results"
        json outputs
        string status "current, stale, invalidated"
    }
```

## Recovery and approvals

```mermaid
erDiagram
    DISRUPTIONS ||--o{ RECOVERY_PLANS : "answered by"
    SIMULATION_SNAPSHOTS ||--o{ RECOVERY_PLANS : informs
    USERS ||--o{ RECOVERY_PLANS : creates
    RECOVERY_PLANS ||--o{ RECOVERY_PLAN_ACTIONS : contains
    RECOVERY_PLANS ||--o{ APPROVALS : "decided in"
    USERS ||--o{ APPROVALS : signs
    RECOVERY_PLANS ||--o{ EXECUTION_RUNS : "executed in"
    EXECUTION_RUNS ||--o{ EXECUTION_ACTIONS : tracks
    RECOVERY_PLAN_ACTIONS ||--o{ EXECUTION_ACTIONS : "performed as"

    RECOVERY_PLANS {
        string plan_key "same across versions"
        int version "new row per version"
        uuid creator_id FK
        string status
        string plan_hash "anchored on-chain"
    }
    APPROVALS {
        uuid plan_id FK
        uuid plan_creator_id FK "must match the plan"
        uuid approver_id FK "cannot equal creator"
        int stage
        string decision
        string chain_status
    }
    EXECUTION_RUNS {
        string execution_request_id "unique"
        uuid confirmed_by FK "required"
        string status
    }
    EXECUTION_ACTIONS {
        string idempotency_key "unique"
        string status
        int attempts
    }
```

## Governance and integrations

```mermaid
erDiagram
    ORGANIZATIONS ||--o{ AUDIT_EVENTS : records
    USERS ||--o{ NOTIFICATIONS : receives
    ORGANIZATIONS ||--o{ INTEGRATION_CONFIGS : configures
    INTEGRATION_CONFIGS ||--o{ INTEGRATION_EVENT_LOGS : writes
    ORGANIZATIONS ||--o{ IMPORT_JOBS : runs
    IMPORT_JOBS ||--o{ IMPORT_ERRORS : reports

    AUDIT_EVENTS {
        bigint sequence "unique per organization"
        string action_type
        json metadata
        string previous_hash
        string current_hash
    }
    INTEGRATION_CONFIGS {
        string provider
        string secret_ref "pointer only, never the secret"
    }
    IMPORT_ERRORS {
        int row_number
        string field
        string error_code
        text message
    }
```

## Rules the database itself enforces

These hold even if application code has a bug.

| Rule | How | PRD |
|---|---|---|
| A creator can't approve their own plan | `CHECK (approver_id <> plan_creator_id)` | 6.4, 6.90 |
| The creator on an approval can't be faked | Composite foreign key to `recovery_plans (id, creator_id)` | 6.5 |
| Approvals don't carry over to new versions | Each plan version is its own row | 6.86 |
| One decision per approver and stage | Unique constraint | 6.90 |
| Available stock can't be stored wrong | Generated column | 6.30 |
| Stock can't be double-booked | `on_hand >= reserved + damaged + quarantined` | 6.32 |
| Stale writes can't overwrite newer ones | `version` optimistic lock | 9.2, 14.9 |
| Duplicate carrier events can't be stored | Unique on organization, source and event id | 6.43 |
| Each execution action runs once | Unique on run and action | 6.98 |
| Audit records can't be changed or deleted | ORM guard plus database triggers | 6.105 |
| An ML score must name its model version | Check constraint | 6.60 |
| A notification can't be delivered twice | Unique dedupe key per user and channel | 6.101 |

Business rules that depend on live state, such as approval authority limits or valid status transitions, belong in the service layer.

## Design decisions

- **UUID primary keys, with readable codes alongside.** IDs like `SHP-1001` are unique per organization, and UUIDs can't be guessed or collide between tenants.
- **Each plan version is a row.** It's the simplest way to guarantee that an approval refers to exactly what was reviewed.
- **Self-approval is blocked for every plan.** The PRD limits this to "restricted" plans without defining them (A.7), so this takes the strict reading, matching `CreatorCannotDecide` in the smart contract.
- **Tables added beyond PRD 9.1:** `role_permissions`, `approval_authorities` and `user_warehouse_assignments` come from Appendix A. `supplier_products` supports several suppliers per product, and `impact_assessment_lines` stops a shortage being counted twice.
- **Carrier event uniqueness includes the organization.** The PRD says `(source, event_id)`, but then one tenant's event could block another's.

## Known gaps

- **Tenant checks across tables:** the database confirms a record has an organization, but not that a record it links to belongs to the same one. Every query must filter by organization until the service layer is built.
- **Older tables:** `user_wallets`, `blockchain_*`, `operational_plans` and `risk_*` predate this schema and use string IDs with no foreign keys. They should move to the new `users` and `organizations`, and `operational_plans` overlaps `recovery_plans`.
- **Risk data:** `risk_exposures` holds training data, and `risk_assessments` is ready for scores but isn't written to yet.
- **Open PRD decisions (A.7):** who may confirm execution, and the stage order and financial limits for approvals. The tables can hold these, but the values aren't decided.

## Run it on PostgreSQL

Apply migrations **before** first starting the API. The API creates missing tables on startup, which would make a later `upgrade` fail.

```bash
# Point at your database (or put this in .env)
export DATABASE_URL="postgresql+psycopg://user:password@localhost:5432/trustchain"

# From the repo root
alembic -c backend/alembic.ini upgrade head

# Run the rule tests against a throwaway database. They wipe its public schema!
export TRUSTCHAIN_TEST_DATABASE_URL="postgresql+psycopg://user:password@localhost:5432/trustchain_test"
python -m pytest backend/tests/test_schema.py -v
```

After changing a model, generate the next migration and review it before applying:

```bash
alembic -c backend/alembic.ini revision --autogenerate -m "describe the change"
```
