# TRUSTCHAIN

> Complete Product Requirements Document (PRD)  
> *Don't just detect disruptions. Resolve their consequences.*

---

TRUSTCHAIN
Complete Product Requirements Document (PRD)
Don't just detect disruptions. Resolve their consequences.

Document Version           2.0

Document Status            Consolidated Product Specification

Product Type               AI-Powered Supply Chain Disruption Intelligence, Recovery and Accountability
                           Platform

Platforms                  Web Application + Mobile Application

Primary Database           PostgreSQL

Backend                    Python + FastAPI

Optimization Engine        Google OR-Tools

AI Integration             LLM-assisted analysis and recommendations

Blockchain                 Solidity + EVM-compatible network

Appendix A (RBAC schema, role-permission matrix and authorization flow) was added to this edition. Main body
text is reproduced from the consolidated specification without change.

 Contents
 1. EXECUTIVE SUMMARY                                          4

 2. PRODUCT OBJECTIVES                                         5

 3. TARGET USERS AND ROLES                                     6

 4. PRODUCT SCOPE AND APPLICATIONS                             8

 5. HIGH-LEVEL USER WORKFLOW                                   9

 6. FUNCTIONAL REQUIREMENTS                                  10

 MODULE 1 — AUTHENTICATION AND ACCESS CONTROL                10

 MODULE 2 — OPERATIONS COMMAND CENTRE                        11

 MODULE 3 — SUPPLY CHAIN DIGITAL TWIN                        12

 MODULE 4 — DATA IMPORT AND SYNTHETIC DATA GENERATION        13

 MODULE 5 — SUPPLIER MANAGEMENT                              15

 MODULE 6 — SHIPMENT MANAGEMENT                              16

 MODULE 7 — WAREHOUSE AND INVENTORY MANAGEMENT               17

 MODULE 8 — CUSTOMER ORDER MANAGEMENT                        18

 MODULE 9 — EVENT INGESTION AND SIMULATED CARRIER WEBHOOK    19

 MODULE 10 — DISRUPTION DETECTION                            21

 MODULE 11 — DOWNSTREAM IMPACT ANALYSIS                      22

 MODULE 12 — RISK INTELLIGENCE                               23

 MODULE 13 — AI-ASSISTED RECOVERY RECOMMENDATIONS            24

 MODULE 14 — RECOVERY SIMULATION STUDIO                      26

 MODULE 15 — CONSTRAINT-AWARE RECOVERY OPTIMIZER             27

 MODULE 16 — RECOVERY PLAN MANAGEMENT                        28

 MODULE 17 — APPROVAL AND MODIFICATION WORKFLOW              29

 MODULE 18 — EXECUTION CENTRE                                30

 MODULE 19 — NOTIFICATIONS                                   32

 MODULE 20 — AUDIT AND ACCOUNTABILITY                        32

 MODULE 21 — BLOCKCHAIN ACCOUNTABILITY                       33

 MODULE 22 — REPORTING AND ANALYTICS                         35

 7. MOBILE APPLICATION REQUIREMENTS                          35

 8. TECHNICAL ARCHITECTURE                                   37

 9. DATABASE DESIGN                                          40

 10. API REQUIREMENTS                                        41

 11. UI AND USER EXPERIENCE                                  43

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification    Page 2

 12. SECURITY AND PRIVACY                                   44

 13. NON-FUNCTIONAL REQUIREMENTS                            45

 14. EDGE CASES AND FAILURE HANDLING                        46

 15. MANDATORY DEMONSTRATION SCENARIOS                      48

 16. TESTING AND QUALITY ASSURANCE                          50

 17. API AND SYSTEM ERROR HANDLING                          51

 18. IMPLEMENTATION ROADMAP                                 52

 19. MVP PRIORITIES                                         54

 20. FINAL ACCEPTANCE CRITERIA                              55

 21. FINAL PRODUCT DEFINITION                               56

 Appendix A. RBAC Schema Reference                          58

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 3

 1. EXECUTIVE SUMMARY
 1.1 Product Overview
 TRUSTCHAIN is an intelligent supply chain disruption management, recovery optimization and
 accountability platform.
 It is designed to help organizations understand how disruptions across suppliers, shipments, warehouses
 and inventory affect customer orders, determine the severity of those consequences and identify practical
 recovery strategies.
 Modern supply chains rely on interconnected operational entities. A supplier delay can affect an inbound
 shipment, reduce warehouse inventory, disrupt fulfilment allocations and eventually cause customer
 delivery commitments to be missed.
 Although detecting an individual disruption is relatively straightforward, understanding its complete
 downstream impact and determining the best recovery action requires information from multiple
 operational systems.
 TRUSTCHAIN addresses this challenge by connecting fragmented supply chain information into one
 operational platform.
 The platform will:
  1. Import supply chain data from CSV and JSON files.
  2. Receive external operational events through simulated carrier webhooks and integration interfaces.
  3. Maintain connected records for suppliers, products, shipments, carriers, warehouses, inventory and
      customer orders.
  4. Detect supplier delays, shipment delays and stock shortages.
  5. Trace downstream dependencies and identify affected customer orders.
  6. Calculate explainable risk scores.
  7. Use AI to summarize disruptions and propose recovery approaches.
  8. Use deterministic business rules to validate operational feasibility.
  9. Use mathematical optimization to compare recovery strategies.
  10. Route recovery plans through a controlled approval workflow.
  11. Simulate execution only after the required approval and explicit execution confirmation.
  12. Generate notifications and preserve a complete audit trail.
  13. Provide verifiable blockchain evidence for selected critical decisions.
  14. Support operational workflows through web and mobile applications.

 1.2 Core Problem
 Logistics teams receive fragmented updates about:
  •   Delayed shipments.
  •   Supplier production interruptions.
  •   Inventory shortages.
  •   Warehouse capacity constraints.
  •   Transportation disruptions.
  •   Customer delivery commitments.
 Identifying an individual late shipment is easy.
 Determining which customer orders are affected, how serious the consequences are, what recovery
 options are feasible and who should authorize the response is considerably harder.
 TRUSTCHAIN transforms these disconnected updates into a structured disruption-to-recovery workflow.

 1.3 Product Vision
 To build a unified supply chain intelligence platform that converts fragmented operational information into
 explainable, feasible and accountable recovery decisions.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                                 Page 4

 1.4 Product Mission
  •   Improve visibility across interconnected supply chain operations.
  •   Identify disruptions and downstream consequences.
  •   Prioritize customer orders according to explainable risk.
  •   Reduce manual recovery planning.
  •   Prevent infeasible inventory and fulfilment decisions.
  •   Establish accountable approval and execution workflows.
  •   Make operational intelligence accessible through desktop and mobile devices.

 1.5 Product Differentiation
 TRUSTCHAIN is not simply a shipment tracking dashboard.
 Its central value lies in connecting five capabilities:
  1. Operational data integration.
  2. Downstream impact intelligence.
  3. Constraint-aware recovery optimization.
  4. Governed approval and execution.
  5. Verifiable decision accountability.
 Its defining workflow is:
 SENSE → CONNECT → DETECT → TRACE → PRIORITIZE → RECOMMEND → SIMULATE → OPTIMIZE →
 APPROVE → CONFIRM → EXECUTE → VERIFY

 2. PRODUCT OBJECTIVES
 2.1 Primary Objectives
 Objective                         Expected result

 Data integration                  Consolidate fragmented supply chain information

 Operational visibility            Maintain connected supplier, shipment, warehouse, inventory and order records

 Disruption detection              Identify delayed shipments, supplier delays and stock shortages

 Impact analysis                   Trace actual downstream consequences

 Risk prioritization               Rank affected orders with explanations

 AI assistance                     Generate summaries and recovery suggestions

 Recovery optimization             Identify feasible and beneficial recovery strategies

 Approval governance               Enforce authorization and separation of duties

 Execution management              Simulate confirmed recovery actions

 Accountability                    Preserve audit records and verifiable evidence

 Cross-platform access             Provide web and mobile operational experiences

 2.2 Success Metrics
 The following are initial engineering targets and validation criteria, not claims of achieved performance.
 The implementation must measure:
  •   Correctness of downstream order identification.
  •   Accuracy of inventory availability calculations.
  •   Duplicate event rejection.
  •   Correct handling of out-of-order events.
  •   Invalid import rejection and error reporting.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                                       Page 5

  •   Risk calculation correctness.
  •   Recovery plan feasibility.
  •   Recovery cost and number of orders protected.
  •   Unauthorized approval rejection.
  •   Prohibited self-approval rejection.
  •   Execution confirmation enforcement.
  •   Audit integrity verification.
  •   Mobile synchronization correctness.
 Every performance claim must be supported by documented test results.

 3. TARGET USERS AND ROLES
 TRUSTCHAIN must implement five mandatory roles.
 An Auditor role may be added as an optional sixth role.

 3.1 Operations Analyst
 Purpose: Investigate disruptions and prepare recovery strategies.
 Permissions:
  •   View operational dashboard.
  •   View suppliers, shipments, warehouses and orders.
  •   Import authorized operational data.
  •   Investigate disruptions.
  •   View downstream impact.
  •   Review risk assessments.
  •   Generate AI-assisted recommendations.
  •   Create recovery plans.
  •   Run simulations.
  •   Run optimization.
  •   Submit recovery plans for approval.
  •   Monitor execution.
 Restrictions:
  • Cannot approve their own restricted recovery plans.
  • Cannot independently override inventory constraints.
  • Cannot execute restricted actions without authorization.

 3.2 Supply Chain Manager
 Purpose: Manage operational disruptions and approve eligible recovery plans.
 Permissions:
  •   View critical disruptions.
  •   Review impact assessments.
  •   Review risk rankings.
  •   Review recovery simulations.
  •   Approve eligible recovery plans.
  •   Reject plans.
  •   Request modifications.
  •   Monitor approved recovery execution.
  •   Review operational performance.
 Restrictions:

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                        Page 6

  • Cannot approve their own restricted plans.
  • Cannot approve actions outside their assigned authority.
  • Must follow multi-stage approval requirements where applicable.

 3.3 Warehouse Operator
 Purpose: Perform warehouse-level operational activities.
 Permissions:
  •   View assigned warehouse.
  •   View assigned inventory.
  •   View incoming shipments.
  •   Confirm goods receipt.
  •   Record received quantities.
  •   Report damaged goods.
  •   Quarantine stock.
  •   Confirm authorized stock transfers.
  •   Scan QR codes and barcodes.
  •   View assigned tasks.
  •   Submit operational observations.
 Restrictions:
  •   Cannot arbitrarily modify reserved inventory.
  •   Cannot access unrelated warehouses.
  •   Cannot approve procurement decisions unless separately granted the relevant permission.
  •   Cannot bypass backend inventory validation.

 3.4 Procurement Approver
 Purpose: Review supplier and procurement-related recovery actions.
 Permissions:
  •   View supplier information.
  •   Review alternative suppliers.
  •   View purchase order details.
  •   Review procurement costs.
  •   Review supplier lead times and capacity.
  •   Approve eligible procurement actions.
  •   Reject procurement proposals.
  •   Request modifications.
 Restrictions:
  • Cannot approve their own restricted submissions.
  • Cannot approve actions outside their assigned financial or procurement authority.

 3.5 Administrator
 Purpose: Manage platform configuration and organizational access.
 Permissions:
  •   Manage users.
  •   Assign roles.
  •   Configure permissions.
  •   Manage organization settings.
  •   Configure integrations.
  •   Manage notification settings.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                        Page 7

  •   Configure risk policies.
  •   Manage blockchain wallet associations.
  •   Monitor system health.
  •   Review operational records where authorized.
 Important: Administrator status does not automatically grant permission to approve every recovery
 action.

 3.6 Optional Auditor
 Read-only access to:
  •   Disruptions.
  •   Impact assessments.
  •   Recovery plans.
  •   Approvals.
  •   Execution history.
  •   Blockchain verification.
  •   Audit records.
  •   Reports.

 4. PRODUCT SCOPE AND APPLICATIONS
 TRUSTCHAIN consists of two applications connected to one shared backend.

 4.1 Web Application
 The web application is the primary operational command centre.
 It provides:
  •   Complete supply chain visibility.
  •   Digital Twin visualization.
  •   Disruption investigation.
  •   Supplier and shipment management.
  •   Warehouse and inventory management.
  •   Customer order management.
  •   Risk intelligence.
  •   Recovery simulation.
  •   Mathematical optimization.
  •   Approval management.
  •   Execution monitoring.
  •   Blockchain verification.
  •   Audit and reporting.
  •   Administrative configuration.

 4.2 Mobile Application
 The mobile application is an operational companion.
 It supports:
  •   Real-time notifications.
  •   Incident investigation.
  •   Shipment monitoring.
  •   Warehouse operations.
  •   QR and barcode scanning.
  •   Goods receipt confirmation.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                             Page 8

  •   Damaged inventory reporting.
  •   Stock transfer confirmation.
  •   Recovery plan review.
  •   Authorized approvals.
  •   Execution monitoring.
  •   Blockchain verification.
 The mobile application must not duplicate the backend's business logic or create a separate operational
 database.
 Both applications must operate against the same APIs and authoritative records.

 4.3 Shared Platform
 Both applications share:
  •   Authentication.
  •   Role-based access control.
  •   PostgreSQL.
  •   Event ingestion.
  •   Digital Twin.
  •   Disruption detection.
  •   Impact analysis.
  •   Risk calculation.
  •   AI assistance.
  •   OR-Tools optimizer.
  •   Approval workflow.
  •   Execution orchestration.
  •   Notifications.
  •   Audit records.
  •   Blockchain verification.

 5. HIGH-LEVEL USER WORKFLOW
 The main TRUSTCHAIN workflow is:
  1. An administrator or analyst imports operational data.
  2. The backend validates and persists the records.
  3. Relationships between suppliers, shipments, warehouses, inventory and customer orders are
      established.
  4. A carrier webhook or another operational event reports a disruption.
  5. The backend authenticates and validates the event.
  6. Duplicate, invalid or conflicting updates are handled safely.
  7. The disruption detection engine evaluates the event.
  8. The impact engine traces downstream dependencies.
  9. Affected order lines are identified.
  10. The risk engine ranks the affected orders.
  11. AI generates a disruption summary and possible recovery approaches.
  12. Deterministic rules validate all operational constraints.
  13. OR-Tools calculates feasible recovery alternatives.
  14. An analyst creates and submits a recovery plan.
  15. The relevant approver reviews the plan.
  16. The approver approves, rejects or requests modifications.
  17. Modified plans receive new versions and undergo approval again.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                             Page 9

  18. Once the required approvals are complete, an authorized user explicitly confirms execution.
  19. The execution engine simulates the approved recovery actions.
  20. Notifications and audit records are generated.
  21. Blockchain evidence is anchored and verified where required.
 No recovery action may be executed merely because AI recommended it or a simulation
 completed.

 6. FUNCTIONAL REQUIREMENTS

 MODULE 1 — AUTHENTICATION AND ACCESS CONTROL
 6.1 Authentication
 The platform must provide:
  •   Secure login.
  •   Administrator-controlled user creation.
  •   Password hashing using Argon2.
  •   JWT authentication.
  •   Access-token and refresh-token management.
  •   Logout.
  •   Session revocation.
  •   Password reset.
  •   Optional multi-factor authentication.
  •   Secure mobile token storage.

 6.2 Backend-Enforced RBAC
 Permissions must be validated on the backend for every protected operation.
 The frontend must never be treated as the source of authorization.
 A client must not be able to obtain additional permissions by modifying its role, request body or local
 application state.

 6.3 Organization Isolation
 All operational records must be associated with an organization.
 Every protected database query and mutation must enforce the authenticated user's organization scope.

 6.4 Separation of Duties
 The approval system must prevent restricted self-approval.
 For applicable plans:
  •   The creator cannot approve their own plan.
  •   Approval authority must match the action category.
  •   Required approval stages must be completed.
  •   Approval must refer to the exact submitted plan version.

 6.5 Acceptance Criteria
  •   Unauthorized requests are rejected.
  •   Client-side role manipulation has no effect on permissions.
  •   Cross-organization data access is prevented.
  •   Restricted self-approval is rejected by the backend.
  •   Authorization decisions are auditable.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                               Page 10

 MODULE 2 — OPERATIONS COMMAND CENTRE
 6.6 Purpose
 Provide a unified overview of the organization's operational supply chain state.

 6.7 Dashboard Metrics
 The dashboard must display:
  •   Active disruptions.
  •   Critical disruptions.
  •   Affected customer orders.
  •   High-risk orders.
  •   Active suppliers.
  •   Active shipments.
  •   Delayed shipments.
  •   Warehouses.
  •   Inventory shortages.
  •   Pending approvals.
  •   Recovery plans in progress.
  •   Completed recovery actions.
  •   Failed or partially completed recovery actions.
 All metrics must be calculated from persisted operational records.

 6.8 Dashboard Sections
 A. Disruption Overview
 Display:
  •   Incident ID.
  •   Disruption type.
  •   Affected entity.
  •   Severity.
  •   Detection time.
  •   Affected order count.
  •   Current status.

 B. Affected Orders
 Display:
  •   Order ID.
  •   Required delivery date.
  •   Risk score.
  •   Risk category.
  •   Shortage quantity.
  •   Expected delay.
  •   Recovery status.

 C. Pending Approvals
 Display:
  •   Plan ID.
  •   Plan creator.
  •   Plan version.
  •   Recovery type.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                            Page 11

  • Estimated cost.
  • Required approver.
  • Submission time.

 D. Recovery Progress
 Display:
  •   Approved plans.
  •   Execution progress.
  •   Completed actions.
  •   Failed actions.
  •   Remaining actions.
  •   Expected recovery completion.

 E. Recent Activity
 Display:
  •   Disruption events.
  •   Inventory updates.
  •   Approvals.
  •   Rejections.
  •   Plan modifications.
  •   Execution events.
  •   Blockchain confirmations.

 6.9 Dashboard Filters
 Support:
  •   Date range.
  •   Disruption type.
  •   Severity.
  •   Supplier.
  •   Warehouse.
  •   Shipment status.
  •   Order risk.
  •   Recovery status.

 MODULE 3 — SUPPLY CHAIN DIGITAL TWIN
 6.10 Purpose
 Represent the operational supply chain as a connected dependency network.

 6.11 Main Entities
  •   Suppliers.
  •   Products.
  •   Purchase orders.
  •   Shipments.
  •   Carriers.
  •   Warehouses.
  •   Inventory.
  •   Customer orders.
  •   Order lines.
  •   Fulfilment allocations.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                     Page 12

  • Disruptions.
  • Recovery plans.

 6.12 Core Relationship
 Supplier → Purchase Order → Shipment → Warehouse → Inventory → Customer Order
 Additional relationships must represent product sourcing, shipment contents, warehouse stock and
 order-line allocations.

 6.13 Visualization
 Use React Flow.
 Users must be able to:
  •   Zoom and pan.
  •   Search for entities.
  •   Select nodes.
  •   Inspect node details.
  •   Filter entity types.
  •   Highlight upstream dependencies.
  •   Highlight downstream dependencies.
  •   Identify affected orders.
  •   View critical dependency paths.
  •   Isolate a particular supply chain segment.

 6.14 Graph Computation
 Use NetworkX for graph construction and dependency traversal.
 PostgreSQL remains the authoritative source of truth.
 The graph must support:
  •   Cycle detection.
  •   Bounded traversal.
  •   Multiple suppliers for a product.
  •   Multiple warehouses.
  •   Multi-product shipments.
  •   Multi-line orders.
  •   Multiple fulfilment allocations.
  •   Quantity-aware dependency analysis.
 Do not infer actual customer impact from generic supplier-product relationships alone.

 MODULE 4 — DATA IMPORT AND SYNTHETIC DATA
 GENERATION
 6.15 Data Import Requirements
 The platform must support:
  • CSV uploads.
  • JSON uploads.
 The initial demonstration must work without any external dataset.
 TRUSTCHAIN must generate its own synthetic operational dataset.

 6.16 Synthetic Dataset
 The default demonstration dataset should contain:

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                            Page 13

 Entity                                                           Target quantity

 Suppliers                                                        8

 Products/SKUs                                                    25

 Warehouses                                                       5

 Carriers                                                         6

 Shipments                                                        40

 Customer orders                                                  100

 Users                                                            15

 Disruption scenarios                                             4

 The generator must create realistic relationships and consistent quantities.
 For example:
  •   Each purchase order references a valid supplier.
  •   Each shipment references a valid purchase order and carrier.
  •   Shipment items reference valid products.
  •   Each inventory record references a valid warehouse and product.
  •   Order lines reference valid products.
  •   Fulfilment allocations reference actual inventory or valid inbound supply.

 6.17 Synthetic Data Generator
 Implement a repeatable seed-data generator.
 Requirements:
  •   Use deterministic random seeds for reproducibility.
  •   Generate valid foreign-key relationships.
  •   Include both healthy and disrupted operational records.
  •   Include reserved and unreserved stock.
  •   Include different supplier lead times.
  •   Include different delivery deadlines.
  •   Include different customer priorities.
  •   Generate historical carrier events.
  •   Generate at least two demonstrable disruption scenarios.
  •   Support database reset and reseeding in the development environment.
 Synthetic data must be clearly identified as demonstration data.

 6.18 Import Workflow
  1. Upload file.
  2. Select entity type.
  3. Map columns if required.
  4. Validate file structure.
  5. Validate data types.
  6. Validate required fields.
  7. Validate foreign keys.
  8. Detect duplicates.
  9. Preview accepted and rejected records.
  10. Confirm import.
  11. Persist valid records.
  12. Produce an import report.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                            Page 14

 6.19 Import Modes
 Strict mode: Reject the complete import if a record fails validation.
 Partial mode: Import valid records and report invalid records with row numbers and reasons.
 The system must never silently overwrite conflicting records.

 6.20 Import Error Handling
 Examples of invalid records:
  •   Missing shipment ID.
  •   Unknown supplier ID.
  •   Negative quantity.
  •   Invalid date.
  •   Invalid delivery deadline.
  •   Duplicate identifier.
  •   Unknown SKU.
  •   Invalid warehouse reference.
  •   Unsupported status.
  •   Inconsistent unit of measurement.
 Every error must be traceable to the relevant input row or JSON record.

 MODULE 5 — SUPPLIER MANAGEMENT
 6.21 Supplier Records
 Each supplier must contain:
  •   Supplier ID.
  •   Organization ID.
  •   Supplier name.
  •   Contact information.
  •   Address.
  •   Supplier category.
  •   Products supplied.
  •   Lead time.
  •   Minimum order quantity.
  •   Production capacity.
  •   Contract information.
  •   Status.
  •   Historical reliability metrics.
  •   Created timestamp.
  •   Updated timestamp.

 6.22 Features
  •   Create suppliers.
  •   View suppliers.
  •   Edit authorized records.
  •   Deactivate suppliers.
  •   View supplied products.
  •   View purchase orders.
  •   View associated shipments.
  •   View supplier disruptions.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                       Page 15

  • Review historical performance.
  • Identify alternative suppliers.

 6.23 Reliability Metrics
 Calculate:
  •   On-time delivery rate.
  •   Average delay.
  •   Fulfilment consistency.
  •   Quality issues.
  •   Recorded disruption frequency.
 Do not fabricate reliability scores when insufficient historical data exists.

 MODULE 6 — SHIPMENT MANAGEMENT
 6.24 Shipment Records
 Each shipment must include:
  •   Shipment ID.
  •   Purchase order reference.
  •   Supplier reference.
  •   Carrier reference.
  •   Origin.
  •   Destination.
  •   Shipment items.
  •   Quantity.
  •   Dispatch timestamp.
  •   Expected arrival.
  •   Actual arrival.
  •   Current ETA.
  •   Shipment status.
  •   Tracking reference.

 6.25 Shipment Statuses
  •   CREATED.
  •   CONFIRMED.
  •   READY_FOR_DISPATCH.
  •   IN_TRANSIT.
  •   DELAYED.
  •   AT_DESTINATION.
  •   RECEIVING.
  •   RECEIVED.
  •   PARTIALLY_RECEIVED.
  •   CANCELLED.
  •   EXCEPTION.

 6.26 Features
  •   View shipments.
  •   Create and update authorized records.
  •   Track carrier events.
  •   Monitor ETA changes.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                         Page 16

  •   Detect late shipments.
  •   View shipment contents.
  •   View affected warehouses.
  •   View dependent inventory.
  •   View affected customer orders.
  •   Maintain shipment event history.

 6.27 Operational Time Distinction
 The platform must separately track:
  1. Physical arrival.
  2. Receiving completion.
  3. Quality inspection completion.
  4. Usable inventory availability.
  5. Customer fulfilment availability.
 A physically arrived shipment must not automatically be treated as usable inventory.

 MODULE 7 — WAREHOUSE AND INVENTORY
 MANAGEMENT
 6.28 Warehouse Records
 Each warehouse must contain:
  •   Warehouse ID.
  •   Name.
  •   Address.
  •   Geographic coordinates where available.
  •   Operating calendar.
  •   Receiving capacity.
  •   Dispatch capacity.
  •   Assigned operators.
  •   Status.

 6.29 Inventory Records
 Inventory must be tracked by warehouse and product, with lot-level tracking where applicable.
 Fields:
  •   On-hand quantity.
  •   Reserved quantity.
  •   Safety stock.
  •   Damaged quantity.
  •   Quarantined quantity.
  •   Available quantity.
  •   Entity version.

 6.30 Inventory Formula
 Usable Stock = On-hand Stock − Reserved Stock − Safety Stock − Damaged Stock − Quarantined Stock
 Safety stock may only be used through an explicitly configured emergency policy and authorized
 approval.

 6.31 Inventory Operations

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                          Page 17

  •   Receive stock.
  •   Adjust stock.
  •   Reserve stock.
  •   Release reservations.
  •   Report damaged goods.
  •   Quarantine stock.
  •   Transfer stock.
  •   View inventory history.
  •   View projected inventory.

 6.32 Inventory Safety Rules
  •   Reservations must not exceed allocatable stock.
  •   Transfers must not consume already reserved quantities.
  •   Inventory changes must be transactional.
  •   Concurrent reservations must be protected using database locking or equivalent atomic updates.
  •   Every material change must be auditable.
  •   The backend is authoritative for inventory calculations.

 6.33 Time-Phased Inventory
 Inventory projections must consider:
  •   Current usable stock.
  •   Confirmed inbound receipts.
  •   Existing commitments.
  •   Reservation timing.
  •   Warehouse operating calendars.
  •   Expected demand.
  •   Receiving and quality inspection time.

 MODULE 8 — CUSTOMER ORDER MANAGEMENT
 6.34 Order Records
 Each order must contain:
  •   Order ID.
  •   Customer reference.
  •   Order date.
  •   Required delivery date.
  •   Priority.
  •   Order status.
  •   Delivery destination.
  •   Order lines.
  •   Product/SKU.
  •   Required quantity.
  •   Allocated quantity.
  •   Fulfilled quantity.
  •   Remaining quantity.
  •   SLA or contractual constraints.

 6.35 Features
  • Create orders.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                               Page 18

  •   Import orders.
  •   View order details.
  •   Track fulfilment.
  •   View allocations.
  •   Identify shortages.
  •   View shipment dependencies.
  •   View disruption impact.
  •   View risk scores.
  •   View recovery plans.

 6.36 Order-Level Rules
 Impact must be calculated at order-line level.
 Support:
  •   Full fulfilment.
  •   Partial fulfilment.
  •   Split fulfilment.
  •   Delayed fulfilment.
  •   Unfulfilled lines.
  •   Cancelled orders.
  •   Reinstated orders.
 Cancelled or closed orders must not be included in active risk calculations unless explicitly reinstated.

 MODULE 9 — EVENT INGESTION AND SIMULATED
 CARRIER WEBHOOK
 6.37 Purpose
 TRUSTCHAIN must demonstrate external operational event ingestion through at least one functional
 simulated carrier webhook.
 This is a mandatory implementation requirement.
 A frontend button that directly changes shipment status is not sufficient.

 6.38 Simulated Webhook Endpoint
 Implement:
 POST /api/v1/webhooks/carriers/simulated
 The endpoint must receive a carrier event, authenticate its source, validate the payload, process the
 event and trigger the appropriate downstream workflow.

 6.39 Example Payload
  {
      "event_id": "EVT-10001",
      "carrier": "FastTrack Logistics",
      "shipment_id": "SHP-1001",
      "event_type": "SHIPMENT_DELAYED",
      "event_timestamp": "2026-10-30T08:30:00Z",
      "estimated_delay_hours": 48,
      "reason": "Weather disruption"
  }

 This is an example demonstration payload.

 6.40 Supported Event Types

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                                 Page 19

  •   SHIPMENT_DISPATCHED.
  •   SHIPMENT_IN_TRANSIT.
  •   SHIPMENT_DELAYED.
  •   ETA_UPDATED.
  •   SHIPMENT_ARRIVED.
  •   SHIPMENT_EXCEPTION.
  •   SHIPMENT_CANCELLED.

 6.41 Event Processing Workflow
  1. Receive event.
  2. Authenticate the simulated carrier source.
  3. Validate request structure.
  4. Validate event type.
  5. Validate shipment reference.
  6. Check duplicate event identifier.
  7. Evaluate event timestamp and sequence.
  8. Validate the shipment state transition.
  9. Persist the event.
  10. Update the shipment where appropriate.
  11. Trigger disruption assessment.
  12. Trigger downstream impact analysis.
  13. Generate notifications where applicable.
  14. Record audit evidence.

 6.42 Event Data Model
 Each event must include:
  •   Event ID.
  •   Source.
  •   Entity ID.
  •   Event type.
  •   Source sequence where available.
  •   Event timestamp.
  •   Received timestamp.
  •   Payload.
  •   Processing status.
  •   Processing timestamp.

 6.43 Duplicate Events
 Use a unique constraint on:
 (source, event_id)
 If a duplicate event arrives:
  •   Do not apply its state transition again.
  •   Do not repeat inventory changes.
  •   Do not generate duplicate recovery actions.
  •   Return a suitable duplicate acknowledgement.
  •   Preserve sufficient event processing evidence for investigation.

 6.44 Out-of-Order Events
 Older events must not overwrite newer accepted operational states.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                 Page 20

 Historical evidence may still be retained.
 Use source-specific sequencing and valid state-transition rules.
 Do not compare sequence numbers from unrelated sources globally.

 6.45 Conflicting Updates
 Implement field-specific source-authority policies.
 Examples:
  •   Carrier: reported location and carrier ETA.
  •   Warehouse: physical receiving confirmation.
  •   Supplier: production commitment.
  •   Order management system: customer delivery commitment.
 When conflicting updates occur:
  •   Preserve both observations.
  •   Identify the conflicting fields.
  •   Apply the configured authority policy where appropriate.
  •   Quarantine unresolved conflicts for manual review.
  •   Do not blindly overwrite records using the latest timestamp.

 6.46 Event Reliability
 Use idempotent processing and durable event records.
 A failed downstream impact calculation must not cause the original event to be lost.
 Failed processing must be retryable and observable.

 MODULE 10 — DISRUPTION DETECTION
 6.47 Supported Disruption Types
 Mandatory:
  • Late shipments.
  • Supplier delays.
  • Inventory shortages.
 Additional supported types:
  •   Supplier production failure.
  •   Shipment cancellation.
  •   Carrier disruption.
  •   Warehouse closure.
  •   Warehouse capacity shortage.
  •   Damaged stock.
  •   Quality rejection.
  •   Demand surge.

 6.48 Detection Logic
 A. Late Shipment
 Compare the expected arrival or current ETA against the relevant operational deadline and configured
 tolerance.
 A shipment must not be marked late solely because its ETA has changed.
 Use actual operational time and valid status transitions.

 B. Supplier Delay

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                           Page 21

 Compare supplier production or delivery commitments against the confirmed expected date.
 A supplier delay should be linked to relevant purchase orders and inbound shipments.

 C. Stock Shortage
 Calculate projected usable inventory against confirmed commitments and demand.
 Identify shortages by warehouse, SKU and relevant time period.

 6.49 Incident Records
 Each incident must contain:
  •   Incident ID.
  •   Organization ID.
  •   Disruption type.
  •   Affected entity.
  •   Severity.
  •   Detection timestamp.
  •   Evidence.
  •   Affected orders.
  •   Current status.
  •   Assigned owner.
  •   Resolution history.

 6.50 Incident Lifecycle
 DETECTED → VALIDATING → CONFIRMED → IMPACT_ASSESSED → RECOVERY_REQUIRED → RESOLVING →
 RESOLVED → CLOSED
 Additional states:
  • FALSE_POSITIVE.
  • REOPENED.
  • UNDER_REVIEW.

 6.51 Incident Consolidation
 Multiple events affecting the same underlying disruption must be consolidated where appropriate.
 Avoid:
  •   Duplicate incidents for the same event.
  •   Repeated notifications for immaterial fluctuations.
  •   Double-counting the same order shortage.
  •   Hiding genuine worsening conditions.

 MODULE 11 — DOWNSTREAM IMPACT ANALYSIS
 6.52 Purpose
 Identify which operational entities and customer orders are actually affected by a disruption.

 6.53 Impact Workflow
  1. Identify affected supplier, shipment, warehouse or product.
  2. Traverse operational dependencies.
  3. Identify affected purchase orders.
  4. Identify affected inbound shipments.
  5. Calculate projected inventory availability.
  6. Identify affected order lines.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                            Page 22

  7. Calculate expected shortage quantities.
  8. Estimate fulfilment delays.
  9. Evaluate contractual exposure.
  10. Consolidate overlapping impacts.
  11. Persist an impact assessment.

 6.54 Impact Output
 Every assessment must include:
  •   Affected suppliers.
  •   Affected shipments.
  •   Affected warehouses.
  •   Affected products.
  •   Affected inventory positions.
  •   Affected customer orders.
  •   Affected order lines.
  •   Shortage quantity.
  •   Expected delay.
  •   Contractual exposure.
  •   Assessment timestamp.
  •   Evidence and calculation references.

 6.55 Critical Rules
 A delayed shipment does not automatically mean a customer order will be delayed.
 Existing usable stock may absorb the disruption.
 Similarly, multiple disruptions affecting the same order must not produce duplicate shortage calculations.
 The platform must calculate actual downstream exposure using quantity-aware and time-aware
 dependencies.

 MODULE 12 — RISK INTELLIGENCE
 6.56 Purpose
 Prioritize affected customer orders according to their actual operational exposure.

 6.57 Risk Dimensions
 The initial deterministic risk model considers:
  •   Deadline urgency.
  •   Shortage severity.
  •   Disruption impact.
  •   Business priority.

 6.58 Risk Formula
 Risk Score = 0.35D + 0.30S + 0.20I + 0.15P
 Where:
 D = Deadline urgency.
 S = Shortage severity.
 I = Disruption impact.
 P = Business priority.
 Each component is normalized to a 0–100 scale.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                              Page 23

 Weights and thresholds must be configurable.

 6.59 Risk Categories
  •   LOW.
  •   MODERATE.
  •   HIGH.
  •   CRITICAL.

 6.60 Risk Explanation
 Every risk result must include:
  •   Overall score.
  •   Component scores.
  •   Factor contribution.
  •   Relevant source records.
  •   Calculation timestamp.
  •   Risk policy version.

 6.61 Deterministic Ranking
 When multiple orders have similar risk scores, apply a consistent tie-breaking policy:
  1. Risk score.
  2. Contractual deadline.
  3. SLA exposure.
  4. Business priority.
  5. Creation timestamp.
  6. Stable order ID.

 6.62 Risk and Recoverability
 Display risk and recoverability as separate indicators.
 An order can have high risk but be easily recoverable.
 An order can have moderate risk but be expensive or difficult to recover.

 MODULE 13 — AI-ASSISTED RECOVERY
 RECOMMENDATIONS
 6.63 Purpose
 AI must assist users in understanding disruptions and exploring possible recovery strategies.
 AI is an advisory component, not the authoritative operational decision-maker.

 6.64 AI Responsibilities
 The AI system may:
  •   Summarize disruptions.
  •   Explain downstream consequences.
  •   Interpret risk factors in natural language.
  •   Suggest possible recovery approaches.
  •   Explain the differences between recovery alternatives.
  •   Generate operational reports.
  •   Answer authorized natural-language questions about available operational data.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                         Page 24

 6.65 Supported Recovery Suggestions
 The AI must be capable of suggesting:
  1. Reallocate available stock.
  2. Expedite a shipment.
  3. Use an alternative supplier.
  4. Split customer order fulfilment.
 It may suggest combinations of these approaches.

 6.66 AI Input
 AI recommendations must use validated contextual information, including:
  •   Disruption details.
  •   Affected orders.
  •   Inventory information.
  •   Existing reservations.
  •   Supplier alternatives.
  •   Shipment details.
  •   Lead times.
  •   Budget policies.
  •   Operational constraints.

 6.67 AI Output
 The output should include:
  •   Incident summary.
  •   Affected order summary.
  •   Suggested recovery actions.
  •   Explanation for each suggestion.
  •   Potential advantages.
  •   Potential disadvantages.
  •   Required operational validation.
  •   Confidence or uncertainty indicators where supported.

 6.68 Separation Between AI and Deterministic Logic
 This distinction is mandatory.

 Component                  Responsibility

 AI/LLM                     Explain disruption and suggest possible recovery approaches

 Inventory engine           Calculate actual available inventory

 Rules engine               Validate deadlines, capacity, MOQ, compatibility and policies

 Risk engine                Calculate deterministic order risk

 OR-Tools                   Determine feasible and optimized recovery plans

 Approval engine            Determine whether a user can approve

 Execution engine           Simulate authorized recovery actions

 6.69 AI Restrictions
 AI must never:
  • Invent inventory availability.
  • Invent supplier capacity.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                    Page 25

  •   Change contractual deadlines.
  •   Authoritatively calculate inventory.
  •   Approve recovery plans.
  •   Execute recovery actions.
  •   Bypass user permissions.
  •   Override hard operational constraints.

 6.70 AI Validation Pipeline
 Every proposed recovery action must pass:
  1. Structured schema validation.
  2. Entity reference validation.
  3. Product compatibility validation.
  4. Inventory validation.
  5. Reservation validation.
  6. Supplier capacity validation.
  7. Carrier capacity validation.
  8. Deadline validation.
  9. Budget validation.
  10. Policy validation.
  11. Optimization validation.
 An infeasible proposal must be rejected or returned as a non-executable suggestion with an explanation.

 6.71 AI Failure Handling
 If the AI provider becomes unavailable:
  •   Event processing continues.
  •   Disruption detection continues.
  •   Impact analysis continues.
  •   Risk calculations continue.
  •   Optimization continues.
  •   Approval and execution continue where otherwise available.
 The application must communicate that AI-generated explanations are unavailable rather than fabricating
 an AI response.

 MODULE 14 — RECOVERY SIMULATION STUDIO
 6.72 Purpose
 Allow analysts to create hypothetical recovery scenarios without modifying live operational data.

 6.73 Recovery Actions
  •   Inventory reallocation.
  •   Inter-warehouse stock transfer.
  •   Shipment expediting.
  •   Alternative supplier selection.
  •   Split fulfilment.
  •   Partial fulfilment.
  •   Procurement quantity adjustment.
  •   Combined recovery strategies.

 6.74 Simulation Inputs

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                             Page 26

  •   Incident.
  •   Affected orders.
  •   Products.
  •   Warehouses.
  •   Supplier alternatives.
  •   Carrier alternatives.
  •   Budget limits.
  •   Deadline requirements.
  •   Safety stock policy.
  •   Recovery objectives.

 6.75 Simulation Outputs
  •   Proposed recovery actions.
  •   Feasibility.
  •   Protected customer orders.
  •   Orders still at risk.
  •   Expected delivery dates.
  •   Estimated cost.
  •   Inventory impact.
  •   Supplier impact.
  •   Carrier impact.
  •   Constraint violations.
  •   Expected recovery outcome.

 6.76 Simulation Isolation
 Simulations must operate on isolated, versioned snapshots.
 They must never directly modify live operational inventory, orders or shipments.

 6.77 Stale Simulation Handling
 If relevant operational records change after simulation:
  •   Mark the simulation as stale.
  •   Identify changed entities.
  •   Require revalidation or re-simulation.
  •   Prevent execution against invalidated assumptions.

 MODULE 15 — CONSTRAINT-AWARE RECOVERY
 OPTIMIZER
 6.78 Purpose
 Calculate feasible recovery plans and compare them according to organizational objectives.

 6.79 Technology
 Use Google OR-Tools CP-SAT for the initial optimizer.

 6.80 Hard Constraints
 The optimizer must enforce:
  • Available inventory.
  • Existing reservations.
  • Safety stock policies.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                      Page 27

  •   Supplier production capacity.
  •   Minimum order quantities.
  •   Carrier capacity.
  •   Transit times.
  •   Customer deadlines.
  •   Budget restrictions.
  •   Product compatibility.
  •   Warehouse capacity.
  •   No duplicate fulfilment.
  •   No double allocation.
  •   Existing commitments.

 6.81 Optimization Objective
 Minimize a configurable weighted objective:
 Total Recovery Cost =
 Late or Unfulfilled Order Penalties
 + Recovery Expenditure
 + Expedited Transportation Cost
 + Alternative Supplier Cost
 + Transfer and Handling Cost
 + Downstream Disruption Cost
 The exact mathematical formulation must be documented in the technical implementation.

 6.82 Optimization Modes
 Support:
  •   Lowest-cost feasible recovery.
  •   Maximum on-time order protection.
  •   Balanced recovery strategy.
  •   Infeasible result with constraint explanations.

 6.83 Plan Comparison
 Compare:
  •   Orders protected.
  •   Orders remaining at risk.
  •   Recovery cost.
  •   Expected completion.
  •   Inventory impact.
  •   Supplier impact.
  •   Constraint compliance.
  •   Feasibility.
 All values must originate from actual optimizer output.
 The application must never represent hardcoded recommendations as calculated results.

 MODULE 16 — RECOVERY PLAN MANAGEMENT
 6.84 Plan Structure
 Each recovery plan must contain:
  • Plan ID.
  • Organization ID.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                  Page 28

  •   Incident references.
  •   Creator.
  •   Plan version.
  •   Simulation reference.
  •   Proposed actions.
  •   Estimated cost.
  •   Feasibility result.
  •   Expected outcome.
  •   Approval requirements.
  •   Current status.
  •   Created timestamp.
  •   Updated timestamp.

 6.85 Plan Lifecycle
 DRAFT → SIMULATED → SUBMITTED → UNDER_REVIEW
 Possible outcomes:
  •   APPROVED.
  •   REJECTED.
  •   REVISION_REQUIRED.
  •   CANCELLED.
  •   EXPIRED.
  •   INVALIDATED.
 After approval:
 APPROVED → EXECUTION_PENDING → EXECUTING → COMPLETED
 Additional execution states:
  • PARTIALLY_COMPLETED.
  • FAILED.
  • MANUAL_REVIEW.

 6.86 Plan Versioning
 Every material modification must create a new version.
 Approvals must be associated with the exact version reviewed.
 A modification must invalidate previous approvals where the changed fields affect the approved decision.

 MODULE 17 — APPROVAL AND MODIFICATION
 WORKFLOW
 6.87 Purpose
 Provide structured and authorized approval of recovery plans.

 6.88 Supported Actions
 Authorized users must be able to:
  •   Approve.
  •   Reject.
  •   Request modifications.
  •   Add comments.
  •   Review evidence.
  •   Inspect simulation results.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                            Page 29

  • View plan versions.
  • Review previous decisions.

 6.89 Required Approval Process
 SUBMITTED → UNDER_REVIEW
 From UNDER_REVIEW:
  • APPROVE → APPROVED.
  • REJECT → REJECTED.
  • REQUEST MODIFICATION → REVISION_REQUIRED.
 For modification:
 REVISION_REQUIRED → MODIFIED → RESUBMITTED → UNDER_REVIEW
 A modified plan must receive a new version.
 Previous approvals must not automatically carry over.

 6.90 Separation of Duties
 For restricted plans:
  •   Creator and approver must be different users.
  •   Approval authority must match the relevant action.
  •   Multi-stage approvals must be completed where required.
  •   A user cannot approve an outdated plan version.
  •   Concurrent approval attempts must be handled transactionally.
  •   Duplicate approval submissions must be idempotent.

 6.91 Approval Status
  •   PENDING.
  •   APPROVED.
  •   REJECTED.
  •   REVISION_REQUIRED.
  •   EXPIRED.
  •   CHAIN_PENDING.
  •   CHAIN_CONFIRMED.
  •   CHAIN_FAILED.

 6.92 Backend Enforcement
 All approval decisions must be validated on the backend.
 The frontend must not determine whether a user is allowed to approve.

 MODULE 18 — EXECUTION CENTRE
 6.93 Purpose
 Manage and simulate approved recovery actions.

 6.94 Mandatory Execution Rule
 Execution must be simulated only after all required approvals have been completed and an
 authorized user has explicitly confirmed execution.
 The following must never independently trigger execution:
  • AI recommendation.
  • Simulation completion.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                               Page 30

  •   Plan creation.
  •   Plan submission.
  •   Approval notification.
  •   Frontend navigation.

 6.95 Execution Confirmation
 Before execution, display:
  •   Plan ID.
  •   Approved plan version.
  •   Required approvals.
  •   Approver identities.
  •   Estimated recovery cost.
  •   Proposed actions.
  •   Current inventory state.
  •   Simulation freshness.
  •   Execution consequences.
 The authorized user must explicitly confirm.
 Record:
  •   Confirming user.
  •   Confirmation timestamp.
  •   Approved plan version.
  •   Simulation reference.
  •   Execution request ID.

 6.96 Simulated Actions
 Depending on the approved plan:
  •   Simulate inventory transfer.
  •   Simulate shipment expediting.
  •   Simulate alternative procurement.
  •   Simulate order splitting.
  •   Simulate fulfilment allocation changes.
 The MVP must not claim to perform real external procurement or transportation operations unless a real
 integration is implemented.

 6.97 Execution Action States
  •   PENDING.
  •   RUNNING.
  •   SUCCEEDED.
  •   FAILED.
  •   COMPENSATING.
  •   COMPENSATED.
  •   MANUAL_REVIEW.

 6.98 Execution Reliability
  •   Revalidate operational state.
  •   Use idempotency keys.
  •   Prevent duplicate execution.
  •   Persist action progress.
  •   Resume safely after worker restart.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                           Page 31

  •   Support partial completion.
  •   Record failures.
  •   Compensate where possible.
  •   Route unresolved outcomes to manual review.

 MODULE 19 — NOTIFICATIONS
 6.99 Notification Types
  •   New disruption.
  •   Critical disruption.
  •   Shipment delay.
  •   Supplier delay.
  •   Inventory shortage.
  •   High-risk order.
  •   Recovery plan submitted.
  •   Approval required.
  •   Plan approved.
  •   Plan rejected.
  •   Revision requested.
  •   Execution started.
  •   Execution completed.
  •   Execution failed.
  •   Blockchain confirmation.

 6.100 Channels
  •   In-app notifications.
  •   Web notifications where supported.
  •   Mobile push notifications.
  •   Email.
  •   Optional SMS integration.

 6.101 Notification Rules
  •   Backend is the authoritative notification generator.
  •   Prevent duplicate notifications.
  •   Support severity-based routing.
  •   Allow notification preferences.
  •   Preserve notification history.
  •   Do not expose unnecessary sensitive information through external channels.

 MODULE 20 — AUDIT AND ACCOUNTABILITY
 6.102 Purpose
 Maintain a complete record of important system and operational decisions.

 6.103 Mandatory Audit Events
 Record:
  • User login and logout.
  • Role changes.
  • Data imports.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                           Page 32

  •   Inventory changes.
  •   Shipment updates.
  •   Event ingestion.
  •   Disruption detection.
  •   Impact assessments.
  •   Risk calculations.
  •   AI recommendation generation.
  •   Simulation creation.
  •   Optimizer results.
  •   Recovery plan creation.
  •   Plan modifications.
  •   Approval and rejection.
  •   Execution confirmation.
  •   Execution actions.
  •   Blockchain transactions.
  •   Administrative changes.

 6.104 Audit Record Structure
 Each record must contain:
  •   Audit ID.
  •   Organization ID.
  •   Actor ID.
  •   Action type.
  •   Entity type.
  •   Entity ID.
  •   Timestamp.
  •   Relevant plan version.
  •   Request or correlation ID.
  •   Previous hash.
  •   Current hash.
  •   Relevant metadata.

 6.105 Audit Integrity
 Use canonical serialization and SHA-256 hash chaining.
 H(n) = SHA256(H(n-1) || CanonicalEvent(n))
 Requirements:
  •   Append-only audit records.
  •   Application users cannot update or delete audit entries.
  •   Hash verification capability.
  •   Integrity verification reports.
  •   Complete approval and execution history.
 A hash chain held only in one database does not independently prevent a privileged administrator from
 rewriting the entire chain. Production-grade integrity should use externally anchored checkpoints or
 signatures.

 MODULE 21 — BLOCKCHAIN ACCOUNTABILITY
 6.106 Purpose
 Provide independently verifiable evidence of selected critical decisions.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                           Page 33

 Blockchain is an accountability layer, not the operational database.

 6.107 Architecture
  •   Solidity.
  •   Hardhat.
  •   OpenZeppelin.
  •   EVM-compatible network.
  •   Polygon Amoy or another selected test network.
  •   MetaMask for supported web workflows.
  •   WalletConnect-compatible integration for mobile.
 Use a hybrid architecture:
 PostgreSQL → Operational Records
 FastAPI → Business Logic and Governance
 Smart Contracts → Verifiable Approval Evidence

 6.108 On-Chain Information
  •   Recovery plan hash.
  •   Simulation hash.
  •   Plan version.
  •   Creator wallet.
  •   Approver wallet.
  •   Approval stage.
  •   Approval decision.
  •   Timestamp.
  •   Execution evidence hash.

 6.109 Off-Chain Information
 Keep:
  •   Customer names.
  •   Supplier contracts.
  •   Product information.
  •   Inventory records.
  •   Shipment information.
  •   Pricing.
  •   Customer order details.
  •   Personal information.
 in PostgreSQL or appropriate secure storage.

 6.110 Smart Contract Requirements
  •   Approver registration.
  •   Approval-stage validation.
  •   Plan hash validation.
  •   Plan version matching.
  •   Duplicate decision protection.
  •   Creator-versus-approver separation.
  •   Approval event emission.
  •   Execution evidence anchoring.

 6.111 Wallet Security

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                Page 34

 A connected wallet does not automatically prove organizational authority.
 Wallet identity must be linked to a verified organizational user.
 The backend must validate organizational permissions and wallet authorization.

 6.112 Blockchain Confirmation
 Distinguish:
  •   Transaction created.
  •   Transaction submitted.
  •   Transaction included in a block.
  •   Transaction confirmed according to configured policy.
  •   Transaction failed or reverted.
 Do not treat transaction submission as confirmed approval.

 6.113 Blockchain Failure
 If the network becomes unavailable:
  •   Continue disruption detection.
  •   Continue impact analysis.
  •   Continue risk calculations.
  •   Continue simulation and optimization.
  •   Keep chain-dependent approval pending.
 Track:
  •   CHAIN_PENDING.
  •   CHAIN_CONFIRMED.
  •   CHAIN_FAILED.
  •   CHAIN_REORG_REVIEW.

 MODULE 22 — REPORTING AND ANALYTICS
 6.114 Reports
 Generate:
  •   Disruption summary.
  •   Shipment delay report.
  •   Supplier performance report.
  •   Warehouse inventory report.
  •   At-risk order report.
  •   Recovery cost report.
  •   Recovery effectiveness report.
  •   Approval history.
  •   Execution performance.
  •   Audit integrity report.

 6.115 Export
 Support:
  • CSV.
  • PDF.
 Exports must follow user permissions and organization isolation.

 7. MOBILE APPLICATION REQUIREMENTS

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                          Page 35

 7.1 Technology
  •   React Native.
  •   Expo.
  •   TypeScript.
  •   Expo Router.
  •   NativeWind.
  •   TanStack Query.
  •   Axios.
  •   Expo SecureStore.
  •   Expo Notifications.
  •   Expo Camera.
  •   Expo Local Authentication.
  •   SQLite.
  •   WalletConnect-compatible integration.

 7.2 Mobile Screens
  1. Login.
  2. Mobile Command Centre.
  3. Disruption Management.
  4. Shipment Tracking.
  5. Warehouse Operations.
  6. Customer Order Management.
  7. Risk Intelligence.
  8. Recovery Plan Review.
  9. Approval Centre.
  10. Notifications.
  11. Blockchain Verification.
  12. Profile and Settings.

 7.3 Warehouse Operations
 Support:
  •   Barcode scanning.
  •   QR scanning.
  •   Product lookup.
  •   Shipment lookup.
  •   Goods receipt.
  •   Quantity confirmation.
  •   Damaged goods reporting.
  •   Stock transfer confirmation.
  •   Assigned warehouse tasks.
 QR codes are identifiers only. The backend must validate the referenced entity and user permission.

 7.4 Mobile Approval
 Authorized users can:
  •   Review plans.
  •   Inspect cost and impact.
  •   Review evidence.
  •   Inspect plan versions.
  •   Approve or reject.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                               Page 36

  • Connect a supported wallet.
  • View transaction status.

 7.5 Offline Functionality
 SQLite may support limited offline task preparation.
 Permitted offline operations:
  •   Receiving observations.
  •   Damage reports.
  •   Transfer confirmations.
  •   Task notes.
 Each queued operation must include:
  •   Unique local operation ID.
  •   User reference.
  •   Device timestamp.
  •   Entity reference.
  •   Entity version.
  •   Operation type.
  •   Payload.
  •   Sync state.
 Offline actions must not independently authorize inventory reservations, recovery approvals, procurement
 approvals or execution.
 On reconnection, the backend must revalidate:
  •   User permissions.
  •   Entity version.
  •   Duplicate status.
  •   Inventory state.
  •   Validity of the requested operation.
 Possible synchronization statuses:
  •   SAVED_LOCALLY.
  •   PENDING_SYNC.
  •   SYNCHRONIZED.
  •   REJECTED.
  •   CONFLICT.
 The application must never silently overwrite conflicting server-side data.

 7.6 Mobile Security
  •   HTTPS.
  •   Secure token storage.
  •   Session revocation.
  •   Backend RBAC.
  •   Minimal local data.
  •   Secure logout.
  •   No embedded private keys.
  •   No production secrets in the application.
  •   Optional local biometric authentication.

 8. TECHNICAL ARCHITECTURE

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                           Page 37

 8.1 Architecture Style
 Use a modular monolith.
 Do not introduce unnecessary microservices for the initial implementation.
 Modules must have clearly defined responsibilities and interfaces.

 8.2 Recommended Stack
 Web Frontend
  •   React.
  •   TypeScript.
  •   Vite.
  •   Tailwind CSS.
  •   shadcn/ui.
  •   Recharts.
  •   React Flow.
  •   TanStack Query.
  •   Axios.
  •   Framer Motion.

 Mobile Frontend
  •   React Native.
  •   Expo.
  •   TypeScript.
  •   Expo Router.
  •   NativeWind.
  •   TanStack Query.
  •   Expo SecureStore.
  •   Expo Notifications.
  •   Expo Camera.
  •   SQLite.

 Backend
  •   Python 3.11+.
  •   FastAPI.
  •   Pydantic.
  •   SQLAlchemy.
  •   Alembic.
  •   WebSockets.

 Database
  • PostgreSQL.
  • Redis.

 Intelligence
  • NetworkX.
  • Google OR-Tools.
  • LLM API with structured outputs.

 Blockchain
  • Solidity.
  • Hardhat.
  • OpenZeppelin.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                      Page 38

  • EVM-compatible test network.

 Testing and Deployment
  •   Docker.
  •   Docker Compose.
  •   Pytest.
  •   HTTPX.
  •   Hypothesis.
  •   Playwright.
  •   Locust.

 8.3 Backend Modules
 Suggested backend structure:
 backend/
  • app/
 - api/
 - core/
 - models/
 - schemas/
 - repositories/
 - services/
 - auth/
 - permissions/
 - ingestion/
 - suppliers/
 - shipments/
 - warehouses/
 - inventory/
 - orders/
 - digital_twin/
 - disruptions/
 - impact/
 - risk/
 - ai/
 - simulation/
 - optimizer/
 - recovery/
 - approvals/
 - execution/
 - notifications/
 - audit/
 - blockchain/
 - integrations/
 - workers/
  • migrations/

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 39

  • tests/
  • scripts/

 8.4 Data Flow
  1. Data is imported or received through an integration.
  2. FastAPI validates the input.
  3. Valid records are persisted.
  4. Event processing updates operational state.
  5. Digital Twin relationships are refreshed.
  6. Disruption detection evaluates the new information.
  7. Impact analysis traces dependent records.
  8. Risk Intelligence prioritizes affected orders.
  9. AI provides contextual explanations and suggestions.
  10. Deterministic rules validate the proposals.
  11. OR-Tools evaluates recovery alternatives.
  12. Recovery plans are submitted.
  13. Approval services enforce governance.
  14. Blockchain records selected approval evidence.
  15. Authorized execution confirmation starts simulated execution.
  16. Audit and notification services record the outcome.
  17. Web and mobile applications display the updated state.

 9. DATABASE DESIGN
 9.1 Core Tables
 Identity
  •   organizations
  •   users
  •   roles
  •   permissions
  •   user_roles
  •   user_wallets
  •   sessions

 Supply Chain
  •   suppliers
  •   products
  •   warehouses
  •   carriers
  •   purchase_orders
  •   purchase_order_items
  •   shipments
  •   shipment_items
  •   carrier_events
  •   supplier_events

 Inventory and Fulfilment
  • inventory
  • inventory_adjustments
  • inventory_lots

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification              Page 40

  •   reservations
  •   stock_transfers
  •   customer_orders
  •   order_items
  •   fulfilment_allocations

 Intelligence
  •   disruptions
  •   impact_assessments
  •   risk_assessments
  •   dependency_snapshots
  •   simulation_snapshots

 Recovery
  •   recovery_plans
  •   recovery_plan_actions
  •   approvals
  •   execution_runs
  •   execution_actions

 Governance
  •   audit_events
  •   blockchain_transactions
  •   blockchain_events
  •   notifications

 Integrations
  •   integration_configs
  •   integration_event_logs
  •   import_jobs
  •   import_errors

 9.2 Database Principles
  •   Normalize operational entities.
  •   Use foreign keys.
  •   Use unique constraints.
  •   Use organization scoping.
  •   Add appropriate indexes.
  •   Use transactions for inventory operations.
  •   Use versioning for mutable records.
  •   Preserve immutable event and audit history.
  •   Use JSONB for selected external payloads.
  •   Maintain PostgreSQL as the operational source of truth.
 The core operational schema should generally follow Third Normal Form.

 10. API REQUIREMENTS
 All API paths must use versioning:
 /api/v1/

 10.1 Authentication
  • POST /auth/login

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                  Page 41

  •   POST /auth/refresh
  •   POST /auth/logout
  •   POST /auth/password-reset
  •   GET /auth/me

 10.2 Suppliers
  •   GET /suppliers
  •   POST /suppliers
  •   GET /suppliers/{id}
  •   PATCH /suppliers/{id}
  •   GET /suppliers/{id}/shipments
  •   GET /suppliers/{id}/performance

 10.3 Shipments
  •   GET /shipments
  •   POST /shipments
  •   GET /shipments/{id}
  •   PATCH /shipments/{id}
  •   GET /shipments/{id}/events

 10.4 Carrier Webhook
  • POST /webhooks/carriers/simulated

 10.5 Inventory
  •   GET /inventory
  •   GET /inventory/{id}
  •   POST /inventory/receive
  •   POST /inventory/adjust
  •   POST /inventory/reserve
  •   POST /inventory/release
  •   POST /inventory/transfer
  •   POST /inventory/damage-report

 10.6 Orders
  •   GET /orders
  •   POST /orders
  •   GET /orders/{id}
  •   GET /orders/{id}/impact
  •   GET /orders/{id}/risk

 10.7 Imports
  •   POST /imports/csv
  •   POST /imports/json
  •   GET /imports/{id}
  •   GET /imports/{id}/errors
  •   POST /imports/{id}/confirm

 10.8 Disruptions
  • GET /disruptions
  • POST /disruptions

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 42

  •   GET /disruptions/{id}
  •   PATCH /disruptions/{id}
  •   GET /disruptions/{id}/impact
  •   POST /disruptions/{id}/reassess

 10.9 AI and Recovery
  •   POST /ai/disruptions/{id}/summary
  •   POST /ai/disruptions/{id}/recommendations
  •   POST /recovery/simulate
  •   POST /recovery/optimize
  •   GET /recovery/plans
  •   POST /recovery/plans
  •   GET /recovery/plans/{id}
  •   POST /recovery/plans/{id}/submit
  •   POST /recovery/plans/{id}/revalidate

 10.10 Approvals
  •   GET /approvals
  •   POST /approvals/{id}/approve
  •   POST /approvals/{id}/reject
  •   POST /approvals/{id}/request-revision

 10.11 Execution
  •   GET /execution
  •   POST /execution/{id}/confirm
  •   POST /execution/{id}/start
  •   GET /execution/{id}/status
 The start endpoint must only accept valid, authorized and confirmed execution requests.

 10.12 Blockchain
  •   POST /blockchain/anchor
  •   GET /blockchain/transactions
  •   GET /blockchain/transactions/{id}
  •   GET /blockchain/verify/{entity_type}/{entity_id}

 10.13 Notifications and Audit
  •   GET /notifications
  •   PATCH /notifications/{id}/read
  •   GET /audit
  •   GET /reports
 Every endpoint must document:
  •   Request schema.
  •   Response schema.
  •   Permission requirements.
  •   Validation rules.
  •   Error responses.
  •   Idempotency requirements where applicable.

 11. UI AND USER EXPERIENCE

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                   Page 43

 11.1 Design Direction
 The interface should have a professional enterprise operations aesthetic.
 It must communicate:
  •   Reliability.
  •   Operational clarity.
  •   Trust.
  •   Technical precision.
  •   Accountability.

 11.2 Web Navigation
  1. Command Centre.
  2. Digital Twin.
  3. Disruptions.
  4. Suppliers.
  5. Shipments.
  6. Warehouses and Inventory.
  7. Customer Orders.
  8. Risk Intelligence.
  9. Recovery Studio.
  10. Approval Centre.
  11. Execution Centre.
  12. Blockchain Verification.
  13. Audit and Reports.
  14. Administration.

 11.3 UI Requirements
  •   Responsive layouts.
  •   Consistent design system.
  •   Search and filters.
  •   Status indicators.
  •   Detailed entity pages.
  •   Breadcrumb navigation.
  •   Loading states.
  •   Empty states.
  •   Error states.
  •   Confirmation dialogs.
  •   Accessible controls.
  •   Explainable risk indicators.
  •   Clear optimizer result comparisons.

 11.4 Mobile Experience
 Mobile must prioritize operational tasks.
 Warehouse operators should be able to complete scanning and receiving workflows quickly.
 Managers should be able to review critical incidents and approvals with minimal navigation.
 Do not simply compress the complete desktop interface into a mobile layout.

 12. SECURITY AND PRIVACY

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                       Page 44

 12.1 Security Requirements
  •   HTTPS.
  •   Argon2 password hashing.
  •   JWT authentication.
  •   Backend-enforced RBAC.
  •   Organization isolation.
  •   Input validation.
  •   SQL injection protection.
  •   Rate limiting.
  •   Secure secret management.
  •   Audit logging.
  •   Session revocation.
  •   Secure mobile token storage.
  •   Dependency vulnerability checks.

 12.2 Webhook Security
 The simulated webhook must authenticate its source.
 Use a configurable secret or signature mechanism.
 Validate payloads and reject unauthorized requests.
 In production integrations, use appropriate source-specific signature verification and replay protection.

 12.3 Data Protection
 Do not put sensitive customer or supplier information on-chain.
 Use secure storage, appropriate access controls and configurable retention policies.

 12.4 Threat Testing
 Test:
  •   Role escalation.
  •   Cross-organization access.
  •   Duplicate event injection.
  •   Replay attacks.
  •   Malformed webhook payloads.
  •   Invalid imports.
  •   Wallet impersonation.
  •   Unauthorized approval.
  •   Inventory race conditions.
  •   Token theft.
  •   Compromised integration credentials.

 13. NON-FUNCTIONAL REQUIREMENTS
 13.1 Performance
 Initial engineering targets:
  •   Typical dashboard responses under 2 seconds at the defined test load.
  •   Standard entity lookups under 1 second at the defined test load.
  •   Prompt delivery of critical realtime updates.
  •   Bounded optimizer execution time.
  •   Paginated large data queries.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                                Page 45

  • Bounded graph traversal.
 These targets must be benchmarked against documented dataset sizes and hardware.

 13.2 Reliability
  •   Transactional inventory operations.
  •   Idempotent event processing.
  •   Durable execution state.
  •   Background task retry.
  •   Integration health monitoring.
  •   Database backups.
  •   Graceful AI failure handling.
  •   Graceful blockchain failure handling.

 13.3 Scalability
  •   Indexed database queries.
  •   Pagination.
  •   Background workers.
  •   Redis caching where useful.
  •   Efficient graph traversal.
  •   Configurable task concurrency.
  •   Clear module boundaries.

 13.4 Maintainability
  •   Modular backend.
  •   Typed frontend.
  •   Documented APIs.
  •   Database migrations.
  •   Automated testing.
  •   Structured logging.
  •   Centralized configuration.
  •   Reproducible development environment.

 14. EDGE CASES AND FAILURE HANDLING
 The following cases are mandatory test scenarios.

 14.1 Duplicate Carrier Event
 A carrier sends the same event multiple times.
 Expected result:
  •   Duplicate identified.
  •   No repeated state change.
  •   No duplicate recovery action.
  •   No duplicate notification.

 14.2 Out-of-Order Shipment Event
 An older event arrives after a newer event.
 Expected result:
  • Historical event retained.
  • Newer accepted state preserved.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                            Page 46

  • Invalid state transition rejected.

 14.3 Reserved Inventory
 A warehouse has physical stock, but some is already reserved.
 Expected result:
  • Optimizer uses only eligible stock.
  • Infeasible transfer rejected.
  • Reservation quantities remain protected.

 14.4 Multiple Disruptions
 Two disruptions affect the same customer order.
 Expected result:
  • Combined impact assessment.
  • No double counting.
  • Consolidated risk explanation.

 14.5 Conflicting Updates
 Carrier and warehouse report conflicting shipment states.
 Expected result:
  • Both observations preserved.
  • Source-authority policy applied.
  • Unresolved conflicts flagged.

 14.6 Concurrent Recovery Plans
 Two plans require the same stock.
 Expected result:
  • Transactional validation.
  • No double reservation.
  • One plan may become stale or infeasible.

 14.7 Blockchain Outage
 Blockchain unavailable.
 Expected result:
  • Core analysis continues.
  • Chain-dependent approvals remain pending.
  • No false confirmation.

 14.8 AI Provider Outage
 LLM unavailable.
 Expected result:
  • Deterministic logic continues.
  • Optimizer continues.
  • No fabricated AI recommendation.

 14.9 Mobile Offline Conflict
 A warehouse action is prepared offline while the entity changes on the server.
 Expected result:
  • Backend detects version conflict.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                          Page 47

  • User receives a clear conflict state.
  • No silent overwrite.

 14.10 Partial Execution Failure
 A recovery plan has multiple actions and some fail.
 Expected result:
  •   Every action has an independent state.
  •   Completed actions are not repeated.
  •   Compensation is attempted where appropriate.
  •   Unresolved actions enter manual review.

 14.11 Invalid Imported Data
 A CSV contains negative quantities and unknown foreign keys.
 Expected result:
  •   Invalid records rejected.
  •   Valid records handled according to import mode.
  •   Errors reported with row numbers.
  •   No silent data corruption.

 14.12 Expired Recovery Plan
 A plan is approved but its operational assumptions have changed.
 Expected result:
  • Revalidation detects stale state.
  • Execution is blocked until the plan is revalidated and any necessary new approvals are obtained.

 15. MANDATORY DEMONSTRATION SCENARIOS
 At least two complete disruption-to-recovery scenarios must be demonstrated.
 The platform should provide four repeatable synthetic scenarios.

 15.1 Scenario One — Supplier and Shipment Delay
 Initial State
  •   Supplier A supplies Product X.
  •   Shipment SHP-1001 is travelling to Warehouse A.
  •   Warehouse A has limited usable inventory.
  •   Several customer orders depend on Product X.
  •   One order has a strict contractual delivery deadline.

 Trigger
 The simulated carrier webhook reports a 48-hour shipment delay.

 Expected Workflow
  1. Carrier webhook received.
  2. Source authenticated.
  3. Payload validated.
  4. Event persisted.
  5. Shipment marked delayed.
  6. Disruption detected.
  7. Digital Twin dependencies traversed.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                               Page 48

  8. Affected inventory identified.
  9. Affected customer orders identified.
  10. Risk scores calculated.
  11. AI summary generated.
  12. AI suggests recovery alternatives.
  13. Deterministic rules validate alternatives.
  14. Optimizer compares feasible strategies.
  15. Analyst submits a recovery plan.
  16. Manager reviews the plan.
  17. Unauthorized self-approval attempt is rejected where applicable.
  18. Authorized approval completed.
  19. Execution confirmation requested.
  20. Authorized user confirms execution.
  21. Simulated actions begin.
  22. Notifications generated.
  23. Audit records preserved.
  24. Dashboard updated.

 Demonstration Objective
 Prove that TRUSTCHAIN can convert a shipment delay into an actionable, governed customer-order
 recovery workflow.

 15.2 Scenario Two — Warehouse Inventory Shortage
 Initial State
  •   Warehouse A requires Product Y.
  •   Warehouse A has insufficient usable stock.
  •   Warehouse B has stock available.
  •   Some Warehouse B inventory is already reserved.
  •   Multiple customer orders depend on Product Y.

 Trigger
 An inventory adjustment or damage report reduces Warehouse A's usable stock.

 Expected Workflow
  1. Inventory event received.
  2. Inventory updated transactionally.
  3. Stock shortage detected.
  4. Downstream order impact calculated.
  5. Affected orders ranked.
  6. AI suggests a stock transfer, split fulfilment or alternative supplier.
  7. Deterministic rules calculate transferable inventory.
  8. Optimizer evaluates recovery alternatives.
  9. A proposal attempting to use reserved stock is rejected.
  10. A feasible plan is created.
  11. Authorized manager reviews it.
  12. Approval completed.
  13. Explicit execution confirmation obtained.
  14. Stock transfer simulated.
  15. Inventory and fulfilment projections updated.
  16. Notifications and audit records generated.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                          Page 49

 Demonstration Objective
 Prove that TRUSTCHAIN understands the difference between physical inventory and genuinely available
 inventory.

 15.3 Scenario Three — Duplicate and Conflicting Events
  •   Send duplicate carrier events.
  •   Send out-of-order events.
  •   Send a conflicting warehouse observation.
  •   Demonstrate deduplication and source-authority policies.

 15.4 Scenario Four — Compound Disruption
  •   Trigger a supplier delay.
  •   Trigger a warehouse shortage.
  •   Affect overlapping customer orders.
  •   Consolidate the impact.
  •   Compare alternative recovery plans.
  •   Demonstrate approval and execution.

 16. TESTING AND QUALITY ASSURANCE
 16.1 Unit Tests
 Test:
  •   Inventory formulas.
  •   Risk scoring.
  •   Deadline calculations.
  •   Graph traversal.
  •   Event validation.
  •   State transitions.
  •   Optimizer constraints.
  •   Approval permissions.
  •   Hash generation.

 16.2 Integration Tests
 Test:
  •   Database transactions.
  •   CSV and JSON import.
  •   Simulated carrier webhook.
  •   Duplicate event protection.
  •   Impact calculation.
  •   AI structured output validation.
  •   OR-Tools integration.
  •   Approval workflow.
  •   Execution confirmation.
  •   Blockchain verification.
  •   Notifications.

 16.3 End-to-End Tests
 Use Playwright for web workflows.
 Use appropriate React Native testing tools for mobile workflows.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                         Page 50

 At minimum, test the two mandatory disruption scenarios from import through recovery execution.

 16.4 Concurrency Tests
 Test simultaneous:
  •   Inventory reservations.
  •   Stock transfers.
  •   Plan submissions.
  •   Approval attempts.
  •   Duplicate event processing.
  •   Execution confirmation.

 16.5 Security Tests
 Test:
  •   Unauthorized access.
  •   Role escalation.
  •   Cross-organization data access.
  •   Self-approval.
  •   Invalid wallet authorization.
  •   Replay attacks.
  •   Malformed imports.
  •   Webhook authentication.

 16.6 Optimizer Validation
 For each synthetic scenario, verify:
  •   Hard constraint compliance.
  •   Feasibility.
  •   Objective value.
  •   Protected orders.
  •   Remaining at-risk orders.
  •   Recovery cost.
  •   Deterministic or explainable results.

 17. API AND SYSTEM ERROR HANDLING
 The platform must return structured error responses.
 Examples:
  •   400: Invalid input.
  •   401: Unauthenticated.
  •   403: Unauthorized operation.
  •   404: Entity not found.
  •   409: Conflict or stale entity version.
  •   422: Business rule or schema validation failure.
  •   429: Rate limit exceeded.
  •   500: Unexpected internal failure.
  •   503: Temporarily unavailable dependency.
 Error responses must include a traceable request or correlation ID where appropriate.
 Do not expose stack traces, secrets or sensitive operational data to clients.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                           Page 51

 18. IMPLEMENTATION ROADMAP
 Phase 1 — Foundation
  •   Repository audit.
  •   Project structure.
  •   Docker development environment.
  •   PostgreSQL.
  •   Database migrations.
  •   Authentication.
  •   RBAC.
  •   Organization isolation.
  •   Synthetic data generator.

 Phase 2 — Operational Data
  •   Suppliers.
  •   Products.
  •   Warehouses.
  •   Carriers.
  •   Shipments.
  •   Inventory.
  •   Customer orders.
  •   CSV and JSON import.

 Phase 3 — Event Ingestion
  •   Simulated carrier webhook.
  •   Webhook authentication.
  •   Payload validation.
  •   Event store.
  •   Duplicate protection.
  •   Out-of-order event handling.
  •   Conflict resolution.

 Phase 4 — Disruption Intelligence
  •   Late shipment detection.
  •   Supplier delay detection.
  •   Inventory shortage detection.
  •   Digital Twin.
  •   Downstream impact analysis.
  •   Incident management.

 Phase 5 — Risk and AI
  •   Risk engine.
  •   Explainable scoring.
  •   AI incident summaries.
  •   AI recovery recommendations.
  •   Structured output validation.
  •   Deterministic rule engine.

 Phase 6 — Recovery Optimization

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 52

  •   Simulation snapshots.
  •   OR-Tools optimizer.
  •   Inventory reallocation.
  •   Expedited shipment.
  •   Alternative supplier.
  •   Split fulfilment.
  •   Recovery plan comparison.

 Phase 7 — Governance
  •   Plan versioning.
  •   Approval workflows.
  •   Separation of duties.
  •   Self-approval prevention.
  •   Modification workflow.
  •   Execution confirmation.
  •   Simulated execution.
  •   Audit trail.

 Phase 8 — Web Application
  •   Command Centre.
  •   Digital Twin.
  •   Supplier management.
  •   Shipment management.
  •   Warehouse and inventory.
  •   Order management.
  •   Disruption management.
  •   Risk Intelligence.
  •   Recovery Studio.
  •   Approval Centre.
  •   Execution Centre.
  •   Audit and reporting.

 Phase 9 — Blockchain
  •   Smart contracts.
  •   Hardhat tests.
  •   Wallet integration.
  •   Approval evidence.
  •   Transaction verification.
  •   Blockchain dashboard.

 Phase 10 — Mobile Application
  •   Expo setup.
  •   Authentication.
  •   Mobile Command Centre.
  •   Disruption and shipment screens.
  •   Warehouse operations.
  •   Barcode and QR scanning.
  •   Approval workflows.
  •   Push notifications.
  •   Offline task preparation.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 53

  • Conflict-aware synchronization.

 Phase 11 — Quality and Deployment
  •   End-to-end testing.
  •   Security testing.
  •   Concurrency testing.
  •   Optimizer benchmarking.
  •   Docker deployment.
  •   Android build.
  •   iOS build configuration.
  •   Documentation.
  •   Demonstration scenarios.

 19. MVP PRIORITIES
 19.1 Mandatory Challenge MVP
 The first working release must include:
  1. Persistent PostgreSQL database.
  2. Synthetic data generation.
  3. CSV and JSON imports.
  4. Simulated carrier webhook.
  5. Linked supplier, shipment, warehouse, inventory and order data.
  6. Duplicate event handling.
  7. Invalid data validation.
  8. Conflicting update handling.
  9. Late shipment detection.
  10. Supplier delay detection.
  11. Stock shortage detection.
  12. Downstream impact analysis.
  13. Explainable order risk ranking.
  14. AI-generated disruption summaries.
  15. AI-assisted recovery recommendations.
  16. Deterministic inventory, deadline and permission validation.
  17. OR-Tools recovery optimization.
  18. Approve, reject and modify workflows.
  19. Backend-enforced five-role RBAC.
  20. Separation of duties and self-approval prevention.
  21. Explicit execution confirmation.
  22. Simulated recovery execution.
  23. Notifications.
  24. Full audit trail.
  25. Operations dashboard.
  26. At least two complete demonstration scenarios.

 19.2 Complete Product Capabilities
 The complete product specification additionally includes:
  • Full Digital Twin.
  • Advanced recovery simulation.
  • Blockchain accountability.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification               Page 54

  •   Mobile application.
  •   Offline mobile task preparation.
  •   Multi-stage approvals.
  •   Execution orchestration.
  •   Advanced reporting.
  •   Additional integrations.
  •   Extended disruption scenarios.
 The challenge MVP should be completed and tested before advanced functionality is allowed to delay it.

 20. FINAL ACCEPTANCE CRITERIA
 The initial challenge implementation is accepted only when all the following conditions are demonstrated.

 Data
  ■ PostgreSQL persists operational records.
  ■ Synthetic data can be generated reproducibly.
  ■ CSV import works.
  ■ JSON import works.
  ■ Invalid records are rejected or reported according to import mode.
  ■ Foreign-key relationships are valid.
  ■ Data is not silently overwritten.

 Event Ingestion
  ■ Simulated carrier webhook endpoint works.
  ■ Webhook source is authenticated.
  ■ Payload validation works.
  ■ Duplicate events are handled idempotently.
  ■ Out-of-order events do not overwrite newer state.
  ■ Conflicting updates are preserved and resolved through explicit rules.

 Disruption Intelligence
  ■ Late shipments are detected.
  ■ Supplier delays are detected.
  ■ Inventory shortages are detected.
  ■ Downstream impact is calculated.
  ■ Affected customer order lines are identified.
  ■ Overlapping disruptions do not double-count impact.

 Risk and AI
  ■ Orders receive deterministic risk scores.
  ■ Risk factors are explained.
  ■ AI disruption summaries work.
  ■ AI proposes recovery alternatives.
  ■ AI output undergoes structured validation.
  ■ AI cannot override deterministic business rules.

 Recovery
  ■ Stock reallocation is supported.
  ■ Shipment expediting is supported.
  ■ Alternative supplier selection is supported.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                             Page 55

  ■ Split fulfilment is supported.
  ■ OR-Tools validates recovery feasibility.
  ■ Reserved stock cannot be incorrectly allocated.
  ■ Simulation does not modify live operational records.

 Approval and Execution
  ■ Five mandatory roles are implemented.
  ■ Backend permissions are enforced.
  ■ Self-approval is rejected where separation of duties applies.
  ■ Plans can be approved.
  ■ Plans can be rejected.
  ■ Plans can be modified.
  ■ Modified plans receive new versions.
  ■ Previous approvals do not automatically carry over to materially modified plans.
  ■ Execution cannot start before required approvals.
  ■ Explicit authorized execution confirmation is required.
  ■ Execution actions are simulated and recorded.

 Monitoring and Accountability
  ■ Dashboard displays active disruptions.
  ■ Dashboard displays affected orders.
  ■ Dashboard displays pending approvals.
  ■ Dashboard displays recovery progress.
  ■ Notifications are generated.
  ■ Critical actions are recorded in the audit trail.
  ■ Audit history can be verified.

 Demonstration
  ■ Supplier and shipment delay scenario works end to end.
  ■ Warehouse inventory shortage scenario works end to end.
  ■ Duplicate and conflicting event scenario is demonstrated.
  ■ Compound disruption scenario is reproducible.

 Extended Product
  ■ Mobile application uses the same backend.
  ■ Blockchain verification works for configured chain-dependent decisions.
  ■ Offline mobile tasks synchronize with conflict detection.
  ■ Deployment and recovery documentation is available.

 21. FINAL PRODUCT DEFINITION
 TRUSTCHAIN is an AI-assisted supply chain disruption intelligence and recovery platform that connects
 fragmented supplier, shipment, warehouse, inventory and customer order information to identify
 downstream risks, prioritize affected orders and recommend feasible recovery strategies.
 Its intelligence layer explains what is happening.
 Its deterministic business rules establish what is operationally valid.
 Its optimization engine determines which recovery strategies are feasible and beneficial.
 Its approval workflow ensures that authorized people make critical decisions.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                            Page 56

 Its execution centre ensures that recovery actions are simulated only after explicit authorization and
 confirmation.
 Its audit and blockchain layers provide accountability and verifiable decision evidence.
 Its web application provides complete operational visibility.
 Its mobile application connects operational teams to the same system.
 TRUSTCHAIN's central promise: Every disruption should lead to an understood impact, every
 recovery recommendation should be operationally feasible, and every critical decision should
 be accountable.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                                  Page 57

 Appendix A. RBAC Schema Reference
 This appendix turns the requirements in section 3 (roles), module 1 (authentication and access control),
 module 17 (approvals) and section 9 (database design) into a concrete schema and decision model. It
 does not change any requirement. Items marked proposed are design choices needed to implement the
 requirements and are open for review.

 A.1 Design principles taken from the PRD
  • Permissions are validated on the backend for every protected operation; the frontend and mobile app
    are never a source of authorization (6.2).
  • A client cannot gain permissions by changing its role, request body or local state; roles are resolved
    server-side from the database (6.2, 6.5).
  • Every operational record belongs to an organization and every query and mutation is scoped to the
    caller's organization (6.3).
  • Restricted self-approval is rejected; approval authority must match the action category; approvals bind
    to the exact plan version (6.4, 6.90).
  • Administrator status does not by itself grant approval rights (3.5).
  • A connected wallet does not prove organizational authority; wallets must be linked to a verified
    organizational user (6.111).
  • Authorization decisions are auditable (6.5, 6.103).

 A.2 Tables
 Table                     In PRD 9.1       Purpose

 organizations             Yes              Tenant root. Every other table carries or inherits organization_id.

 users                     Yes              Identity record: email, Argon2id password hash, status, MFA flag.

 roles                     Yes              Role definitions per organization (five mandatory roles plus optional
                                            Auditor).

 permissions               Yes              Catalog of permission codes (resource + action); is_restricted flags
                                            separation-of-duties actions.

 user_roles                Yes              Assigns roles to users; records who assigned and when; supports
                                            revocation.

 role_permissions          No               Join table mapping roles to permissions. Required for a many-to-many
                           (proposed)       mapping.

 user_wallets              Yes              Links a verified organizational user to a blockchain wallet address.

 sessions                  Yes              Refresh-token hash, device info, expiry and revocation for logout and
                                            session revocation.

 approvals                 Yes              Per-stage approval decisions bound to plan_id and plan_version, with
                                            approver and wallet.

 A.3 Proposed extensions (not shown in the main diagram)
 Table                        Why it is needed                                          Key columns

 approval_authorities         Approval authority must match the action category         role_id, action_category,
                              and financial or procurement limits (3.2, 3.4, 6.90).     max_amount, stage

 user_warehouse_assignm       Warehouse Operators may only access assigned              user_id, warehouse_id,
 ents                         warehouses (3.3, 7.3).                                    valid_from, valid_to

 audit_events                 Authorization decisions and role changes must be          actor_id, action_type,
                              recorded in the hash-chained audit trail (6.103,          entity_type, entity_id,
                              6.104).                                                   prev_hash, hash

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                                            Page 58

