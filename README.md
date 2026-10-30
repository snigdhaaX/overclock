<div align="center">

# ⛓️ TRUSTCHAIN

### Don't just detect disruptions. Resolve their consequences.

AI-assisted supply chain recovery, where every decision is explainable, feasible and accountable.

<br/>

![Expo](https://img.shields.io/badge/Expo_58-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
<br/>
![scikit-learn](https://img.shields.io/badge/scikit--learn-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)
![Solidity](https://img.shields.io/badge/Solidity-363636?style=for-the-badge&logo=solidity&logoColor=white)
![Polygon](https://img.shields.io/badge/Polygon_Amoy-7B3FE4?style=for-the-badge&logo=polygon&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)

<br/>

[The idea](#-the-idea) •
[Architecture](#%EF%B8%8F-architecture) •
[Workflow](#-workflow) •
[Risk engine](#-adaptive-risk-engine) •
[Database](#%EF%B8%8F-database) •
[Status](#-project-status) •
[Quick start](#-quick-start)

<sub>Built for the OVERCLOCK '26 Hackathon</sub>

</div>

---

## 💡 The idea

Spotting one late shipment is easy. Working out **which customer orders it really affects, what can feasibly be done, and who is allowed to decide** is the hard part.

TRUSTCHAIN turns scattered supply chain updates into one governed path, from first signal to verified outcome:

> **SENSE → CONNECT → DETECT → TRACE → PRIORITIZE → RECOMMEND → SIMULATE → OPTIMIZE → APPROVE → CONFIRM → EXECUTE → VERIFY**

| | Capability | What it means |
|---|---|---|
| 🔗 | **Connected data** | Suppliers, shipments, stock and orders linked in one model |
| 🎯 | **Real impact** | A delay only counts if it really reaches an order line |
| 🧠 | **Adaptive risk** | ML that learns from outcomes, and must beat a fixed formula to go live |
| ⚙️ | **Feasible recovery** | Rules and optimization decide what's possible; AI only advises |
| ✍️ | **Governed decisions** | Authors can't approve their own plans, and execution needs explicit confirmation |
| 🔐 | **Verifiable evidence** | Decision hashes anchored on-chain, with no personal data |

## 🏗️ Architecture

One backend serves every client. The blockchain holds evidence, never operational data.

```mermaid
flowchart TB
    subgraph clients["📱 Clients"]
        direction LR
        MOB["Mobile app<br/>Expo + React Native"]
        WEB["Verification portal<br/>React + Vite"]
    end

    subgraph api["⚡ FastAPI backend"]
        direction LR
        RISK["Risk engine<br/>ML + formula"]
        CHAIN["Blockchain services<br/>hashing, wallets, tx tracking"]
        CORE["Operations API<br/>planned"]
    end

    subgraph data["🗄️ Data"]
        direction LR
        DB[("PostgreSQL<br/>52-table schema")]
        MODELS[("Versioned<br/>ML models")]
    end

    SC["⛓️ TrustChainGovernance.sol<br/>Polygon Amoy"]
    EVENTS["🚚 Carrier and supplier events<br/>planned"]

    MOB -- "REST" --> RISK
    MOB -. "planned" .-> CORE
    WEB -- "REST" --> CHAIN
    WEB -- "MetaMask" --> SC
    EVENTS -.-> CORE
    RISK --> DB
    RISK --> MODELS
    CORE -.-> DB
    CHAIN --> DB
    CHAIN -- "Web3.py" --> SC

    classDef live fill:#2563EB,stroke:#1E40AF,color:#FFFFFF
    classDef store fill:#0D9488,stroke:#115E59,color:#FFFFFF
    classDef chain fill:#7B3FE4,stroke:#5B21B6,color:#FFFFFF
    classDef planned fill:#64748B,stroke:#475569,color:#FFFFFF,stroke-dasharray: 5 5
    class MOB,WEB,RISK,CHAIN live
    class DB,MODELS store
    class SC chain
    class CORE,EVENTS planned
```

<sub>Dashed grey boxes are specified in the PRD but not built yet.</sub>

## 🔄 Workflow

Humans stay in control: neither an AI suggestion nor a finished simulation can trigger execution.

```mermaid
flowchart TD
    A["🚚 Carrier event or data import"] --> B{"Authentic, valid,<br/>not a duplicate?"}
    B -- No --> B1["Reject or quarantine,<br/>keep the evidence"]
    B -- Yes --> C["Detect disruption"]
    C --> D["Trace affected order lines"]
    D --> E["Rank orders by risk"]
    E --> F["AI explains and suggests"]
    F --> G["Rules and optimizer<br/>keep what's feasible"]
    G --> H["Analyst submits plan"]
    H --> I{"Approver decides"}
    I -- Reject --> J["Plan closed"]
    I -- "Request changes" --> K["New plan version"]
    K --> H
    I -- Approve --> L{"Authorized user<br/>confirms execution?"}
    L -- Yes --> M["Simulate recovery actions"]
    M --> N["🔐 Audit trail and<br/>on-chain evidence"]

    classDef human fill:#F59E0B,stroke:#B45309,color:#1F2937
    classDef machine fill:#2563EB,stroke:#1E40AF,color:#FFFFFF
    classDef proof fill:#7B3FE4,stroke:#5B21B6,color:#FFFFFF
    class H,I,L human
    class C,D,E,F,G,M machine
    class N proof
```

### 🤝 Who can do what in an approval

```mermaid
sequenceDiagram
    autonumber
    actor A as Operations Analyst
    participant API as Backend
    actor M as Supply Chain Manager
    participant C as Smart contract

    A->>API: Submit recovery plan v1
    API->>C: Anchor plan hash
    A-xAPI: Try to approve own plan
    API--xA: Rejected, creator cannot decide
    M->>API: Review exact plan version
    M->>C: Sign approval with wallet
    C-->>API: Approval event confirmed
    M->>API: Confirm execution
    API->>C: Anchor execution evidence
```

### 🧭 Life of a recovery plan

```mermaid
stateDiagram-v2
    [*] --> DRAFT
    DRAFT --> SIMULATED
    SIMULATED --> SUBMITTED
    SUBMITTED --> UNDER_REVIEW
    UNDER_REVIEW --> APPROVED
    UNDER_REVIEW --> REJECTED
    UNDER_REVIEW --> REVISION_REQUIRED
    REVISION_REQUIRED --> DRAFT: new version
    APPROVED --> EXECUTION_PENDING: explicit confirmation
    EXECUTION_PENDING --> EXECUTING
    EXECUTING --> COMPLETED
    EXECUTING --> PARTIALLY_COMPLETED
    EXECUTING --> FAILED
    PARTIALLY_COMPLETED --> MANUAL_REVIEW
    FAILED --> MANUAL_REVIEW
    REJECTED --> [*]
    COMPLETED --> [*]
```

## 🧠 Adaptive risk engine

Instead of fixing a formula forever, the model keeps learning from what really happened. It only goes live if it earns it.

```mermaid
flowchart LR
    O["📥 Real outcomes<br/>reported"] --> T["Train challenger"]
    T --> V{"Beats the formula<br/>on later, unseen orders?"}
    V -- Yes --> L["✅ New model goes live"]
    V -- No --> F["Keep current scoring,<br/>log the rejected run"]
    L --> S["Score = chance of miss<br/>× priority weight"]
    F --> S
    S --> A["📱 Mobile app shows score,<br/>source and reasons"]
    A --> O

    classDef good fill:#16A34A,stroke:#166534,color:#FFFFFF
    classDef flow fill:#2563EB,stroke:#1E40AF,color:#FFFFFF
    class L good
    class O,T,S,A flow
```

- **Falls back safely:** with too little data or no proven model, scoring uses the PRD formula, `0.35D + 0.30S + 0.20I + 0.15P`.
- **Avoids leakage:** features only use outcomes known at the time of each order.
- **Explains itself:** each score lists the factors behind it and the model version that produced it.

### Results so far

| Dataset | Formula PR-AUC | ML PR-AUC | Decision |
|---|---:|---:|---|
| Synthetic demo: after a quarter of suppliers worsen | 0.558 | **0.671** | Went live |
| [DataCo](https://data.mendeley.com/datasets/8gx2fvg2k6/5) public dataset (172,765 orders) | 0.720 | **0.836** | Went live |
| Undated logistics CSV | 0.718 | 0.714 | Rejected, no real signal |

> [!IMPORTANT]
> These don't yet show ML beating the full formula in real operations. The synthetic data was built for this project and favours ML, and on DataCo the formula only had its deadline input. A fair test needs real records with all four formula inputs.

## 🗄️ Database

A multi-tenant PostgreSQL schema of **52 tables** across seven domains, managed with Alembic migrations.

```mermaid
erDiagram
    SUPPLIERS ||--o{ PURCHASE_ORDERS : receives
    PURCHASE_ORDERS ||--o{ SHIPMENTS : "fulfilled by"
    SHIPMENTS ||--o{ SHIPMENT_ITEMS : carries
    SHIPMENT_ITEMS ||--o{ FULFILMENT_ALLOCATIONS : "supplies"
    INVENTORY ||--o{ FULFILMENT_ALLOCATIONS : "supplies"
    ORDER_ITEMS ||--o{ FULFILMENT_ALLOCATIONS : "needs"
    CUSTOMER_ORDERS ||--o{ ORDER_ITEMS : contains
    ORDER_ITEMS ||--o{ RISK_ASSESSMENTS : "scored in"
    DISRUPTIONS ||--o{ RECOVERY_PLANS : "answered by"
    RECOVERY_PLANS ||--o{ APPROVALS : "decided in"
    RECOVERY_PLANS ||--o{ EXECUTION_RUNS : "executed in"
```

Critical rules live in the database itself, so a bug in the app can't break them:

- 🚫 A plan's creator can't approve it, and the creator on an approval can't be faked
- 🧾 Audit records are append-only and hash-chained, with triggers blocking edits
- 📦 Available stock is calculated by the database, and stock can't be double-booked
- 🔁 Duplicate events, duplicate approvals and repeated execution steps are rejected

**📘 Full reference, with every domain diagram: [docs/DATABASE.md](docs/DATABASE.md)**

## 📊 Project status

| Area | State | Notes |
|---|---|---|
| Smart contract | ✅ Deployed | On Polygon Amoy; see [blockchain/README.md](blockchain/README.md) |
| Blockchain API | ✅ Built | Hashing, wallet linking, transaction tracking, verification |
| Adaptive risk engine | ✅ Built | Training, promotion gate, fallback, live scoring in the app |
| Database schema | ✅ Built | Rule tests and migrations pass on PostgreSQL 18 and SQLite |
| Login and roles | ✅ Built | Argon2, JWT and role checks for the workflow API; older risk and blockchain routes still trust headers |
| Carrier event ingestion | ✅ Built | Authenticated webhook with duplicate and out-of-order handling |
| Disruption and impact | ✅ Built | Traces delays to the order lines they really affect |
| Recovery suggestions | 🟡 Partial | Rule-checked and ranked by risk; OR-Tools and LLM summaries aren't built |
| Approvals and execution | ✅ Built | Separation of duties, simulated execution, audit chain |
| On-chain anchoring | 🟡 Partial | Code exists but hasn't been run on a live chain; the app says so until it's confirmed |
| Mobile app | 🟡 Partial | Screens for all five roles; analyst and manager flows use live data; warehouse, procurement, admin and supplier screens are still mock |

> [!WARNING]
> **Demo only.** On-chain signing uses server-held testnet wallets instead of user wallets, and all data is labelled demo data. TRUSTCHAIN is now app-only, so use Android or iOS. The web build crashes because `react-native-maps` has no web support.

## 📱 Five roles, one app

| Role | What they do in the app | Data |
|---|---|---|
| **Operations Analyst** | Investigates disruptions, reviews risk, submits recovery plans | Live |
| **Supply Chain Manager** | Approves plans, confirms execution, reviews the audit trail | Live, with some mock screens |
| **Warehouse Operator** | Scans goods, receives stock, reports damage, confirms transfers | Mock |
| **Procurement Approver** | Reviews requests and supplier alternatives, approves purchases | Mock |
| **Administrator** | Manages users, roles, facilities and integrations | Mock |

## 🚀 Quick start

**You'll need:** Python 3.11+, Node.js 20+, and Expo Go on your phone.

<details open>
<summary><b>1. Backend</b></summary>

```bash
python -m venv backend/.venv
source backend/.venv/bin/activate      # Windows: backend\.venv\Scripts\activate
pip install -r backend/requirements.txt

# Create the database, then load demo data and train the demo risk model
alembic -c backend/alembic.ini upgrade head
python -m backend.app.ops.cli seed

# Trigger the demo shipment delay at any time (seed again to reset)
python -m backend.app.ops.cli event

# Start the API, reachable from your phone. Docs at http://localhost:8000/docs
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000
```

</details>

<details open>
<summary><b>2. Mobile app</b></summary>

```bash
npm install
npx expo start
```

Scan the QR code with your phone on the same Wi-Fi, and allow port 8000 through your firewall if asked. Sign in as `analyst@trustchain.com` or `manager@trustchain.com` with the demo password `password123`. If the backend is off, the app says so and labels scores as sample data.

</details>

<details>
<summary><b>3. Blockchain</b></summary>

```bash
cd blockchain
npm install
npx hardhat test
```

Deployment details are in [blockchain/README.md](blockchain/README.md).

</details>

<details>
<summary><b>4. Verification portal</b></summary>

```bash
cd blockchain/frontend
npm install
npm run dev      # http://localhost:5173
```

</details>

<details>
<summary><b>Environment variables</b></summary>

Copy [`.env.example`](.env.example) to `.env`. Everything has a local default except blockchain deployment keys, so you can skip this at first. Never commit `.env`.

</details>

## 🧪 Testing

```bash
python -m pytest backend/tests -v      # Backend, risk engine and database rules
npx tsc --noEmit                       # Mobile app types
cd blockchain && npx hardhat test      # Smart contracts
```

The backend suite has **87 tests**, and the database tests try to break each rule rather than only checking the happy path.

## 📁 Project structure

```text
.
├── src/                    # 📱 Mobile app (Expo Router)
│   ├── app/                #    Screens, grouped by role
│   └── features/           #    Analyst, manager and warehouse code
├── backend/                # ⚡ FastAPI
│   ├── app/
│   │   ├── models/         #    Database schema, by domain
│   │   ├── risk/           #    Adaptive ML risk engine
│   │   └── blockchain/     #    Hashing, wallets, transactions
│   ├── migrations/         #    Alembic migrations
│   └── tests/
├── blockchain/             # ⛓️ Solidity contract and verification portal
├── docs/DATABASE.md        # 📘 Schema reference
├── disruption.ipynb        # 🔬 Original ML exploration
└── TRUSTCHAIN_PRD_v2.0.md  # 📋 Full product specification
```

<sub>`TRUSTCHAIN_Basic_Framework/` is an early starter kept for reference only. The app doesn't use it.</sub>

## 🗺️ Roadmap

```mermaid
flowchart LR
    P1["1️⃣ Foundation<br/>schema ✅<br/>login and roles"] --> P2["2️⃣ Operational data<br/>APIs, imports,<br/>demo data"]
    P2 --> P3["3️⃣ Event ingestion<br/>carrier webhook"]
    P3 --> P4["4️⃣ Intelligence<br/>detection, impact"]
    P4 --> P5["5️⃣ Recovery<br/>AI, optimizer"]
    P5 --> P6["6️⃣ Governance<br/>approvals, execution"]
    P6 --> P7["7️⃣ End-to-end demo<br/>real mobile data,<br/>on-chain evidence"]
```

## 🔒 Security

- **Secrets stay out of git:** private keys, `.env` files and datasets are ignored.
- **No personal data on-chain:** only 32-byte hashes are anchored.
- **Non-custodial:** the backend holds no private keys, and wallets sign on the client.

## 📄 License

MIT. See [LICENSE](LICENSE).

<div align="center">
<br/>
<sub>Every disruption should lead to an understood impact, every recovery recommendation should be feasible, and every critical decision should be accountable.</sub>
</div>
