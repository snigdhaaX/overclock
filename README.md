<div align="center">

#  TRUSTCHAIN (OVERCLOCK '26)
### *Next-Generation Autonomous Supply Chain Disruption Resolution & Cryptographic Governance Platform*

[![Expo SDK](https://img.shields.io/badge/Expo_SDK-58.0.21-000020?style=for-the-badge&logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React_Native-0.88.1-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactnative.dev)
[![React](https://img.shields.io/badge/React-19.3.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16_|_18-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-363636?style=for-the-badge&logo=solidity&logoColor=white)](https://soliditylang.org)
[![Polygon Amoy](https://img.shields.io/badge/Polygon-Amoy_Testnet-7B3FE4?style=for-the-badge&logo=polygon&logoColor=white)](https://polygon.technology)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-1.4+-F7931E?style=for-the-badge&logo=scikitlearn&logoColor=white)](https://scikit-learn.org)

<br/>

> **"Don't just detect disruptions. Resolve their consequences."**  
> *TRUSTCHAIN transforms opaque, cascading logistics delays into explainable, mathematically optimized, and cryptographically verifiable recovery plans across multi-tenant enterprise supply networks.*

</div>

---

##  Table of Contents

1. [Executive Summary & Core Value Proposition](#1-executive-summary--core-value-proposition)
2. [High-Level System Architecture](#2-high-level-system-architecture)
   - [2.1 Multi-Tier Enterprise Architecture](#21-multi-tier-enterprise-architecture)
   - [2.2 Technical Component Boundary & Network Topology](#22-technical-component-boundary--network-topology)
   - [2.3 Relational Data Architecture (52 Tables across 7 Domains)](#23-relational-data-architecture-52-tables-across-7-domains)
   - [2.4 Dual-Engine Adaptive Risk Architecture](#24-dual-engine-adaptive-risk-architecture)
   - [2.5 Decentralized Blockchain Governance & Evidence Anchoring](#25-decentralized-blockchain-governance--evidence-anchoring)
   - [2.6 Enterprise Identity, RBAC & Multi-Tenant Isolation](#26-enterprise-identity-rbac--multi-tenant-isolation)
3. [End-to-End Operational Workflows](#3-end-to-end-operational-workflows)
   - [3.1 The 12-Stage Disruption Resolution Lifecycle](#31-the-12-stage-disruption-resolution-lifecycle)
   - [3.2 Workflow 1: Real-Time Carrier Disruption Ingestion & Order Line Tracing](#32-workflow-1-real-time-carrier-disruption-ingestion--order-line-tracing)
   - [3.3 Workflow 2: Adaptive Risk Scoring & Challenger ML Promotion Gate](#33-workflow-2-adaptive-risk-scoring--challenger-ml-promotion-gate)
   - [3.4 Workflow 3: AI Recovery Optimization & What-If Simulation Engine](#34-workflow-3-ai-recovery-optimization--what-if-simulation-engine)
   - [3.5 Workflow 4: Separation-of-Duties Two-Man Governance Approval Flow](#35-workflow-4-separation-of-duties-two-man-governance-approval-flow)
   - [3.6 Workflow 5: Warehouse Ground Execution (Dock Receiving, Barcode Scanning & Quarantine)](#36-workflow-5-warehouse-ground-execution-dock-receiving-barcode-scanning--quarantine)
   - [3.7 Workflow 6: Procurement Sourcing, Matrix Comparison & Statutory ₹25L Delegation Cap](#37-workflow-6-procurement-sourcing-matrix-comparison--statutory-25l-delegation-cap)
   - [3.8 Workflow 7: Execution Confirmation & Polygon Amoy Cryptographic Anchor](#38-workflow-7-execution-confirmation--polygon-amoy-cryptographic-anchor)
4. [Screen-Based Forensic Analysis (All 5 Roles + Public Suite)](#4-screen-based-forensic-analysis-all-5-roles--public-suite)
   - [4.1 Public & Authentication Experience (6 Public Screens + 5 Portals)](#41-public--authentication-experience-6-public-screens--5-portals)
   - [4.2 Operations Analyst Experience (14 Screens)](#42-operations-analyst-experience-14-screens)
   - [4.3 Supply Chain Manager Experience (20 Screens)](#43-supply-chain-manager-experience-20-screens)
   - [4.4 Warehouse Operator Experience (15 Screens)](#44-warehouse-operator-experience-15-screens)
   - [4.5 Procurement Approver Experience (11 Screens)](#45-procurement-approver-experience-11-screens)
   - [4.6 Platform Administrator Experience (8 Screens)](#46-platform-administrator-experience-8-screens)
5. [Deep Technical Invariants & Verification Matrix](#5-deep-technical-invariants--verification-matrix)
   - [5.1 Database Triggers & Relational Invariants](#51-database-triggers--relational-invariants)
   - [5.2 Smart Contract Specification (`TrustChainGovernance.sol`)](#52-smart-contract-specification-trustchaingovernancesol)
   - [5.3 ML Model Benchmarking & PR-AUC Gate Results](#53-ml-model-benchmarking--pr-auc-gate-results)
   - [5.4 Enterprise API Endpoint Specifications](#54-enterprise-api-endpoint-specifications)
6. [Deployment, Local Development & Testing Guide](#6-deployment-local-development--testing-guide)

---

## 1. Executive Summary & Core Value Proposition

Modern supply chains are brittle, siloed, and vulnerable to catastrophic cascading delays. When a maritime carrier faces port congestion or a typhoon grounds air cargo, enterprise ERPs merely flag a delayed shipment. They fail to answer three fundamental questions:
1. **True Downstream Impact:** Which exact customer order line items and promised SLA milestones does this delay breach?
2. **Actionable Feasibility:** Can stock be transferred from a secondary regional depot, or must an alternative qualified supplier be engaged under urgent procurement?
3. **Governance & Accountability:** Who has statutory authority to approve the spend, and how is the audit trail secured against post-incident tampering?

**TRUSTCHAIN** bridges this gap by unifying five core innovations:

```mermaid
flowchart TD
    subgraph P1["1. Line-Item Fulfillment Graph"]
        F1["Link Suppliers, Purchase Orders,<br/>Shipment Containers, Warehouses & Customer Orders"]
        F2["Single Source of Truth: Inventory Allocations<br/>draw from either Inbound Stock OR Warehouse Stock"]
    end

    subgraph P2["2. Dual-Engine Risk Scoring"]
        R1["PRD 6.58 Deterministic Baseline:<br/>Risk = 0.35D + 0.30S + 0.20I + 0.15P"]
        R2["Challenger Machine Learning Model:<br/>Promoted to production ONLY if PR-AUC beats formula"]
    end

    subgraph P3["3. Feasible Recovery Optimization"]
        O1["Multi-Scenario Generation:<br/>Depot Rebalance, Alternate Supplier, Expedited Carrier"]
        O2["Deterministic Constraint Checking:<br/>Available Warehouse Stock, Vendor MOQs & Lead Times"]
    end

    subgraph P4["4. Cryptographic Governance"]
        G1["Two-Man Separation of Duties:<br/>Authors cannot approve own plans"]
        G2["Polygon Amoy Smart Contract:<br/>Versioned SHA-256 Plan Hashes & Execution Sign-offs"]
    end

    P1 ==> P2 ==> P3 ==> P4

    classDef core fill:#1E293B,stroke:#3B82F6,color:#F8FAFC,stroke-width:2px;
    class P1,P2,P3,P4 core;
```

---

## 2. High-Level System Architecture

### 2.1 Multi-Tier Enterprise Architecture

The TRUSTCHAIN platform operates across a five-tier distributed architecture spanning mobile devices, edge APIs, predictive inference engines, relational databases, and decentralized blockchain networks.

```mermaid
flowchart TB
    subgraph Tier1[" Presentation Layer (Cross-Platform Mobile & Web)"]
        direction TB
        MOB["Expo SDK 58 / React Native 0.88<br/>(Android Pixel 7 Verified / iOS Compatible)"]
        subgraph Personas["5 Role Workspaces"]
            ANL["Operations Analyst<br/>14 Screens"]
            MGR["Supply Chain Manager<br/>20 Screens"]
            WHS["Warehouse Operator<br/>15 Screens (Camera/Barcode)"]
            PRC["Procurement Approver<br/>11 Screens (₹25L Cap)"]
            ADM["Administrator<br/>8 Screens (RBAC/Integrations)"]
        end
        WEB["Verification Portal<br/>(React + Vite + MetaMask Web3)"]
        MOB --- Personas
    end

    subgraph Tier2[" Gateway & Orchestration Layer (FastAPI)"]
        direction TB
        GW["FastAPI 0.115 Unified Gateway<br/>(Port 8000 / ASGI Uvicorn)"]
        AUTH_MW["Argon2id JWT Authentication & RBAC Guard"]
        SYNC_SVC["Live App Bootstrap & State Synchronizer<br/>(/api/v1/app/bootstrap)"]
        WEBHOOK["Carrier Webhook Ingestion Engine<br/>(HMAC-SHA256 Signature Verified)"]
    end

    subgraph Tier3[" Intelligence & Optimization Engines"]
        direction TB
        RISK_ENG["Adaptive Risk Engine<br/>(Formula Fallback + ML Scorer)"]
        CHALLENGER["Model Challenger & Promotion Gate<br/>(Temporal Split & PR-AUC Evaluator)"]
        REC_ENG["Recovery Recommendation Engine<br/>(Rule Constraint Filter + Heuristic Optimizer)"]
        AUDIT_ENG["Hash-Chained Audit Engine<br/>(SHA-256 Merkle Provenance)"]
    end

    subgraph Tier4[" Relational & Analytical Persistence"]
        direction TB
        PG[("PostgreSQL 16 / 18<br/>(52 Tables, 109 FKs, 63 Check Constraints)")]
        ALEMBIC["Alembic Database Migration Pipeline"]
        MODEL_STORE[("Joblib Model Store<br/>(Versioned .joblib ML Weights)")]
    end

    subgraph Tier5[" Cryptographic Governance (Decentralized Ledger)"]
        direction TB
        CONTRACT["TrustChainGovernance.sol<br/>(Solidity 0.8.24 on Polygon Amoy)"]
        REGISTRY["On-Chain Wallet Registry & Bitmask Categories"]
        HASH_ANCHOR["Plan Hash & Execution Evidence Merkle Anchor"]
    end

    %% Communications
    MOB -- "REST / JWT Bearer" --> GW
    WEB -- "Web3 RPC / EIP-1193" --> CONTRACT
    WEB -- "REST Verification" --> GW
    GW --> AUTH_MW --> SYNC_SVC
    GW --> WEBHOOK
    SYNC_SVC --> RISK_ENG
    SYNC_SVC --> REC_ENG
    SYNC_SVC --> AUDIT_ENG
    RISK_ENG --> MODEL_STORE
    CHALLENGER --> MODEL_STORE
    SYNC_SVC --> PG
    REC_ENG --> PG
    AUDIT_ENG --> PG
    GW -- "Web3.py Gas-Managed RPC" --> CONTRACT
    CONTRACT --- REGISTRY
    CONTRACT --- HASH_ANCHOR

    classDef presentation fill:#1E3A8A,stroke:#3B82F6,color:#FFFFFF,stroke-width:2px;
    classDef gateway fill:#0F766E,stroke:#14B8A6,color:#FFFFFF,stroke-width:2px;
    classDef engine fill:#581C87,stroke:#A855F7,color:#FFFFFF,stroke-width:2px;
    classDef storage fill:#374151,stroke:#9CA3AF,color:#FFFFFF,stroke-width:2px;
    classDef ledger fill:#701A75,stroke:#E879F9,color:#FFFFFF,stroke-width:2px;

    class Tier1,MOB,WEB,Personas,ANL,MGR,WHS,PRC,ADM presentation;
    class Tier2,GW,AUTH_MW,SYNC_SVC,WEBHOOK gateway;
    class Tier3,RISK_ENG,CHALLENGER,REC_ENG,AUDIT_ENG engine;
    class Tier4,PG,ALEMBIC,MODEL_STORE storage;
    class Tier5,CONTRACT,REGISTRY,HASH_ANCHOR ledger;
```

---

### 2.2 Technical Component Boundary & Network Topology

```mermaid
graph LR
    subgraph Edge["Perimeter / Ingress"]
        C1["Carrier Webhook Ingress<br/>Port 8000 / HTTPS"]
        C2["Mobile App Ingress<br/>Port 8081 / Expo Metro"]
        C3["Web Portal Ingress<br/>Port 5173 / Vite HTTP"]
    end

    subgraph Core["TRUSTCHAIN Core Boundary"]
        API["FastAPI Orchestrator"]
        OPS["Operations Workflow Service"]
        RISK["Risk Scoring Service"]
        CHAIN["Blockchain Gateway Service"]
        DB[("PostgreSQL DB<br/>Port 5432")]
    end

    subgraph External["External Network Services"]
        CARRIERS["Maritime & Air Logistics APIs<br/>(OceanTrans, DHL, Maersk)"]
        POLYGON["Polygon Amoy Testnet RPC<br/>(Alchemy / Infura / Public RPC)"]
    end

    CARRIERS -- "HMAC-Signed Webhooks" --> C1
    C1 --> API
    C2 -- "JWT Authenticated REST" --> API
    C3 -- "Web3 Signing" --> POLYGON
    C3 -- "JSON Verification" --> API
    API --> OPS
    API --> RISK
    API --> CHAIN
    OPS --> DB
    RISK --> DB
    CHAIN --> DB
    CHAIN -- "Web3.py Client" --> POLYGON

    classDef edgeStyle fill:#0369A1,stroke:#0284C7,color:#FFFFFF;
    classDef coreStyle fill:#1F2937,stroke:#4B5563,color:#FFFFFF;
    classDef extStyle fill:#4C1D95,stroke:#6D28D9,color:#FFFFFF;

    class C1,C2,C3 edgeStyle;
    class API,OPS,RISK,CHAIN,DB coreStyle;
    class CARRIERS,POLYGON extStyle;
```

---

### 2.3 Relational Data Architecture (52 Tables across 7 Domains)

The database schema is strictly partitioned into seven distinct bounded contexts in [`backend/app/models/`](file:///d:/FIMAL/overclock/backend/app/models). The physical relationship graph below highlights the critical data pipeline connecting late shipments to affected customer order lines.

```mermaid
erDiagram
    %% Identity Domain
    ORGANIZATIONS ||--o{ USERS : "employs"
    ORGANIZATIONS ||--o{ ROLES : "configures"
    USERS ||--o{ USER_ROLES : "assigned"
    ROLES ||--o{ ROLE_PERMISSIONS : "authorizes"
    ROLES ||--o{ APPROVAL_AUTHORITIES : "bounds"
    USERS ||--o{ SESSIONS : "authenticates"
    USERS ||--o{ USER_WAREHOUSE_ASSIGNMENTS : "stationed at"

    %% Supply Chain Domain
    SUPPLIERS ||--o{ SUPPLIER_PRODUCTS : "manufactures"
    PRODUCTS ||--o{ SUPPLIER_PRODUCTS : "supplied by"
    SUPPLIERS ||--o{ PURCHASE_ORDERS : "receives"
    PURCHASE_ORDERS ||--o{ PURCHASE_ORDER_ITEMS : "specifies"
    PURCHASE_ORDERS ||--o{ SHIPMENTS : "fulfilled by"
    CARRIERS ||--o{ SHIPMENTS : "transports"
    WAREHOUSES ||--o{ SHIPMENTS : "destination"
    SHIPMENTS ||--o{ SHIPMENT_ITEMS : "carries"
    SHIPMENTS ||--o{ CARRIER_EVENTS : "tracked by"

    %% Inventory & Orders Domain
    WAREHOUSES ||--o{ INVENTORY : "stores"
    PRODUCTS ||--o{ INVENTORY : "stocked as"
    CUSTOMER_ORDERS ||--o{ ORDER_ITEMS : "contains"
    ORDER_ITEMS ||--o{ FULFILMENT_ALLOCATIONS : "reserved by"
    INVENTORY ||--o{ FULFILMENT_ALLOCATIONS : "allocates stock"
    SHIPMENT_ITEMS ||--o{ FULFILMENT_ALLOCATIONS : "allocates inbound"

    %% Intelligence & Recovery Domain
    SHIPMENTS ||--o{ DISRUPTIONS : "triggers"
    DISRUPTIONS ||--o{ DISRUPTION_IMPACTS : "computes"
    ORDER_ITEMS ||--o{ RISK_ASSESSMENTS : "scored by"
    DISRUPTIONS ||--o{ RECOVERY_PLANS : "resolved by"
    RECOVERY_PLANS ||--o{ RECOVERY_ACTIONS : "contains"
    RECOVERY_PLANS ||--o{ APPROVALS : "vetted by"
    RECOVERY_PLANS ||--o{ EXECUTION_RUNS : "executed in"
    EXECUTION_RUNS ||--o{ EXECUTION_STEPS : "performs"

    %% Governance & Audit Domain
    ORGANIZATIONS ||--o{ AUDIT_LOGS : "immutable trail"
    APPROVALS ||--o{ ON_CHAIN_TRANSACTIONS : "anchored as"
```

> [!IMPORTANT]
> **Mutual Exclusivity Invariant in `FULFILMENT_ALLOCATIONS`:**  
> A fulfillment allocation must draw **either** from physical stock on hand (`inventory_id`) **or** from an inbound transit shipment item (`shipment_item_id`), enforced via a strict SQL Check Constraint:  
> `CHECK ((inventory_id IS NOT NULL AND shipment_item_id IS NULL) OR (inventory_id IS NULL AND shipment_item_id IS NOT NULL))`  
> This mathematical invariant prevents phantom inventory duplication and ensures a delayed vessel *only* impacts orders explicitly linked to that consignment.

---

### 2.4 Dual-Engine Adaptive Risk Architecture

The risk scoring subsystem balances **operational safety** with **predictive accuracy**. A system should never be at the mercy of an uncalibrated machine learning model, nor should it remain tied to static formulas when real-world patterns change.

```mermaid
flowchart TD
    subgraph Ingestion["1. Operational Telemetry Ingestion"]
        D["Disruption Event<br/>(Hours Delayed, Location, Root Cause)"]
        O["Customer Order Item<br/>(Units, SLA Deadline, Revenue, Priority Tier)"]
        I["Inventory Balances<br/>(On Hand, Safety Buffer, Quarantine)"]
    end

    subgraph FeatureEngineering["2. Leakage-Proof Feature Pipeline"]
        F1["Deadline Urgency: 100 - (hours_to_deadline / 168.0) * 100"]
        F2["Shortage Severity: (shortage_qty / required_qty) * 100"]
        F3["Disruption Impact: (reported_delay / 336.0) * 100"]
        F4["Business Priority: Tier 1=100, Tier 2=75, Tier 3=50, Tier 4=25"]
    end

    subgraph DualEngines["3. Dual-Scoring Pathways"]
        subgraph Baseline["Deterministic PRD 6.58 Formula"]
            FORMULA["Risk = 0.35*D + 0.30*S + 0.20*I + 0.15*P"]
        end

        subgraph Challenger["Adaptive Machine Learning Engine"]
            TRAIN["Historical Shipment & Order Outcomes"]
            RF["RandomForest / GradientBoosting Regressor"]
            PR_GATE{"Challenger PR-AUC<br/>> Baseline PR-AUC?"}
            LIVE_MODEL["Production ML Weights<br/>(.joblib)"]
            REJECT_LOG["Log Rejection & Retain Current Model"]
        end
    end

    subgraph Resolution["4. Runtime Risk Resolution"]
        DECIDER{"Is Active ML Model<br/>Promoted & Healthy?"}
        SCORE_ML["Score = ML P(Miss) × Business Priority Weight"]
        SCORE_FORM["Score = Formula Composite (0 - 100)"]
        FINAL_SCORE["Unified Risk Assessment<br/>(Score, Category, Explainability Factors, Model Version)"]
    end

    D & O & I --> FeatureEngineering
    FeatureEngineering --> Baseline
    FeatureEngineering --> Challenger
    TRAIN --> RF --> PR_GATE
    PR_GATE -- Yes --> LIVE_MODEL
    PR_GATE -- No --> REJECT_LOG
    LIVE_MODEL --> DECIDER
    DECIDER -- Valid ML --> SCORE_ML --> FINAL_SCORE
    DECIDER -- Fallback / No ML --> SCORE_FORM --> FINAL_SCORE

    classDef ingStyle fill:#1E293B,stroke:#64748B,color:#F8FAFC;
    classDef gateStyle fill:#78350F,stroke:#D97706,color:#FEF3C7;
    classDef liveStyle fill:#064E3B,stroke:#059669,color:#D1FAE5;
    classDef formulaStyle fill:#1E3A8A,stroke:#2563EB,color:#DBEAFE;

    class Ingestion,FeatureEngineering ingStyle;
    class PR_GATE,DECIDER gateStyle;
    class LIVE_MODEL,SCORE_ML liveStyle;
    class Baseline,SCORE_FORM formulaStyle;
```

---

### 2.5 Decentralized Blockchain Governance & Evidence Anchoring

All critical governance actions are anchored onto the **Polygon Amoy Testnet** via [`TrustChainGovernance.sol`](file:///d:/FIMAL/overclock/blockchain/contracts/TrustChainGovernance.sol). To ensure maximum enterprise privacy and GDPR compliance, zero PII or operational payloads are stored on-chain. Only 32-byte cryptographic hashes are anchored.

```mermaid
flowchart TB
    subgraph OffChain[" Off-Chain Enterprise Boundary (Private & Fast)"]
        PLAN["Recovery Plan Payload JSON<br/>(Actions, Cost, Affected SKUs, Simulation Metrics)"]
        ACTOR["Author: Operations Analyst<br/>UUID: usr_7719a8"]
        HASH_CALC["Deterministic Canonical SHA-256 Hasher"]
        PAYLOAD_HASH["Plan Hash: 0x8f2a17cb6e94...31"]
    end

    subgraph SmartContract[" Polygon Amoy Decentralized Ledger (TrustChainGovernance.sol)"]
        REGISTRY["Wallet Registry<br/>(Category Bitmasks & Org ID)"]
        
        subgraph StateStore["Immutable Governance Storage"]
            V_HASH["Plan Versions Mapping<br/>planHash[planKey][version]"]
            V_STAGE["Required Stages Bitmask<br/>(e.g., SCM | Procurement)"]
            V_DECISION["Approver Decisions Mapping<br/>decided[planKey][version][wallet]"]
            V_EXEC["Execution Evidence Store<br/>executionEvidence[planKey][version]"]
        end

        subgraph Invariants["On-Chain Governance Constraints"]
            INV1["Separation of Duties:<br/>msg.sender != planCreator"]
            INV2["Version Staleness Check:<br/>version == currentVersion"]
            INV3["Role Qualification Check:<br/>registry[msg.sender].cat & requiredStage"]
            INV4["Duplicate Decision Block:<br/>!decided[planKey][v][msg.sender]"]
        end
    end

    PLAN --> HASH_CALC
    ACTOR --> HASH_CALC
    HASH_CALC --> PAYLOAD_HASH

    PAYLOAD_HASH -- "anchorPlanVersion(planKey, version, hash, stages)" --> V_HASH
    REGISTRY --> Invariants
    Invariants --> V_DECISION
    V_DECISION --> V_STAGE
    V_STAGE -- "All Stages Completed" --> V_EXEC

    classDef offStyle fill:#1E293B,stroke:#475569,color:#F8FAFC;
    classDef onStyle fill:#4A044E,stroke:#C026D3,color:#FDF4FF;
    classDef invStyle fill:#831843,stroke:#DB2777,color:#FDF2F8;

    class OffChain,PLAN,ACTOR,HASH_CALC,PAYLOAD_HASH offStyle;
    class SmartContract,REGISTRY,StateStore,V_HASH,V_STAGE,V_DECISION,V_EXEC onStyle;
    class Invariants,INV1,INV2,INV3,INV4 invStyle;
```

---

### 2.6 Enterprise Identity, RBAC & Multi-Tenant Isolation

TRUSTCHAIN enforces strict tenant separation and zero-trust role segregation. An actor assigned to one role cannot execute actions assigned to another:

```mermaid
graph TD
    subgraph OrgLevel["Enterprise Tenant (Organization: ORG-APEX-GLOBAL)"]
        ADMIN["Platform Administrator<br/>(Elena Rostova)"]
        SCM["Supply Chain Manager<br/>(Marcus Vance)"]
        ANL["Operations Analyst<br/>(Devon Ward)"]
        PRC["Procurement Approver<br/>(Priya Sharma)"]
        WHS["Warehouse Operator<br/>(Rohit Verma)"]
    end

    subgraph AuthorityCeiling["Statutory Delegation & Authority Ceilings"]
        C_ADMIN["Full Tenant Control, User Lifecycle & Security Audit"]
        C_SCM["Recovery Plan Authorization & Final Execution Sign-Off"]
        C_ANL["Root-Cause Investigation & Scenario Simulation"]
        C_PRC["Commercial PO Issuance (Bounded by ₹25,00,000 Cap)"]
        C_WHS["Physical Barcode Receiving, Damage Hold & Depot Transfer"]
    end

    ADMIN --> C_ADMIN
    SCM --> C_SCM
    ANL --> C_ANL
    PRC --> C_PRC
    WHS --> C_WHS

    classDef roleStyle fill:#0F172A,stroke:#38BDF8,color:#F0F9FF;
    class ADMIN,SCM,ANL,PRC,WHS,C_ADMIN,C_SCM,C_ANL,C_PRC,C_WHS roleStyle;
```

---

## 3. End-to-End Operational Workflows

### 3.1 The 12-Stage Disruption Resolution Lifecycle

Every real-world disruption moves through twelve strictly governed stages:

```mermaid
flowchart LR
    S1["1. SENSE<br/>Carrier Webhook"] --> S2["2. CONNECT<br/>Line-Item Graph"]
    S2 --> S3["3. DETECT<br/>Delay Threshold"]
    S3 --> S4["4. TRACE<br/>Downstream Order"]
    S4 --> S5["5. PRIORITIZE<br/>Risk Score / SLA"]
    S5 --> S6["6. RECOMMEND<br/>AI / Optimization"]
    S6 --> S7["7. SIMULATE<br/>Cost / Time / Feas."]
    S7 --> S8["8. OPTIMIZE<br/>Constraint Sift"]
    S8 --> S9["9. APPROVE<br/>Separation of Duty"]
    S9 --> S10["10. CONFIRM<br/>Manager Execution"]
    S10 --> S11["11. EXECUTE<br/>Ground Operations"]
    S11 --> S12["12. VERIFY<br/>Polygon Amoy Proof"]

    classDef step fill:#1E293B,stroke:#0EA5E9,color:#FFFFFF,stroke-width:2px;
    class S1,S2,S3,S4,S5,S6,S7,S8,S9,S10,S11,S12 step;
```

---

### 3.2 Workflow 1: Real-Time Carrier Disruption Ingestion & Order Line Tracing

```mermaid
sequenceDiagram
    autonumber
    actor Carrier as Maritime / Air Logistics Carrier
    participant Gateway as FastAPI Ingestion Webhook
    participant DB as PostgreSQL Core Schema
    participant Engine as Impact Tracing Engine
    actor Analyst as Operations Analyst

    Carrier->>Gateway: POST /api/v1/webhooks/carriers/simulated (HMAC-SHA256)
    Note over Gateway: Validate HMAC Signature against TRUSTCHAIN_WEBHOOK_SECRET
    Gateway->>DB: Check idempotency via carrier_events (source, event_id)
    alt Duplicate Event Detected
        Gateway-->>Carrier: 200 OK (Event already processed)
    else New Authentic Event
        Gateway->>DB: Record carrier_event & update shipment current_eta
        Gateway->>Engine: Trigger trace_disruption_impact(shipment_id)
        Engine->>DB: Query shipment_items -> fulfilment_allocations -> order_items
        Engine->>DB: Calculate revenue at risk, delay delta & SLA breaches
        Engine->>DB: Insert disruption & disruption_impacts records
        Engine-->>Gateway: Disruption context resolved
        Gateway-->>Carrier: 201 Created (Disruption ID: DIS-2026-8812)
        Gateway->>Analyst: Real-time alert feed updated (Notification + Push)
    end
```

---

### 3.3 Workflow 2: Adaptive Risk Scoring & Challenger ML Promotion Gate

```mermaid
sequenceDiagram
    autonumber
    participant System as Automated Retraining Scheduler
    participant Engine as Risk Engine (training.py)
    participant Formula as Deterministic Baseline (formula.py)
    participant ModelStore as Versioned Model Registry
    participant App as Mobile Client

    System->>Engine: Trigger periodic retraining with newly closed shipments
    Engine->>Engine: Extract temporal train/test split (prevent lookahead leakage)
    Engine->>Formula: Compute baseline PR-AUC on holdout validation set
    Formula-->>Engine: Baseline Metric: PR-AUC = 0.720
    Engine->>Engine: Train Random Forest Challenger on engineered features
    Engine->>Engine: Compute Challenger PR-AUC on holdout validation set
    alt Challenger PR-AUC (0.836) > Baseline PR-AUC (0.720)
        Engine->>ModelStore: Promote challenger to production (save .joblib artifact)
        Engine->>ModelStore: Update active model metadata (version: "rf-v2.1", PR-AUC: 0.836)
        Note over ModelStore: Status: Went Live
    else Challenger Underperforms
        Engine->>ModelStore: Reject challenger & preserve existing model
        Note over ModelStore: Status: Rejected (Keep Current Scoring)
    end
    App->>Engine: Fetch order risk assessment
    Engine-->>App: Return score, risk tier, feature contributions & active model version
```

---

### 3.4 Workflow 3: AI Recovery Optimization & What-If Simulation Engine

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Operations Analyst
    participant API as FastAPI /api/v1/ai/disruptions
    participant RecEngine as Recommendation Engine (policy.py)
    participant DB as PostgreSQL Inventory & Suppliers
    participant SimEngine as Simulation Engine

    Analyst->>API: Request recovery recommendations for Disruption DIS-001
    API->>RecEngine: Formulate candidate recovery plans
    RecEngine->>DB: Query available inventory across secondary warehouses (WH-BLR, WH-DEL)
    RecEngine->>DB: Query qualified alternative suppliers & contracted lead times
    RecEngine->>RecEngine: Filter infeasible options (stockouts, unqualified vendors)
    RecEngine->>SimEngine: Simulate 3 distinct recovery strategies:
    Note over SimEngine: Plan A: Depot Stock Rebalance (WH-BLR -> WH-MUM)<br/>Plan B: Expedited Air Freight from Tier-2 Supplier<br/>Plan C: Split Allocation & Customer Re-scheduling
    SimEngine-->>RecEngine: Compute cost delta, SLA recovery %, and risk reduction
    RecEngine-->>API: Ranked recovery proposals with explainability rationale
    API-->>Analyst: Display Recovery Options with What-If Simulation sliders
```

---

### 3.5 Workflow 4: Separation-of-Duties Two-Man Governance Approval Flow

```mermaid
sequenceDiagram
    autonumber
    actor Analyst as Operations Analyst (Devon Ward)
    participant API as FastAPI Gateway
    actor Manager as Supply Chain Manager (Marcus Vance)
    participant Contract as Polygon Amoy (TrustChainGovernance.sol)

    Analyst->>API: Draft & finalize recovery plan v1
    Analyst->>API: POST /api/v1/recovery/plans/PLN-402/submit
    API->>Contract: anchorPlanVersion(planKey, v1, planHash, SCM_STAGE)
    Contract-->>API: Event PlanVersionAnchored emitted
    API-->>Analyst: Plan submitted & status transitioned to UNDER_REVIEW

    Note over Analyst,API: ILLEGAL ATTEMPT: Analyst tries to self-approve
    Analyst-xAPI: POST /api/v1/approvals/PLN-402/approve
    API--xAnalyst: 403 FORBIDDEN (Creator cannot approve own plan)

    Manager->>API: GET /api/v1/app/bootstrap (Fetches pending approvals)
    Manager->>API: Reviews cost (₹1,45,000), SLA impact (+94%), and simulation
    Manager->>API: POST /api/v1/approvals/PLN-402/approve (with comments)
    API->>Contract: recordDecision(planKey, v1, DECISION_APPROVE)
    Contract-->>API: Event DecisionRecorded emitted
    API-->>Manager: Plan state updated to APPROVED
```

---

### 3.6 Workflow 5: Warehouse Ground Execution (Dock Receiving, Barcode Scanning & Quarantine)

```mermaid
sequenceDiagram
    autonumber
    actor Operator as Warehouse Operator (Rohit Verma)
    participant Scanner as Expo Camera / Hardware Scanner
    participant WHS_App as Mobile App (warehouseService)
    participant DB as Inventory Ledger & Quarantine Bay

    Operator->>Scanner: Scan inbound consignment barcode (SHP-101)
    Scanner-->>WHS_App: Decoded EAN-13 / Code 128
    WHS_App->>Operator: Display Consignment Manifest & Expected Qty (500 units)
    Operator->>WHS_App: Enter physical tally (495 intact, 5 crushed/water damaged)
    Operator->>WHS_App: Capture physical photo evidence of damaged cartons
    Operator->>WHS_App: Tap "Submit Goods Receipt & Quarantine Hold"
    WHS_App->>DB: Add 495 units to Available Stock in Bin B3-R12-S2
    WHS_App->>DB: Isolate 5 units into Quarantine Lockbox Bay Q1 (Hold)
    WHS_App->>DB: Generate immutable Receipt GR-430864 & Incident DMG-8877
    WHS_App-->>Operator: Display Crypto Transaction Receipt (0x21f8c3566c0d68de)
```

---

### 3.7 Workflow 6: Procurement Sourcing, Matrix Comparison & Statutory ₹25L Delegation Cap

```mermaid
sequenceDiagram
    autonumber
    actor Approver as Procurement Approver (Priya Sharma)
    participant App as Mobile App (procurementService)
    participant Policy as Delegation Limit Engine

    Approver->>App: Open Sourcing Request PR-2026-085 (Value: ₹28,50,000)
    App->>Policy: Evaluate request amount against Level 4 Ceiling (₹25,00,000)
    Policy-->>App: VIOLATION: Exceeds individual delegation threshold (+₹3,50,000)
    App->>Approver: Render Red Warning Banner & Lock Unilateral Approval Button
    Note over Approver,App: Approver can only "Request Changes" or "Escalate for Co-signature"

    Approver->>App: Open Alternative Sourcing Matrix for PR-2026-089 (Value: ₹18,70,000)
    Approver->>App: Compare Global Silicon Fab (Current) vs Nippon Precision (Alternative)
    Note over App: Compares Lead Time (14d vs 10d), Unit Cost (₹2,200 vs ₹2,000), MOQ & Quality
    Approver->>App: Authorize & Issue Purchase Order
    App->>App: Transition PR status to APPROVED & generate PO-2026-7049
    App->>App: Emit Audit Event & anchor ledger transaction hash (0xc2738ede7b00c156)
```

---

### 3.8 Workflow 7: Execution Confirmation & Polygon Amoy Cryptographic Anchor

```mermaid
stateDiagram-v2
    [*] --> DRAFT : Created by Analyst
    DRAFT --> SIMULATED : Scenarios Simulated
    SIMULATED --> SUBMITTED : Hash Anchored on Polygon
    SUBMITTED --> UNDER_REVIEW : In SCM Queue
    
    UNDER_REVIEW --> REVISION_REQUIRED : Approver requests edits
    REVISION_REQUIRED --> DRAFT : New Version v2 generated
    
    UNDER_REVIEW --> REJECTED : Permanently Rejected
    REJECTED --> [*]
    
    UNDER_REVIEW --> APPROVED : Signed by Authorized SCM
    APPROVED --> EXECUTION_PENDING : Explicit Confirmation Required
    
    EXECUTION_PENDING --> EXECUTING : Dispatching Orders / Transfers
    EXECUTING --> COMPLETED : All Actions Verified
    EXECUTING --> PARTIAL_FAILURE : Warehouse / Carrier Exception
    
    PARTIAL_FAILURE --> MANUAL_REVIEW : Escalation to Executive
    COMPLETED --> [*] : Final Proof Anchored On-Chain
```

---

## 4. Screen-Based Forensic Analysis (All 5 Roles + Public Suite)

TRUSTCHAIN's frontend comprises **91 total route files** in [`src/app/`](file:///d:/FIMAL/overclock/src/app) (**73 dedicated interactive screens** and **18 layout navigators**), strictly typed and running on Expo Router SDK 58.

---

### 4.1 Public & Authentication Experience (6 Public Screens + 5 Portals)

```mermaid
flowchart TD
    WELCOME["Welcome / Landing<br/>(index.tsx)"] --> ONBOARDING["Product Onboarding<br/>3 Carousel Slides"]
    ONBOARDING --> ROLE_SELECT["Role Selector Grid<br/>5 Enterprise Personas"]
    ROLE_SELECT --> SIGNIN["Universal Sign-In<br/>Email / Password"]
    ROLE_SELECT --> PORTALS["Dedicated Direct Portals<br/>(auth)/*"]
    SIGNIN --> WORKSPACE["Workspace Tenant Picker<br/>(choose-workspace.tsx)"]
    WORKSPACE --> DASHBOARD["Protected Central Dashboard<br/>(dashboard.tsx)"]

    classDef pubStyle fill:#1E293B,stroke:#38BDF8,color:#F0F9FF;
    class WELCOME,ONBOARDING,ROLE_SELECT,SIGNIN,PORTALS,WORKSPACE,DASHBOARD pubStyle;
```

#### Screen Catalog & Forensic Details:
1. **Welcome / Landing (`src/app/index.tsx`)**: Enterprise brand splash, value proposition showcase, animated login CTA, and system status indicator.
2. **Onboarding Carousel (`src/app/(public)/onboarding.tsx`)**: 3-step interactive feature progression highlighting Line-Item Tracing, Machine Learning Risk Scoring, and Cryptographic Governance.
3. **Role Selection Grid (`src/app/(public)/role-selection.tsx`)**: Visual enterprise card grid displaying credentials, duties, and demo login shortcuts for all 5 enterprise personas.
4. **Universal Sign-In (`src/app/(public)/signin.tsx`)**: Argon2id password authentication, email validation, session token issuance, and SecureStore hardware key persistence.
5. **Registration (`src/app/(public)/signup.tsx`)**: Multi-tenant employee provisioning and organizational domain assignment.
6. **Password Recovery (`src/app/(public)/forgot-password.tsx`)**: Secure token request and password reset workflow.
7. **Workspace Tenant Picker (`src/app/(public)/choose-workspace.tsx`)**: Multi-facility context switcher allowing users to select active organizational units (e.g., `ORG-APEX-GLOBAL`).
8. **Role-Specific Auth Portals (`src/app/(auth)/[role].tsx`)**:
   - `operations-analyst.tsx`: Pre-filled demo credentials for Devon Ward (`analyst@trustchain.com`).
   - `supply-chain-manager.tsx`: Pre-filled demo credentials for Marcus Vance (`manager@trustchain.com`).
   - `warehouse-operator.tsx`: Pre-filled demo credentials for Rohit Verma (`warehouse@trustchain.com`).
   - `procurement-approver.tsx`: Pre-filled demo credentials for Priya Sharma (`procurement@trustchain.com`).
   - `administrator.tsx`: Pre-filled demo credentials for Elena Rostova (`admin@trustchain.com`).

---

### 4.2 Operations Analyst Experience (14 Screens)

The Operations Analyst workspace (`src/app/(protected)/operations-analyst/`) is dedicated to root-cause investigation, downstream impact propagation, and scenario simulation.

```mermaid
flowchart TD
    ANL_HOME["Analyst Home<br/>(home.tsx)"] --> DISR_DIR["Disruptions Directory<br/>(disruptions/index.tsx)"]
    DISR_DIR --> DISR_DETAIL["Disruption Root-Cause<br/>(disruptions/[id]/index.tsx)"]
    DISR_DETAIL --> IMPACT_TRACE["Order Line Impact Tracing<br/>(disruptions/[id]/impact.tsx)"]
    IMPACT_TRACE --> REC_PROPOSALS["Recovery Recommendations<br/>(recovery/recommendations.tsx)"]
    REC_PROPOSALS --> SIMULATION["What-If Simulation<br/>(recovery/simulation.tsx)"]
    SIMULATION --> PLAN_REVIEW["Plan Formulation & Submit<br/>(recovery/review.tsx)"]
    PLAN_REVIEW --> EXEC_TRACK["Execution Tracking<br/>(recovery/execution.tsx)"]

    classDef anlStyle fill:#0F172A,stroke:#2563EB,color:#EFF6FF;
    class ANL_HOME,DISR_DIR,DISR_DETAIL,IMPACT_TRACE,REC_PROPOSALS,SIMULATION,PLAN_REVIEW,EXEC_TRACK anlStyle;
```

#### Detailed Screen Breakdown:
1. **Analyst Command Home (`home.tsx`)**:
   - **UI Hierarchy:** Navy header (`#10234D`), disruption summary chips (Critical: 2, High: 3, Moderate: 1), active affected order counters, and disruption feed with severity pills.
   - **Data Binding:** Synchronized to `operationsService` observable store and live `/api/v1/app/bootstrap` endpoint via `backendSync.ts`.
2. **Disruptions Feed & Directory (`disruptions/index.tsx`)**:
   - Multi-parameter search bar, category chips (`All`, `Shipment`, `Supplier`, `Inventory`), and severity badges (`Critical`, `High`, `Moderate`, `Low`).
3. **Disruption Root Cause & Dossier (`disruptions/[id]/index.tsx`)**:
   - Detailed breakdown of delayed vessel/flight, origin, destination port, delay delta (e.g., +96h), and carrier telemetry notes.
4. **Line-Item Impact Tracing (`disruptions/[id]/impact.tsx`)**:
   - Visual dependency graph linking carrier shipment items to customer order line items. Displays total units at risk and SLA breach probabilities.
5. **Predictive Risk Analysis (`risk.tsx`)**:
   - Interactive SVG Risk Donut Chart illustrating risk score distribution across the four formula components (Deadline, Shortage, Disruption, Priority).
6. **Affected Orders Directory (`orders.tsx`)**:
   - Tabular directory of individual customer order lines with customer tiering (Tier 1 Enterprise vs Tier 4 Standard) and revenue impact.
7. **Recovery Recommendations Hub (`recovery/recommendations.tsx`)**:
   - AI-assisted recovery actions grouped into Depot Stock Rebalancing, Alternative Vendor Sourcing, and Carrier Rerouting.
8. **What-If Simulation Engine (`recovery/simulation.tsx`)**:
   - Interactive recovery sliders allowing analysts to model cost trade-offs vs SLA recovery percentages before plan finalization.
9. **Plan Formulation & Submission (`recovery/review.tsx`)**:
   - Plan summary dossier, required approval stage configuration, and cryptographic hash anchoring invocation. Enforces mandatory review notes.
10. **Plan Execution Monitoring (`recovery/execution.tsx`)**:
    - Real-time step progress tracker showing milestone completion across participating warehouses and carriers.
11. **Notifications Center (`notifications.tsx`)**:
    - Critical alerts feed with instant deep-linking to newly flagged disruptions.
12. **Analyst Profile & Security (`profile.tsx`)**:
    - Hardware session management, active JWT credentials, role verification badge, and secure sign-out.

---

### 4.3 Supply Chain Manager Experience (20 Screens)

The Supply Chain Manager suite (`src/app/(protected)/supply-chain-manager/`) provides executive oversight, geospatial logistics tracking, and multi-tier approval governance.

```mermaid
flowchart TD
    MGR_HOME["Manager Command Center<br/>(home.tsx)"] --> NET_MAP["Geospatial Network Map<br/>(network.tsx)"]
    MGR_HOME --> APPR_QUEUE["Approvals Queue<br/>(approvals/index.tsx)"]
    APPR_QUEUE --> APPR_DECISION["Two-Man Approval Matrix<br/>(approvals/[id]/decision.tsx)"]
    MGR_HOME --> AUDIT_VIEW["Hash-Chained Audit Ledger<br/>(audit.tsx)"]
    MGR_HOME --> SUPP_COMP["Supplier Compare Matrix<br/>(suppliers/compare.tsx)"]
    MGR_HOME --> WH_OVERVIEW["Depot Balances<br/>(warehouses.tsx)"]

    classDef mgrStyle fill:#042F2E,stroke:#0D9488,color:#CCFBF1;
    class MGR_HOME,NET_MAP,APPR_QUEUE,APPR_DECISION,AUDIT_VIEW,SUPP_COMP,WH_OVERVIEW mgrStyle;
```

#### Detailed Screen Breakdown:
1. **Executive Operations Command (`home.tsx`)**:
   - High-level KPIs: Global Network Health (92.4%), Pending Approvals (3), Active Disruptions (4), and On-Chain Anchored Plans (12).
2. **Interactive Geospatial Network Map (`network.tsx`)**:
   - Live multi-tier logistics mapping with precalculated great-circle maritime and air routes (`precalculatedRoutes.json`), harbor pins, and bottleneck markers.
3. **Approvals Management Queue (`approvals/index.tsx`)**:
   - Filterable queue of submitted recovery plans awaiting managerial sign-off. Highlights financial cost, SLA impact, and plan creator.
4. **Two-Man Approval & Co-signing Modal (`approvals/[id]/decision.tsx`)**:
   - Executive decision interface. Enforces **Separation of Duties** (blocks approval if the manager authored the plan). Options: `Approve`, `Request Revision`, `Reject`.
5. **Hash-Chained Audit Trail (`audit.tsx`)**:
   - Immutable timeline of organizational actions. Displays previous hash, current block hash, actor identity, and Polygon transaction links.
6. **Supplier Reliability & Benchmarking (`suppliers/index.tsx` & `[id].tsx`)**:
   - Supplier dossiers tracking on-time delivery (OTD %), quality defect PPM, and active purchase order obligations.
7. **Head-to-Head Supplier Comparison (`suppliers/compare.tsx`)**:
   - Side-by-side benchmarking of primary vs contingency suppliers.
8. **Warehouse Network Directory (`warehouses.tsx`)**:
   - Inventory levels, available storage capacity, and quarantine hold tallies across global regional distribution centers (`WH-MUM`, `WH-BLR`, `WH-DEL`).

---

### 4.4 Warehouse Operator Experience (15 Screens)

The Warehouse Operator suite (`src/app/(protected)/warehouse-operator/`) interfaces directly with native physical device hardware, enabling camera barcode scanning, photo evidence capture, and quarantine segregation.

```mermaid
flowchart TD
    WHS_HOME["Warehouse Floor Home<br/>(home.tsx)"] --> SCAN["Camera Barcode Scanner<br/>(scan.tsx)"]
    SCAN --> PROD_DETAIL["SKU Inventory Details<br/>(product/[sku].tsx)"]
    WHS_HOME --> RECEIVING["Goods Dock Receiving<br/>(receiving.tsx)"]
    WHS_HOME --> DAMAGE["Defect Quarantine Report<br/>(damage-report.tsx)"]
    WHS_HOME --> INVENTORY["Depot Bin Balances<br/>(inventory.tsx)"]
    WHS_HOME --> TRANSFER["Inter-Depot Stock Transfer<br/>(stock-transfer.tsx)"]
    WHS_HOME --> MAP["2D Warehouse Floor Map<br/>(warehouse-map.tsx)"]

    classDef whsStyle fill:#1C1917,stroke:#F59E0B,color:#FEF3C7;
    class WHS_HOME,SCAN,PROD_DETAIL,RECEIVING,DAMAGE,INVENTORY,TRANSFER,MAP whsStyle;
```

#### Detailed Screen Breakdown:
1. **Warehouse Floor Command (`home.tsx`)**:
   - Shift KPIs (Pending Picks: 8, Inbound Docks: 3, Active Transfers: 2, Stock Under QA: 60 units), operator shift card, and emergency disruption alert banner.
2. **Barcode & QR Camera Scanner (`scan.tsx`)**:
   - Native hardware viewfinder via `expo-camera`, torch toggle, target reticle, multi-format decoder (EAN-13, QR, Code 128), and manual SKU entry fallback.
3. **Product Inventory Dossier (`product/[sku].tsx`)**:
   - Complete SKU breakdown: Total Units, Available, Reserved, Quarantined, Unit Cost, and exact 2D Storage Coordinates (`Aisle B3 · Rack 12 · Shelf 2`).
4. **Dock Goods Receiving (`receiving.tsx`)**:
   - Inbound consignment tally, tamper seal verification, physical quantity stepper, defect tally, and cryptographic receipt generation (`GR-430864`).
5. **Defect & Damage Quarantine Report (`damage-report.tsx`)**:
   - Mandatory quarantine segregation protocol. Photo evidence uploader (`expo-image-picker`), defect taxonomy (Physical, Water, Packaging), and automatic transfer to Quarantine Bay Q1.
6. **Depot Inventory Ledger (`inventory.tsx`)**:
   - Bin-level ledger tracking available vs quarantined units with search and filter tabs (`All`, `In Stock`, `Low Stock`, `Quarantined`).
7. **Inter-Depot Stock Transfer Request (`stock-transfer.tsx`)**:
   - Dual-signoff inter-depot rebalancing interface (`WH-MUM` to `WH-BLR`). Automatically dispatches approval requests to the Supply Chain Manager.
8. **2D Spatial Warehouse Floor Plan (`warehouse-map.tsx`)**:
   - Interactive SVG floor map rendering aisles A1-C1, receiving bays 01-02, dispatch staging gates, and quarantine holding pens.

---

### 4.5 Procurement Approver Experience (11 Screens)

The Procurement Approver suite (`src/app/(protected)/procurement-approver/`) operates with a dedicated visual design system (Procurement Purple `#8B5CF6`) and enforces strict financial governance.

```mermaid
flowchart TD
    PRC_HOME["Procurement Dashboard<br/>(home.tsx)"] --> REQ_LIST["Sourcing Requests Hub<br/>(requests/index.tsx)"]
    REQ_LIST --> REQ_DETAIL["Request Dossier & Review<br/>(requests/[id].tsx)"]
    REQ_DETAIL --> CEILING_BLOCK{"Value > ₹25.0L<br/>Delegation Ceiling?"}
    CEILING_BLOCK -- Yes --> LOCK["Threshold Violation Screen<br/>(Unilateral Approval Locked)"]
    CEILING_BLOCK -- No --> APPROVE["Authorize & Issue Binding PO<br/>(ApprovalDecisionSheet.tsx)"]
    PRC_HOME --> MATRIX["Alternative Supplier Matrix<br/>(suppliers/compare.tsx)"]
    PRC_HOME --> PO_LEDGER["Purchase Orders Ledger<br/>(purchase-orders.tsx)"]
    PRC_HOME --> RISK_DIM["6-Dimension Supplier Risk<br/>(risk-analysis.tsx)"]

    classDef prcStyle fill:#2E1065,stroke:#8B5CF6,color:#F5F3FF;
    class PRC_HOME,REQ_LIST,REQ_DETAIL,CEILING_BLOCK,LOCK,APPROVE,MATRIX,PO_LEDGER,RISK_DIM prcStyle;
```

#### Detailed Screen Breakdown:
1. **Procurement Executive Dashboard (`home.tsx`)**:
   - Telemetry: Pending Value (₹68.4L), Approved Today (₹24.5L), Active Suppliers (18), and High-Risk Suppliers (3). Disruption sourcing banner and quick station tiles.
2. **Sourcing Requests Directory (`requests/index.tsx`)**:
   - Searchable directory of emergency sourcing requests with status tabs (`All`, `Pending`, `Approved`, `Rejected`), priority pills, and threshold warning ribbons.
3. **Request Dossier & Threshold Violation (`requests/[id].tsx`)**:
   - Comprehensive request breakdown. Automatically evaluates request value against the Level 4 ₹25,00,000 ceiling. Disables unilateral approval for requests exceeding the cap.
4. **Head-to-Head Alternative Sourcing Matrix (`suppliers/compare.tsx`)**:
   - Multi-metric benchmark evaluating Lead Time, Unit Price, Weekly Capacity, MOQ, Qualification Status, SLA %, Quality Score, and Risk Index.
5. **Binding Purchase Order Ledger (`purchase-orders.tsx`)**:
   - Formal PO tracking with Incoterms, line items, cryptographic ledger hashes, and approver cancellation governance.
6. **Composite Supplier Risk Index (`risk-analysis.tsx`)**:
   - 6-dimension risk analysis covering Geopolitical, Lead-Time, Concentration, Financial, Capacity, and Quality vulnerabilities.

---

### 4.6 Platform Administrator Experience (8 Screens)

The Platform Administrator suite (`src/app/(protected)/administrator/`) provides complete governance over tenant configuration, identity provisioning, and external integrations.

```mermaid
flowchart TD
    ADM_HOME["Admin Master Hub<br/>(home.tsx)"] --> USERS["User Provisioning & Roles<br/>(users.tsx & roles.tsx)"]
    ADM_HOME --> ORGS["Multi-Tenant Config<br/>(organizations.tsx)"]
    ADM_HOME --> INTEGRATIONS["Enterprise Webhooks & ERP<br/>(integrations.tsx)"]
    ADM_HOME --> POLICIES["Risk Policies & Limits<br/>(policies.tsx)"]
    ADM_HOME --> HEALTH["System Telemetry & Health<br/>(system-health.tsx)"]
    ADM_HOME --> AUDIT["Security Audit Trail<br/>(audit.tsx)"]

    classDef admStyle fill:#1E1B4B,stroke:#6366F1,color:#EEF2FF;
    class ADM_HOME,USERS,ORGS,INTEGRATIONS,POLICIES,HEALTH,AUDIT admStyle;
```

#### Detailed Screen Breakdown:
1. **Administration Command Hub (`home.tsx`)**:
   - System KPIs (Total Users: 24, System Uptime: 99.94%, Registered Warehouses: 4, Active Disruptions: 3), security health cards, and module shortcuts.
2. **User Management & Identity Provisioning (`users.tsx`)**:
   - Complete user lifecycle management: status toggling (`active`, `suspended`), role assignments, warehouse stationing, and multi-factor authentication controls.
3. **Role-Based Access Control Matrix (`roles.tsx`)**:
   - Permission bitmask inspection and custom role capability assignment across all 5 enterprise personas.
4. **Multi-Tenant Organization Configuration (`organizations.tsx`)**:
   - Enterprise workspace boundaries, legal entity metadata, and tenant isolation parameters.
5. **External Enterprise Integrations (`integrations.tsx`)**:
   - Webhook configurations for maritime carriers (OceanTrans, Maersk) and ERP connectors (SAP S/4HANA, Oracle SCM) with health pings and shared secret management.
6. **Risk Policy Parameters & Thresholds (`policies.tsx`)**:
   - Runtime configuration for statutory delegation caps (e.g., ₹25.0L ceiling), risk formula weights, and automated escalation thresholds.
7. **System Health & Service Telemetry (`system-health.tsx`)**:
   - Real-time telemetry monitoring FastAPI latency, PostgreSQL connection pool depth, and Polygon Amoy gas price levels.
8. **Platform Security Audit Trail (`audit.tsx`)**:
   - Forensic administrative audit log tracking user logins, role modifications, and policy updates.

---

## 5. Deep Technical Invariants & Verification Matrix

### 5.1 Database Triggers & Relational Invariants

Critical business rules are implemented at the PostgreSQL database layer, guaranteeing that bugs in the application layer cannot corrupt the ledger:

| Invariant Rule | Implementation Mechanism | Enforcement Behavior |
|---|---|---|
| **Separation of Duties** | SQL Check & Trigger on `approvals` | Rejects any approval record where `approver_id == plan.created_by`. |
| **Tamper-Proof Audit Trail** | Hash-Chained Trigger on `audit_logs` | Automatically computes `SHA256(prev_hash + timestamp + payload)`. Blocks `UPDATE` and `DELETE` queries. |
| **Stock Double-Booking Prevention** | Check Constraint on `fulfilment_allocations` | `allocated_quantity <= inventory.available_quantity`. Prevents negative inventory balances. |
| **Fulfillment Exclusivity** | Check Constraint on `fulfilment_allocations` | `(inventory_id IS NOT NULL AND shipment_item_id IS NULL) OR (inventory_id IS NULL AND shipment_item_id IS NOT NULL)`. |
| **Idempotent Webhooks** | Composite Unique Index on `carrier_events` | `UNIQUE(source, event_id)`. Rejects duplicate webhook payloads instantly. |

---

### 5.2 Smart Contract Specification (`TrustChainGovernance.sol`)

The on-chain governance contract enforces versioned state transitions on Polygon Amoy:

```solidity
// Canonical plan status state transitions enforced on Polygon Amoy
enum PlanStatus {
    NONE,               // 0: Unanchored
    PENDING_APPROVAL,   // 1: Anchored, awaiting required stage sign-offs
    APPROVED,           // 2: All required stage approvals recorded
    REJECTED,           // 3: Rejected by authorized approver (terminal)
    REVISION_REQUESTED, // 4: Changes requested (terminal for this version)
    SUPERSEDED          // 5: Newer version anchored (terminal)
}
```

#### On-Chain Authority Bitmasks:
- `CAT_OPERATIONS_ANALYST` = `1 << 0` (`0x01`)
- `CAT_SUPPLY_CHAIN_MANAGER` = `1 << 1` (`0x02`)
- `CAT_WAREHOUSE_APPROVER` = `1 << 2` (`0x04`)
- `CAT_PROCUREMENT_APPROVER` = `1 << 3` (`0x08`)
- `CAT_ADMINISTRATOR` = `1 << 4` (`0x10`)

---

### 5.3 ML Model Benchmarking & PR-AUC Gate Results

To prevent unproven algorithms from disrupting operations, a machine learning model is promoted if and only if its Precision-Recall Area Under Curve (**PR-AUC**) strictly beats the deterministic baseline formula on out-of-time test data:

| Dataset Evaluated | Formula Baseline PR-AUC | Challenger ML PR-AUC | System Promotion Decision |
|---|---:|---:|---|
| **Synthetic Out-of-Distribution Demo** | 0.558 | **0.671** | ✅ **Promoted to Live Model** |
| **DataCo Public Supply Chain (172,765 Orders)** | 0.720 | **0.836** | ✅ **Promoted to Live Model** |
| **Undated Logistics Baseline** | 0.718 | 0.714 | ❌ **Rejected (Fallback Maintained)** |

---

### 5.4 Enterprise API Endpoint Specifications

The FastAPI backend exposes a comprehensive set of REST endpoints:

```text
POST   /api/v1/webhooks/carriers/simulated   # Ingest carrier telemetry (HMAC verified)
GET    /api/v1/app/bootstrap                 # Unified app state bootstrap
POST   /api/v1/recovery/plans/{id}/submit    # Submit recovery plan & anchor hash
POST   /api/v1/approvals/{id}/approve        # Record managerial approval
POST   /api/v1/approvals/{id}/reject         # Record rejection (rationale required)
POST   /api/v1/approvals/{id}/request-revision # Request edits (feedback required)
POST   /api/v1/ai/disruptions/{id}/recommendations # Advisory AI recovery suggestions
POST   /api/v1/execution/{id}/confirm        # Confirm & execute approved recovery
GET    /api/v1/blockchain/verify/plan/{id}   # Query Polygon Amoy verification status
GET    /api/v1/audit/verify                  # Verify cryptographic hash chain integrity
GET    /api/v1/suppliers                     # Fetch supplier reliability telemetry
GET    /health                               # Microservice health check
```

---

## 6. Deployment, Local Development & Testing Guide

### Prerequisites
- **Node.js**: v20.0+
- **Python**: v3.11+
- **PostgreSQL**: v16+ (or local SQLite for dev/test)
- **Expo Go App**: Installed on physical Android / iOS device, or Android Studio Emulator

### 1. Backend Setup & Database Seeding
```bash
# Navigate to backend directory
cd overclock/backend

# Create and activate Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database migrations
alembic upgrade head

# Seed initial operational data and train baseline risk model
python -m app.ops.cli seed

# Start the FastAPI server (accessible across local network)
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Mobile Client Setup (Expo SDK 58)
```bash
# Navigate to the mobile application root
cd overclock

# Install npm dependencies
npm install

# Start the Expo development server
npx expo start
```
*Scan the generated QR code using Expo Go on your mobile device, or press `a` to launch the Android Emulator.*

### 3. Verification & Test Suite Execution
```bash
# Run backend test suite (87 unit and integration tests)
pytest backend/tests -v

# Run strict TypeScript compilation check across all 91 route files
npx tsc --noEmit

# Run ESLint compliance check
npx expo lint

# Execute Hardhat smart contract verification tests
cd blockchain && npx hardhat test
```

---

<div align="center">

###  TRUSTCHAIN — BUILT FOR THE OVERCLOCK '26 HACKATHON
*Every disruption understood. Every recovery feasible. Every decision accountable.*

</div>

