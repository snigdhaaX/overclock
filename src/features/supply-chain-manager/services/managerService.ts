import operationsService from '../../operations-analyst/services/operationsService';
import {
  MOCK_AUDIT_EVENTS,
  MOCK_HEALTH_METRICS,
  MOCK_ORDER_ROUTES,
  MOCK_SUPPLIERS,
  MOCK_WAREHOUSES,
} from '../data/managerMockData';
import {
  ApprovalDecisionPayload,
  AuditEvent,
  Disruption,
  NetworkHealthMetrics,
  OrderRoute,
  RecoveryPlan,
  SupplierProfile,
  WarehouseProfile,
} from '../types';

class ManagerService {
  private orderRoutes: OrderRoute[] = [...MOCK_ORDER_ROUTES];
  private suppliers: SupplierProfile[] = [...MOCK_SUPPLIERS];
  private warehouses: WarehouseProfile[] = [...MOCK_WAREHOUSES];
  private auditEvents: AuditEvent[] = [...MOCK_AUDIT_EVENTS];
  private healthMetrics: NetworkHealthMetrics = { ...MOCK_HEALTH_METRICS };

  // ==========================================
  // COMMAND CENTRE & HEALTH
  // ==========================================
  getHealthMetrics(): NetworkHealthMetrics {
    const plans = operationsService.getRecoveryPlans();
    const pendingCount = plans.filter((p) => p.status === 'Pending Approval').length;
    const activeCount = plans.filter((p) => p.status === 'In Progress' || p.status === 'Approved').length;

    return {
      ...this.healthMetrics,
      pendingApprovals: Math.max(pendingCount, 2),
      activeRecoveryPlans: activeCount,
    };
  }

