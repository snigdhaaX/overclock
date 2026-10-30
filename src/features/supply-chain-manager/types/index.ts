import {
  AffectedOrder,
  Disruption,
  ImpactSummary,
  NotificationItem,
  PlanStatus,
  RecoveryAction,
  RecoveryPlan,
  SeverityLevel,
} from '../../operations-analyst/types';

export {
  AffectedOrder,
  Disruption,
  ImpactSummary,
  NotificationItem,
  PlanStatus,
  RecoveryAction,
  RecoveryPlan,
  SeverityLevel,
};

export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

export type NodeType = 'supplier' | 'warehouse' | 'distribution' | 'customer' | 'shipment';

export type RouteStatus = 'On Schedule' | 'At Risk' | 'Delayed' | 'In Transit' | 'Completed';

export interface RouteStop {
  id: string;
  name: string;
  type: NodeType;
  location: string;
  coordinate: GeoCoordinate;
  plannedArrival: string;
  actualArrival?: string;
  status: 'completed' | 'current' | 'pending';
  notes?: string;
}

export interface OrderRoute {
  orderId: string;
  shipmentId: string;
  customer: string;
  product: string;
  quantity: number;
  origin: string;
  originCoordinate: GeoCoordinate;
  destination: string;
  destinationCoordinate: GeoCoordinate;
  stops: RouteStop[];
  coordinates: GeoCoordinate[];
  distanceKm: number;
  estimatedDuration: string;
  status: RouteStatus;
  riskLevel: SeverityLevel;
  expectedDelivery: string;
  delay?: string;
  associatedDisruptionId?: string;
  carrier: string;
  routeColor: string;
}

export interface SupplierProfile {
  id: string;
  name: string;
  category: string;
  location: string;
  coordinate: GeoCoordinate;
  status: 'Active' | 'At Risk' | 'Critical' | 'Under Review';
  riskScore: number;
  activeDisruptions: number;
  deliveryPerformance: number; // percentage
  qualityScore: number; // percentage
  contactRole: string;
  productsSupplied: string[];
  activeShipments: string[];
  tier: 1 | 2;
  spendYTD: string;
}

export interface WarehouseProfile {
  id: string;
  name: string;
  location: string;
  coordinate: GeoCoordinate;
  capacityUtilisation: number; // percentage
  inventoryHealth: 'Healthy' | 'At Risk' | 'Capacity Warning' | 'Inventory Shortage';
  incomingShipmentsCount: number;
  outgoingOrdersCount: number;
  currentRisk: 'Low' | 'Medium' | 'High';
  activeWarnings: string[];
  totalStorageSqFt: string;
  managerInCharge: string;
  safetyStockLevel: number; // percentage
}

export interface AuditEvent {
  id: string;
  type:
    | 'disruption_detected'
    | 'investigation_started'
    | 'plan_created'
    | 'plan_submitted'
    | 'plan_approved'
    | 'plan_rejected'
    | 'changes_requested'
    | 'action_started'
    | 'milestone_completed';
  actor: string;
  role: string;
  timestamp: string;
  relatedEntityId: string;
  relatedEntityType: 'disruption' | 'plan' | 'order' | 'shipment' | 'supplier';
  description: string;
  verificationStatus: 'verified' | 'pending' | 'unverified';
  txHash?: string;
}

export interface NetworkHealthMetrics {
  healthScore: number; // e.g. 94.2
  activeDisruptions: number;
  criticalShipments: number;
  ordersAtRisk: number;
  pendingApprovals: number;
  activeRecoveryPlans: number;
  completedRecoveryPlans: number;
  delayedActions: number;
  recoverySuccessRate: number; // percentage e.g. 91.8
  lastUpdated: string;
}

export interface ApprovalDecisionPayload {
  planId: string;
  decision: 'approved' | 'rejected' | 'changes_requested';
  actor: string;
  role: string;
  reason?: string;
  comments?: string;
  changeRequirements?: string;
}
