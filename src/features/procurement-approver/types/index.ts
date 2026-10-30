export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'changes_requested';
export type RequestPriority = 'Critical' | 'Urgent' | 'High' | 'Medium' | 'Low';
export type RequestType =
  | 'emergency_sourcing'
  | 'alternate_vendor'
  | 'rebalance_purchase'
  | 'standard_po'
  | 'volume_contract';

export type SupplierQualification =
  | 'approved'
  | 'pending_qualification'
  | 'at_risk'
  | 'under_review';

export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export type POStatus = 'open' | 'in_production' | 'dispatched' | 'completed' | 'cancelled';

export interface ProcurementKpis {
  pendingRequestsCount: number;
  approvedTodayCount: number;
  activeSuppliersCount: number;
  highRiskSuppliersCount: number;
  totalUnderReviewAmount: string;
  costSavingsYtd: string;
}

export interface ProcurementRequest {
  id: string;
  type: RequestType;
  typeLabel: string;
  priority: RequestPriority;
  status: RequestStatus;
  productSku: string;
  productName: string;
  requestedQuantity: number;
  unitPrice: number;
  estimatedCost: number;
  currency: string;
  supplierId: string;
  supplierName: string;
  supplierLocation: string;
  qualificationStatus: SupplierQualification;
  submittedBy: string;
  submittedDate: string;
  requiredDate: string;
  disruptionId?: string;
  recoveryPlanId?: string;
  businessJustification: string;
  ordersAffected: string[];
  leadTimeDays: number;
  deliveryImpactDays: number;
  supplierRiskScore: number;
  approvalThreshold: number;
  decisionReason?: string;
  decisionTimestamp?: string;
  decisionActor?: string;
  poId?: string;
  txHash?: string;
}

export interface SupplierProductItem {
  sku: string;
  name: string;
  unitPrice: number;
  moq: number;
  capacity: number;
}

export interface SupplierProfile {
  id: string;
  name: string;
  category: string;
  location: string;
  country: string;
  qualificationStatus: SupplierQualification;
  riskScore: number;
  riskLevel: RiskLevel;
  onTimeDeliveryRate: number;
  qualityScore: number;
  averageLeadTimeDays: number;
  weeklyCapacityUnits: number;
  minOrderQuantity: number;
  activeDisruptions: number;
  spendYTD: string;
  contactRole: string;
  certifications: string[];
  productsSupplied: SupplierProductItem[];
  recentDisruptions?: string[];
  isAlternative?: boolean;
}

export interface ComparisonMetricRow {
  label: string;
  current: string | number;
  alternative: string | number;
  delta: string;
  isAdvantage: boolean;
  isWarning?: boolean;
}

export interface AlternativeComparison {
  id: string;
  requestId?: string;
  productSku: string;
  productName: string;
  currentSupplier: SupplierProfile;
  alternativeSupplier: SupplierProfile;
  metrics: ComparisonMetricRow[];
  advantages: string[];
  risks: string[];
  recommendationNote: string;
  isDemonstrationData: boolean;
}

export interface PurchaseOrderItem {
  sku: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrderAuditRecord {
  event: string;
  actor: string;
  timestamp: string;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  requestId?: string;
  supplierId: string;
  supplierName: string;
  productSku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  currency: string;
  createdAt: string;
  expectedDeliveryDate: string;
  status: POStatus;
  paymentTerms: string;
  shippingTerms: string;
  destinationWarehouse: string;
  approvedBy: string;
  blockchainTxHash?: string;
  items: PurchaseOrderItem[];
  auditHistory: PurchaseOrderAuditRecord[];
}

export interface SupplierRiskDimension {
  key: string;
  name: string;
  score: number;
  level: RiskLevel;
  trend: 'increasing' | 'stable' | 'decreasing';
  description: string;
  factors: string[];
}

export interface ApprovalAuditEvent {
  id: string;
  requestId: string;
  actor: string;
  role: string;
  timestamp: string;
  action:
    | 'submitted'
    | 'reviewed'
    | 'supplier_evaluated'
    | 'approved'
    | 'rejected'
    | 'changes_requested'
    | 'po_created'
    | 'supplier_notified';
  actionLabel: string;
  status: RequestStatus;
  comments?: string;
  txHash?: string;
}

export interface ProcurementNotification {
  id: string;
  type:
    | 'new_request'
    | 'approval_required'
    | 'risk_alert'
    | 'po_created'
    | 'qualification_update'
    | 'price_alert';
  title: string;
  description: string;
  timestamp: string;
  priority: RequestPriority;
  isRead: boolean;
  relatedEntityType: 'request' | 'supplier' | 'purchase_order';
  relatedEntityId: string;
}