  // ==========================================
  // GEOGRAPHICAL NETWORK & ROUTES
  // ==========================================
  getOrderRoutes(params?: {
    search?: string;
    status?: string;
    riskLevel?: string;
  }): OrderRoute[] {
    let result = [...this.orderRoutes];

    if (params?.status && params.status !== 'All') {
      result = result.filter((r) => r.status === params.status);
    }

    if (params?.riskLevel && params.riskLevel !== 'All') {
      result = result.filter((r) => r.riskLevel === params.riskLevel);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.orderId.toLowerCase().includes(q) ||
          r.shipmentId.toLowerCase().includes(q) ||
          r.customer.toLowerCase().includes(q) ||
          r.origin.toLowerCase().includes(q) ||
          r.destination.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getOrderRouteById(orderId: string): OrderRoute | undefined {
    return this.orderRoutes.find((r) => r.orderId === orderId);
  }

  async fetchLiveRouteGeometry(
    coordinatesString: string
  ): Promise<{ coordinates: { latitude: number; longitude: number }[]; distanceKm: number; durationHours: number } | null> {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${coordinatesString}?overview=full&geometries=geojson`
      );
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.routes || data.routes.length === 0) return null;

      const raw = data.routes[0].geometry.coordinates;
      const step = Math.max(1, Math.floor(raw.length / 70));
      const sampled: { latitude: number; longitude: number }[] = [];

      for (let i = 0; i < raw.length; i += step) {
        sampled.push({
          latitude: parseFloat(raw[i][1].toFixed(5)),
          longitude: parseFloat(raw[i][0].toFixed(5)),
        });
      }
      const last = raw[raw.length - 1];
      sampled.push({
        latitude: parseFloat(last[1].toFixed(5)),
        longitude: parseFloat(last[0].toFixed(5)),
      });

      return {
        coordinates: sampled,
        distanceKm: Math.round(data.routes[0].distance / 1000),
        durationHours: parseFloat((data.routes[0].duration / 3600).toFixed(1)),
      };
    } catch {
      return null;
    }
  }

  // ==========================================
  // SHARED DISRUPTIONS & RECOVERY PLANS
  // ==========================================
  getDisruptions(params?: {
    search?: string;
    filterChip?: string;
    severity?: any;
  }): Disruption[] {
    return operationsService.getDisruptions(params);
  }

  getDisruptionById(id: string): Disruption | undefined {
    return operationsService.getDisruptionById(id);
  }

  getRecoveryPlans(filter?: 'all' | 'pending' | 'approved' | 'in_progress' | 'completed'): RecoveryPlan[] {
    const all = operationsService.getRecoveryPlans();
    if (!filter || filter === 'all') return all;
    if (filter === 'pending') return all.filter((p) => p.status === 'Pending Approval' || p.status === 'Draft');
    if (filter === 'approved') return all.filter((p) => p.status === 'Approved');
    if (filter === 'in_progress') return all.filter((p) => p.status === 'In Progress');
    if (filter === 'completed') return all.filter((p) => p.status === 'Completed');
    return all;
  }

  getRecoveryPlanById(id: string): RecoveryPlan | undefined {
    return operationsService.getRecoveryPlanById(id);
  }

  // ==========================================
  // GOVERNANCE: APPROVALS & DECISIONS
  // ==========================================
  approvePlan(payload: ApprovalDecisionPayload): RecoveryPlan {
    const plan = operationsService.getRecoveryPlanById(payload.planId);
    if (!plan) throw new Error('Recovery plan not found');
    if (plan.status === 'Approved') throw new Error('Plan is already approved.');

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    plan.status = 'Approved';
    plan.approvedAt = timestamp;
    plan.approvedBy = payload.actor;
    plan.approvalNotes = payload.comments || 'Formally authorized under Manager Governance Policy.';

    // Log immutable audit event
    const newEvent: AuditEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}`,
      type: 'plan_approved',
      actor: payload.actor,
      role: payload.role,
      timestamp,
      relatedEntityId: plan.id,
      relatedEntityType: 'plan',
      description: `Formally authorized ${plan.planName} (Policy threshold sign-off: $${plan.estimatedCost.toLocaleString()}).`,
      verificationStatus: 'verified',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    };
    this.auditEvents.unshift(newEvent);

    return plan;
  }

  rejectPlan(payload: ApprovalDecisionPayload): RecoveryPlan {
    if (!payload.reason || payload.reason.trim().length === 0) {
      throw new Error('Mandatory rejection reason must be provided.');
    }

    const plan = operationsService.getRecoveryPlanById(payload.planId);
    if (!plan) throw new Error('Recovery plan not found');

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    plan.status = 'Rejected';
    plan.rejectedAt = timestamp;
    plan.rejectedBy = payload.actor;
    plan.rejectionReason = payload.reason;
    plan.approvalNotes = payload.comments || '';

    // Log immutable audit event
    const newEvent: AuditEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}`,
      type: 'plan_rejected',
      actor: payload.actor,
      role: payload.role,
      timestamp,
      relatedEntityId: plan.id,
      relatedEntityType: 'plan',
      description: `Rejected ${plan.planName}. Reason: ${payload.reason}`,
      verificationStatus: 'verified',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    };
    this.auditEvents.unshift(newEvent);

    return plan;
  }

  requestPlanChanges(payload: ApprovalDecisionPayload): RecoveryPlan {
    if (!payload.changeRequirements || payload.changeRequirements.trim().length === 0) {
      throw new Error('Specific modification requirements must be documented.');
    }

    const plan = operationsService.getRecoveryPlanById(payload.planId);
    if (!plan) throw new Error('Recovery plan not found');

    const timestamp = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    plan.status = 'Draft';
    plan.changeRequestNotes = payload.changeRequirements;
    plan.approvalNotes = `Modification requested by ${payload.actor}: ${payload.changeRequirements}`;

    // Log audit event
    const newEvent: AuditEvent = {
      id: `EVT-${Date.now().toString().slice(-4)}`,
      type: 'changes_requested',
      actor: payload.actor,
      role: payload.role,
      timestamp,
      relatedEntityId: plan.id,
      relatedEntityType: 'plan',
      description: `Returned ${plan.planName} to Analyst with revision notes: "${payload.changeRequirements}"`,
      verificationStatus: 'verified',
    };
    this.auditEvents.unshift(newEvent);

    return plan;
  }

  // ==========================================
  // SUPPLIERS
  // ==========================================
  getSuppliers(params?: { search?: string; status?: string }): SupplierProfile[] {
    let result = [...this.suppliers];

    if (params?.status && params.status !== 'All') {
      result = result.filter((s) => s.status === params.status);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.id.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getSupplierById(id: string): SupplierProfile | undefined {
    return this.suppliers.find((s) => s.id === id);
  }

  // ==========================================
  // WAREHOUSES
  // ==========================================
  getWarehouses(params?: { search?: string; filter?: string }): WarehouseProfile[] {
    let result = [...this.warehouses];

    if (params?.filter && params.filter !== 'All') {
      result = result.filter((w) => w.inventoryHealth === params.filter);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (w) =>
          w.id.toLowerCase().includes(q) ||
          w.name.toLowerCase().includes(q) ||
          w.location.toLowerCase().includes(q) ||
          w.managerInCharge.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getWarehouseById(id: string): WarehouseProfile | undefined {
    return this.warehouses.find((w) => w.id === id);
  }

  // ==========================================
  // AUDIT & LOGS
  // ==========================================
  getAuditEvents(params?: { search?: string; filter?: string }): AuditEvent[] {
    let result = [...this.auditEvents];

    if (params?.filter && params.filter !== 'All') {
      result = result.filter((e) => e.type === params.filter);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.relatedEntityId.toLowerCase().includes(q)
      );
    }

    return result;
  }

  addAuditEvent(event: AuditEvent): void {
    this.auditEvents.unshift(event);
  }
}

export const managerService = new ManagerService();
export default managerService;
