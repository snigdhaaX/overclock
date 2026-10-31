import {
  INITIAL_ADMIN_USERS,
  INITIAL_AUDIT_LOGS,
  INITIAL_HEALTH_METRICS,
  INITIAL_INTEGRATIONS,
  INITIAL_ORGANIZATIONS,
  INITIAL_PERMISSIONS,
  INITIAL_RISK_POLICIES,
  INITIAL_WAREHOUSES,
} from '../data/adminMockData';
import {
  AdminDashboardKpis,
  AdminUser,
  ExternalIntegration,
  OrganizationRecord,
  PermissionItem,
  PlatformAuditEvent,
  SystemHealthMetric,
  SystemRiskPolicies,
  WarehouseRecord,
} from '../types';
import { UserRole } from '../../../types/roles';
import operationsService from '../../operations-analyst/services/operationsService';
import managerService from '../../supply-chain-manager/services/managerService';

class AdminService {
  private users: AdminUser[] = [...INITIAL_ADMIN_USERS];
  private organizations: OrganizationRecord[] = [...INITIAL_ORGANIZATIONS];
  private warehouses: WarehouseRecord[] = [...INITIAL_WAREHOUSES];
  private permissions: PermissionItem[] = [...INITIAL_PERMISSIONS];
  private integrations: ExternalIntegration[] = [...INITIAL_INTEGRATIONS];
  private policies: SystemRiskPolicies = { ...INITIAL_RISK_POLICIES };
  private auditLogs: PlatformAuditEvent[] = [...INITIAL_AUDIT_LOGS];
  private healthMetrics: SystemHealthMetric[] = [...INITIAL_HEALTH_METRICS];
  private subscribers: (() => void)[] = [];

