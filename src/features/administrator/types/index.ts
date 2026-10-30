import { UserRole } from '../../../types/roles';

export type AccountStatus = 'active' | 'suspended' | 'pending_approval';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  organization: string;
  assignedRole: UserRole;
  status: AccountStatus;
  warehouseAccess?: string[];
  createdAt: string;
  lastLoginAt?: string;
  phoneNumber?: string;
}

export type PermissionCategory =
  | 'Read'
  | 'Create'
  | 'Update'
  | 'Delete / Quarantine'
  | 'Approval'
  | 'Administrative';

export interface PermissionItem {
  id: string;
  label: string;
  description: string;
  category: PermissionCategory;
  roles: UserRole[];
}

export interface OrganizationRecord {
  id: string;
  name: string;
  code: string;
  industry: string;
  country: string;
  city: string;
  activeWarehousesCount: number;
  userCount: number;
  complianceStatus: 'Compliant' | 'Review Required' | 'Non-Compliant';
  createdAt: string;
}

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organizationName: string;
  type: 'Distribution Center' | 'Port Hub' | 'Cold Storage' | 'Regional Depot';
  city: string;
  country: string;
  capacityPallets: number;
  utilizedPallets: number;
  utilizationPercentage: number;
  status: 'Operational' | 'Maintenance' | 'At Capacity';
  supervisor: string;
  updatedAt: string;
}

export type IntegrationStatus =
  | 'Connected'
  | 'Disconnected'
  | 'Not configured'
  | 'Simulated'
  | 'Unknown';

export interface ExternalIntegration {
  id: string;
  name: string;
  systemType: 'FastAPI' | 'PostgreSQL' | 'Machine Learning' | 'Blockchain' | 'Notification';
  purpose: string;
  endpointUrl: string;
  protocol: string;
  status: IntegrationStatus;
  lastCheckTimestamp?: string;
  latencyMs?: number;
  configurationNotes: string;
  isSimulated: boolean;
  version?: string;
}

export interface SystemRiskPolicies {
  criticalRiskThreshold: number; // e.g. 80
  highRiskThreshold: number; // e.g. 60
  mediumRiskThreshold: number; // e.g. 40
  autoEscalateDelayHours: number; // e.g. 2 hours
  mandatoryRootCauseLog: boolean;
  managerApprovalLimit: number; // ₹10,00,000
  procurementApprovalLimit: number; // ₹25,00,000
  dualExecutiveSignoffRequired: boolean;
  minimumSupplierOtdRate: number; // 85%
  minimumSupplierQualityScore: number; // 90%
  lowStockBufferThreshold: number; // 20%
  quarantineSlaHours: number; // 48
  sessionTimeoutMinutes: number; // 60
  mfaRequired: boolean;
  updatedAt: string;
  updatedBy: string;
}

export type AuditCategory =
  | 'All'
  | 'User Actions'
  | 'Role Changes'
  | 'Approvals'
  | 'Inventory Movements'
  | 'Integration Events'
  | 'Policy Changes'
  | 'Administrative';

export interface PlatformAuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  actorRole: UserRole;
  category: AuditCategory;
  action: string;
  resource: string;
  result: 'Success' | 'Warning' | 'Failed';
  details: string;
  ipAddress?: string;
  txHash?: string;
}

export interface SystemHealthMetric {
  serviceId: string;
  name: string;
  category: 'Core API' | 'Database' | 'Intelligence' | 'Ledger' | 'Storage' | 'Mobile';
  status: 'Online' | 'Degraded' | 'Offline' | 'Simulated';
  latencyMs: number;
  uptimePercentage: number;
  lastChecked: string;
  message: string;
}

export interface AdminDashboardKpis {
  totalUsers: number;
  activeUsers: number;
  pendingApprovals: number;
  totalOrganizations: number;
  registeredWarehouses: number;
  activeDisruptions: number;
  systemUptime: string;
  securityIncidents: number;
}

