export type SeverityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type DisruptionType =
  | 'shipment_delay'
  | 'inventory_shortage'
  | 'supplier_risk'
  | 'port_congestion';

export interface TimelineEvent {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending';
  actor?: string;
}

export interface Disruption {
  id: string;
  type: DisruptionType;
  title: string;
  reference: string;
  location: string;
  carrier: string;
  supplier: string;
  product: string;
  reportedTime: string;
  estimatedDelay: string;
  affectedOrdersCount: number;
  severity: SeverityLevel;
  status: 'Investigating' | 'Action Required' | 'Plan Ready' | 'Mitigated';
  originalEta: string;
  revisedEta: string;
  reason: string;
  timeline: TimelineEvent[];
  affectedOrderIds: string[];
}

export interface OrderRiskSource {
  kind: 'ml' | 'formula' | 'sample';
  modelVersion: number | null;
  missProbability: number | null;
  topFactors: string[];
  dataSources: string[];
}

export interface AffectedOrder {
  id: string;
  customer: string;
  product: string;
  sku: string;
  units: number;
  deliveryCommitment: string;
  riskScore: number;
  severity: SeverityLevel;
  associatedDisruptionId: string;
  destination: string;
  status: 'At Risk' | 'Delayed' | 'Mitigated' | 'On Schedule';
  revenue: number;
  riskSource?: OrderRiskSource;
  recoveryTier?: 'P1' | 'P2' | 'P3' | null;
}

export interface ImpactSummary {
  disruptionId: string;
  affectedOrders: number;
  totalUnitsAtRisk: number;
  estimatedDelay: string;
  revenueAtRisk: number;
  supplierImpact: {
    supplier: string;
    delay: string;
    details: string;
    severity: SeverityLevel;
  };
  inboundImpact: {
    shipment: string;
    carrier: string;
    units: number;
    severity: SeverityLevel;
  };
  warehouseImpact: {
    warehouse: string;
    bufferRemaining: string;
    severity: SeverityLevel;
  };
}

export type PlanStatus =
  | 'Draft'
  | 'Simulation Complete'
  | 'Pending Approval'
  | 'Approved'
  | 'Rejected'
  | 'In Progress'
  | 'Completed';

export interface RecoveryAction {
  id: string;
  type: 'transfer_stock' | 'expedite_shipment' | 'alternative_supplier' | 'split_fulfilment';
  title: string;
  description: string;
  sourceOrCarrier: string;
  destination: string;
  unitsOrScope: string;
  estimatedCost: number;
  leadTime: string;
  status: 'Configured' | 'Draft' | 'In Progress' | 'Completed';
}

export interface RecoveryPlan {
  id: string;
  planName: string;
  recommendationLabel: string;
  strategy: string;
  relatedDisruptionId: string;
  estimatedCost: number;
  deliveryImpact: string;
  feasibilityScore: number;
  risk: 'Low' | 'Medium' | 'High';
  benefits: string[];
  constraints: string[];
  status: PlanStatus;
  priority: 'High' | 'Medium' | 'Critical';
  targetCompletionDate: string;
  actions: RecoveryAction[];
  submittedAt?: string;
  submittedBy?: string;
  assignedApprover?: string;
  planHash?: string | null;
  anchorTx?: string | null;
  anchorStatus?: string | null;
  anchorBlock?: number | null;
  txHash?: string | null;
  chainStatus?: string | null;
  approvalNotes?: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  changeRequestNotes?: string;
  description?: string;
}

export interface ExecutionStage {
  id: string;
  title: string;
  status: 'Completed' | 'In Progress' | 'Pending' | 'Blocked';
  timestamp: string;
  responsibleRole: string;
  responsibleParty: string;
  details: string;
  progressPercent: number;
}

export interface ExecutionTrackingData {
  planId: string;
  planName: string;
  disruptionId: string;
  overallProgress: number;
  status: 'In Progress' | 'Completed' | 'Delayed';
  approvedBy: string;
  approvedAt: string;
  stages: ExecutionStage[];
}

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  severity: SeverityLevel;
  isRead: boolean;
  type: 'disruption' | 'inventory' | 'approval' | 'supplier' | 'order';
  relatedEntityId?: string;
  relatedEntityType?: 'disruption' | 'order' | 'plan';
}

export interface RiskIntelligenceData {
  overallScore: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  orderRiskScore: number;
  inventoryRiskScore: number;
  supplierRiskScore: number;
  highRiskOrders: AffectedOrder[];
}