A.4 Entity-relationship diagram

  TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 59

A.5 Role-permission matrix

  TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 60

A.6 Authorization decision flow

  TRUSTCHAIN PRD v2.0 | Consolidated Product Specification   Page 61

 A.7 Open decisions for review
  • Who may confirm and start execution. The PRD says an 'authorized user' (6.94, 6.95) but does not
    name a role. The matrix shows Supply Chain Manager only. Confirm whether Operations Analyst,
    Procurement Approver or a dedicated permission should also apply.
  • Which plans are 'restricted'. Self-approval is blocked for restricted plans, but the PRD does not
    define the restriction criteria (for example cost threshold, procurement involvement or use of safety
    stock). These should be configurable policy values.
  • Approval authority limits. Financial and procurement limits per role are referenced but no
    thresholds are given. The proposed approval_authorities table holds them.
  • Multi-stage chains. Stage order and which role signs each stage are not specified. Stage definitions
    should be policy data, not code.
  • Custom roles. The PRD fixes five roles and allows Administrators to 'configure permissions' (3.5).
    Decide whether organizations may create custom roles or only adjust the system roles.
  • Administrator read access. Administrators may 'review operational records where authorized' (3.5).
    The scope of that authorization is not defined; the matrix marks these as conditional.
  • Matrix derivation. The matrix in A.5 is derived from the permission lists in section 3. Permissions not
    stated there are denied by default and may need to be added once screens and endpoints are
    finalized.

TRUSTCHAIN PRD v2.0 | Consolidated Product Specification                                              Page 62