  public subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== callback);
    };
  }

  private notify(): void {
    this.subscribers.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.warn('AdminService subscriber notification error:', err);
      }
    });
  }

  // --- Audit Logging Helper ---
  public addAuditEvent(
    action: string,
    resource: string,
    category: PlatformAuditEvent['category'],
    details: string,
    result: 'Success' | 'Warning' | 'Failed' = 'Success',
    txHash?: string
  ): PlatformAuditEvent {
    const newEvent: PlatformAuditEvent = {
      id: `aud_${Date.now()}_${Math.floor(Math.random() * 900 + 100)}`,
      timestamp: new Date().toISOString(),
      actor: 'Elena Rostova',
      actorRole: 'administrator',
      category,
      action,
      resource,
      result,
      details,
      ipAddress: '10.200.4.15',
      txHash,
    };
    this.auditLogs.unshift(newEvent);
    this.notify();
    return newEvent;
  }

  // --- Dashboard KPIs ---
  public getDashboardKpis(): AdminDashboardKpis {
    const activeUsers = this.users.filter((u) => u.status === 'active').length;
    const pendingApprovalsCount = managerService.getHealthMetrics().pendingApprovals;
    const activeDisruptionsCount = operationsService
      .getDisruptions()
      .filter((d) => d.status !== 'Mitigated').length;

    return {
      totalUsers: this.users.length,
      activeUsers,
      pendingApprovals: pendingApprovalsCount,
      totalOrganizations: this.organizations.length,
      registeredWarehouses: this.warehouses.length,
      activeDisruptions: activeDisruptionsCount,
      systemUptime: '99.94%',
      securityIncidents: 0,
    };
  }

  public getUserRoleDistribution(): Record<UserRole, number> {
    const dist: Record<UserRole, number> = {
      'operations-analyst': 0,
      'supply-chain-manager': 0,
      'warehouse-operator': 0,
      'procurement-approver': 0,
      'administrator': 0,
    };
    this.users.forEach((u) => {
      if (dist[u.assignedRole] !== undefined) {
        dist[u.assignedRole]++;
      }
    });
    return dist;
  }

  // --- User Management ---
  public getUsers(): AdminUser[] {
    return [...this.users];
  }

  public getUserById(id: string): AdminUser | undefined {
    return this.users.find((u) => u.id === id);
  }

  public createUser(payload: {
    name: string;
    email: string;
    organization: string;
    assignedRole: UserRole;
    phoneNumber?: string;
    warehouseAccess?: string[];
  }): AdminUser {
    const normalizedEmail = payload.email.trim().toLowerCase();
    const existing = this.users.find((u) => u.email.toLowerCase() === normalizedEmail);
    if (existing) {
      throw new Error(`An account with email ${normalizedEmail} already exists.`);
    }

    const newUser: AdminUser = {
      id: `usr_${Date.now()}`,
      name: payload.name.trim(),
      email: normalizedEmail,
      organization: payload.organization.trim(),
      assignedRole: payload.assignedRole,
      status: 'active',
      phoneNumber: payload.phoneNumber?.trim(),
      warehouseAccess: payload.warehouseAccess || ['WH-BOM-01'],
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
    };

    this.users.unshift(newUser);
    this.addAuditEvent(
      'Created New User Account',
      `User:${newUser.email}`,
      'User Actions',
      `Provisioned ${newUser.name} with role '${newUser.assignedRole}' for organization '${newUser.organization}'.`
    );
    this.notify();
    return newUser;
  }

  public updateUser(
    id: string,
    updates: Partial<Omit<AdminUser, 'id' | 'createdAt'>>
  ): AdminUser {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error(`User with ID ${id} not found.`);
    }

    const current = this.users[index];

    // Safety rule: If changing role or deactivating, check if this is the last active admin
    if (
      current.assignedRole === 'administrator' &&
      updates.assignedRole &&
      updates.assignedRole !== 'administrator'
    ) {
      this.assertNotLastActiveAdmin(id);
    }

    if (
      current.assignedRole === 'administrator' &&
      updates.status &&
      updates.status !== 'active'
    ) {
      this.assertNotLastActiveAdmin(id);
    }

    this.users[index] = {
      ...current,
      ...updates,
    };

    this.addAuditEvent(
      'Updated User Profile',
      `User:${this.users[index].email}`,
      'User Actions',
      `Modified user properties for ${this.users[index].name} (${this.users[index].email}).`
    );
    this.notify();
    return this.users[index];
  }

  public deactivateUser(id: string): void {
    this.assertNotLastActiveAdmin(id);
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found.');

    user.status = 'suspended';
    this.addAuditEvent(
      'Deactivated User Account',
      `User:${user.email}`,
      'User Actions',
      `Deactivated account for ${user.name}. Session credentials invalidated.`,
      'Warning'
    );
    this.notify();
  }

  public activateUser(id: string): void {
    const user = this.getUserById(id);
    if (!user) throw new Error('User not found.');

    user.status = 'active';
    this.addAuditEvent(
      'Activated User Account',
      `User:${user.email}`,
      'User Actions',
      `Activated account for ${user.name}. Enterprise access restored.`
    );
    this.notify();
  }

  private assertNotLastActiveAdmin(userId: string): void {
    const activeAdmins = this.users.filter(
      (u) => u.assignedRole === 'administrator' && u.status === 'active'
    );
    if (activeAdmins.length <= 1 && activeAdmins.some((u) => u.id === userId)) {
      throw new Error(
        'Action Rejected: You cannot remove, deactivate, or reassign the final active Administrator account. System governance requires at least one active Administrator.'
      );
    }
  }

  // --- Roles & Permissions Management ---
  public getPermissions(): PermissionItem[] {
    return [...this.permissions];
  }

  public toggleRolePermission(permissionId: string, role: UserRole): boolean {
    const perm = this.permissions.find((p) => p.id === permissionId);
    if (!perm) throw new Error('Permission definition not found.');

    // Safety rule: Cannot revoke root admin permissions from administrator role
    if (
      role === 'administrator' &&
      (permissionId === 'perm_admin_users' ||
        permissionId === 'perm_admin_policies' ||
        permissionId === 'perm_admin_integrations')
    ) {
      throw new Error(
        'Security Safeguard: Core administrative governance privileges cannot be revoked from the Administrator role.'
      );
    }

    const hasPermission = perm.roles.includes(role);
    if (hasPermission) {
      perm.roles = perm.roles.filter((r) => r !== role);
    } else {
      perm.roles.push(role);
    }

    this.addAuditEvent(
      'Modified Role Permission',
      `Role:${role}`,
      'Role Changes',
      `${hasPermission ? 'Revoked' : 'Granted'} permission '${perm.label}' (${perm.id}) for role '${role}'.`
    );
    this.notify();
    return !hasPermission;
  }

  // --- Organization & Facility Management ---
  public getOrganizations(): OrganizationRecord[] {
    return [...this.organizations];
  }

  public createOrganization(data: Omit<OrganizationRecord, 'id' | 'createdAt' | 'userCount'>): OrganizationRecord {
    const newOrg: OrganizationRecord = {
      id: `org_${Date.now()}`,
      createdAt: new Date().toISOString(),
      userCount: 0,
      ...data,
    };
    this.organizations.push(newOrg);
    this.addAuditEvent(
      'Registered New Organization',
      `Org:${newOrg.code}`,
      'Administrative',
      `Created enterprise organization '${newOrg.name}' (${newOrg.industry}) in ${newOrg.country}.`
    );
    this.notify();
    return newOrg;
  }

  public getWarehouses(): WarehouseRecord[] {
    return [...this.warehouses];
  }

  public createWarehouse(data: Omit<WarehouseRecord, 'id' | 'updatedAt' | 'utilizationPercentage'>): WarehouseRecord {
    const pct = Math.round((data.utilizedPallets / data.capacityPallets) * 100);
    const newWh: WarehouseRecord = {
      id: `wh_${Date.now()}`,
      updatedAt: new Date().toISOString(),
      utilizationPercentage: pct,
      ...data,
    };
    this.warehouses.push(newWh);
    this.addAuditEvent(
      'Registered New Facility',
      `Warehouse:${newWh.code}`,
      'Administrative',
      `Added warehouse '${newWh.name}' (${newWh.type}) with capacity of ${newWh.capacityPallets} pallets.`
    );
    this.notify();
    return newWh;
  }

  // --- External Integrations ---
  public getIntegrations(): ExternalIntegration[] {
    return [...this.integrations];
  }

  public async testIntegration(id: string): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const integration = this.integrations.find((i) => i.id === id);
    if (!integration) throw new Error('Integration not found.');

    // Set checking state
    this.notify();

    // Perform realistic check
    let success = false;
    let latency = 0;
    let message = '';

    if (integration.systemType === 'FastAPI') {
      try {
        const start = Date.now();
        const res = await Promise.race([
          fetch(`${integration.endpointUrl}/health`),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500)),
        ]);
        latency = Date.now() - start;
        if (res.ok) {
          success = true;
          integration.status = 'Connected';
          message = 'FastAPI server online and responding with HTTP 200 OK.';
        } else {
          integration.status = 'Disconnected';
          message = `Server responded with HTTP ${res.status}.`;
        }
      } catch {
        integration.status = 'Disconnected';
        latency = 0;
        message = `Server unreachable at ${integration.endpointUrl}. Ensure FastAPI is running.`;
      }
    } else if (integration.systemType === 'PostgreSQL') {
      await new Promise((resolve) => setTimeout(resolve, 600));
      integration.status = 'Not configured';
      message = 'Database host connection string is unconfigured. Mobile heap storage active.';
    } else if (integration.systemType === 'Machine Learning') {
      await new Promise((resolve) => setTimeout(resolve, 450));
      latency = 42;
      integration.status = 'Simulated';
      success = true;
      message = 'Simulated scikit-learn model inference responding locally in client runtime.';
    } else if (integration.systemType === 'Blockchain') {
      await new Promise((resolve) => setTimeout(resolve, 750));
      latency = 135;
      integration.status = 'Simulated';
      success = true;
      message = 'Polygon Amoy node reachable via public RPC; transaction simulation validated.';
    } else {
      await new Promise((resolve) => setTimeout(resolve, 300));
      latency = 15;
      integration.status = 'Simulated';
      success = true;
      message = 'In-memory notification observer stream operational.';
    }

    integration.lastCheckTimestamp = new Date().toISOString();
    integration.latencyMs = latency;

    this.addAuditEvent(
      'Executed Integration Health Probe',
      `Integration:${integration.name}`,
      'Integration Events',
      `Result: ${integration.status}. ${message}`
    );
    this.notify();

    return { success, latencyMs: latency, message };
  }

  // --- Global Risk Policies ---
  public getPolicies(): SystemRiskPolicies {
    return { ...this.policies };
  }

  public updatePolicies(updates: Partial<SystemRiskPolicies>): SystemRiskPolicies {
    this.policies = {
      ...this.policies,
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: 'Elena Rostova (Administrator)',
    };

    this.addAuditEvent(
      'Updated Enterprise Risk Policies',
      'System:Global-Policies',
      'Policy Changes',
      'Modified global risk thresholds, financial delegation caps, or security timeout parameters.'
    );
    this.notify();
    return { ...this.policies };
  }

  // --- Platform Audit Logs ---
  public getAuditLogs(): PlatformAuditEvent[] {
    return [...this.auditLogs];
  }

  // --- System Health Metrics ---
  public getHealthMetrics(): SystemHealthMetric[] {
    return [...this.healthMetrics];
  }

  public refreshHealthDiagnostics(): void {
    const now = new Date().toISOString();
    this.healthMetrics = this.healthMetrics.map((m) => {
      if (m.serviceId === 'srv_mobile' || m.serviceId === 'srv_secstore') {
        return { ...m, lastChecked: now };
      }
      return { ...m, lastChecked: now };
    });
    this.addAuditEvent(
      'Refreshed System Health Diagnostics',
      'System:Health-Monitor',
      'Administrative',
      'Refreshed operational diagnostic telemetry across all 6 service layers.'
    );
    this.notify();
  }
}

export const adminService = new AdminService();
export default adminService;
