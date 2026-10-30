import {
  MOCK_AFFECTED_ORDERS,
  MOCK_DISRUPTIONS,
  MOCK_EXECUTION_DATA,
  MOCK_IMPACT_SUMMARIES,
  MOCK_NOTIFICATIONS,
  MOCK_RECOVERY_PLANS,
  MOCK_RISK_INTELLIGENCE,
} from '../data/mockData';
import {
  AffectedOrder,
  Disruption,
  ExecutionTrackingData,
  ImpactSummary,
  NotificationItem,
  RecoveryAction,
  RecoveryPlan,
  RiskIntelligenceData,
  SeverityLevel,
} from '../types';

class OperationsService {
  private connected = false;

  /** Replaces sample data with live data from the backend. */
  hydrate(data: any) {
    this.connected = true;
    this.disruptions = data.disruptions;
    this.orders = data.orders;
    this.recoveryPlans = data.recoveryPlans;
    this.notifications = data.notifications;
    if (data.execution) this.executionData = data.execution;
  }

  private disruptions: Disruption[] = [...MOCK_DISRUPTIONS];
  private orders: AffectedOrder[] = [...MOCK_AFFECTED_ORDERS];
  private recoveryPlans: RecoveryPlan[] = [...MOCK_RECOVERY_PLANS];
  private notifications: NotificationItem[] = [...MOCK_NOTIFICATIONS];
  private executionData: ExecutionTrackingData = { ...MOCK_EXECUTION_DATA };

  // DISRUPTIONS
  getDisruptions(params?: {
    search?: string;
    filterChip?: string;
    severity?: SeverityLevel;
  }): Disruption[] {
    let result = [...this.disruptions];

    if (params?.filterChip && params.filterChip !== 'All') {
      const chip = params.filterChip.toLowerCase();
      result = result.filter((d) => {
        if (chip === 'shipment') return d.type === 'shipment_delay' || d.type === 'port_congestion';
        if (chip === 'supplier') return d.type === 'supplier_risk';
        if (chip === 'inventory') return d.type === 'inventory_shortage';
        return true;
      });
    }

    if (params?.severity) {
      result = result.filter((d) => d.severity === params.severity);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (d) =>
          d.id.toLowerCase().includes(q) ||
          d.title.toLowerCase().includes(q) ||
          d.reference.toLowerCase().includes(q) ||
          d.location.toLowerCase().includes(q) ||
          d.supplier.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getDisruptionById(id: string): Disruption | undefined {
    return this.disruptions.find((d) => d.id === id);
  }

  getImpactSummary(disruptionId: string): ImpactSummary {
    if (this.connected) {
      const d = this.getDisruptionById(disruptionId) ?? this.disruptions[0];
      const lines = this.orders.filter((o) => o.associatedDisruptionId === d?.id);
      return {
        disruptionId,
        affectedOrders: lines.length,
        totalUnitsAtRisk: lines.reduce((sum, o) => sum + o.units, 0),
        estimatedDelay: d?.estimatedDelay ?? '',
        revenueAtRisk: lines.reduce((sum, o) => sum + o.revenue, 0),
        supplierImpact: { supplier: d?.supplier ?? '', delay: d?.estimatedDelay ?? '', details: d?.reason ?? '', severity: d?.severity ?? 'Low' },
        inboundImpact: { shipment: d?.reference ?? '', carrier: d?.carrier ?? '', units: lines.reduce((sum, o) => sum + o.units, 0), severity: d?.severity ?? 'Low' },
        warehouseImpact: { warehouse: d?.location ?? '', bufferRemaining: 'See inventory for live stock', severity: d?.severity ?? 'Low' },
      };
    }
    if (MOCK_IMPACT_SUMMARIES[disruptionId]) {
      return MOCK_IMPACT_SUMMARIES[disruptionId];
    }
    // Fallback dynamic impact summary
    const disruption = this.getDisruptionById(disruptionId);
    return {
      disruptionId,
      affectedOrders: disruption?.affectedOrdersCount || 4,
      totalUnitsAtRisk: 650,
      estimatedDelay: disruption?.estimatedDelay || '4 Days',
      revenueAtRisk: 142000,
      supplierImpact: {
        supplier: disruption?.supplier || 'Supplier Network Node',
        delay: disruption?.estimatedDelay ? `+${disruption.estimatedDelay} delay` : '+4 days delay',
        details: disruption?.reason || 'Production or transit bottleneck reported.',
        severity: disruption?.severity || 'Medium',
      },
      inboundImpact: {
        shipment: disruption?.reference || 'Cargo Transit Stream',
        carrier: disruption?.carrier || 'Express Logistics',
        units: 650,
        severity: disruption?.severity || 'Medium',
      },
      warehouseImpact: {
        warehouse: 'Regional Logistics Center',
        bufferRemaining: 'Buffer level below target threshold (18%)',
        severity: disruption?.severity || 'High',
      },
    };
  }

  // ORDERS
  getOrders(params?: {
    search?: string;
    severity?: string;
    disruptionId?: string;
  }): AffectedOrder[] {
    let result = [...this.orders];

    if (params?.disruptionId) {
      result = result.filter((o) => o.associatedDisruptionId === params.disruptionId);
    }

    if (params?.severity && params.severity !== 'All') {
      result = result.filter((o) => o.severity === params.severity);
    }

    if (params?.search && params.search.trim().length > 0) {
      const q = params.search.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer.toLowerCase().includes(q) ||
          o.product.toLowerCase().includes(q) ||
          o.sku.toLowerCase().includes(q)
      );
    }

    return result;
  }

  getOrderById(id: string): AffectedOrder | undefined {
    return this.orders.find((o) => o.id === id);
  }

  // RECOVERY PLANS
  getRecoveryPlans(filter?: 'all' | 'ai' | 'alternative' | 'custom'): RecoveryPlan[] {
    if (!filter || filter === 'all') return [...this.recoveryPlans];
    if (filter === 'ai') {
      return this.recoveryPlans.filter((p) => p.recommendationLabel.toLowerCase().includes('optimal') || p.recommendationLabel.toLowerCase().includes('ai'));
    }
    if (filter === 'alternative') {
      return this.recoveryPlans.filter((p) => p.recommendationLabel.toLowerCase().includes('alternative'));
    }
    return this.recoveryPlans.filter((p) => !p.recommendationLabel.toLowerCase().includes('optimal'));
  }

  getRecoveryPlanById(id: string): RecoveryPlan | undefined {
    return this.recoveryPlans.find((p) => p.id === id);
  }

  saveDraftPlan(plan: Partial<RecoveryPlan>): RecoveryPlan {
    const existingIndex = this.recoveryPlans.findIndex((p) => p.id === plan.id);
    if (existingIndex >= 0) {
      this.recoveryPlans[existingIndex] = {
        ...this.recoveryPlans[existingIndex],
        ...plan,
        status: 'Draft',
      };
      return this.recoveryPlans[existingIndex];
    } else {
      const newPlan: RecoveryPlan = {
        id: `RP-${String(this.recoveryPlans.length + 1).padStart(3, '0')}`,
        planName: plan.planName || 'Custom Recovery Plan',
        recommendationLabel: 'Custom Plan',
        strategy: plan.strategy || 'User defined recovery plan strategy.',
        relatedDisruptionId: plan.relatedDisruptionId || 'SHP-101',
        estimatedCost: plan.estimatedCost || 12000,
        deliveryImpact: plan.deliveryImpact || '-2 days',
        feasibilityScore: plan.feasibilityScore || 85,
        risk: plan.risk || 'Low',
        benefits: plan.benefits || ['Protects high-value customer orders'],
        constraints: plan.constraints || ['Standard regional logistics lead time'],
        status: 'Draft',
        priority: plan.priority || 'Medium',
        targetCompletionDate: plan.targetCompletionDate || '27 Oct 2026',
        description: plan.description || '',
        actions: plan.actions || [],
      };
      this.recoveryPlans.unshift(newPlan);
      return newPlan;
    }
  }

  addActionToPlan(planId: string, action: Omit<RecoveryAction, 'id'>): RecoveryPlan {
    const plan = this.getRecoveryPlanById(planId);
    if (!plan) throw new Error('Recovery plan not found');
    const newAction: RecoveryAction = {
      ...action,
      id: `act-${Date.now()}`,
    };
    plan.actions.push(newAction);
    return plan;
  }

  removeActionFromPlan(planId: string, actionId: string): RecoveryPlan {
    const plan = this.getRecoveryPlanById(planId);
    if (!plan) throw new Error('Recovery plan not found');
    plan.actions = plan.actions.filter((a) => a.id !== actionId);
    return plan;
  }

  // GOVERNANCE: Submit plan for approval (never auto-approve)
  submitPlanForApproval(planId: string): RecoveryPlan {
    const plan = this.getRecoveryPlanById(planId);
    if (!plan) throw new Error('Plan not found');
    plan.status = 'Pending Approval';
    plan.submittedAt = new Date().toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    plan.submittedBy = 'Anishwath (Operations Analyst)';
    plan.assignedApprover = 'David Vance (Supply Chain Manager)';
    plan.approvalNotes = 'Awaiting formal authorization from Supply Chain Manager before execution activation.';
    
    // Add notification about submission
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      title: `Plan Submitted: ${plan.planName}`,
      description: `Dispatched to David Vance (Supply Chain Manager) for formal approval.`,
      timestamp: 'Just now',
      severity: 'Medium',
      isRead: false,
      type: 'approval',
      relatedEntityId: plan.id,
      relatedEntityType: 'plan',
    });

    return plan;
  }

  // RISK INTELLIGENCE
  getRiskIntelligence(): RiskIntelligenceData {
    return { ...MOCK_RISK_INTELLIGENCE };
  }

  // EXECUTION TRACKING
  getExecutionTracking(): ExecutionTrackingData {
    return { ...this.executionData };
  }

  // NOTIFICATIONS
  getNotifications(filter?: 'all' | 'unread' | 'critical'): NotificationItem[] {
    if (filter === 'unread') {
      return this.notifications.filter((n) => !n.isRead);
    }
    if (filter === 'critical') {
      return this.notifications.filter((n) => n.severity === 'Critical');
    }
    return [...this.notifications];
  }

  getUnreadNotificationsCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  markNotificationAsRead(id: string): void {
    const n = this.notifications.find((item) => item.id === id);
    if (n) n.isRead = true;
  }

  markAllNotificationsAsRead(): void {
    this.notifications.forEach((n) => (n.isRead = true));
  }
}

export const operationsService = new OperationsService();
export default operationsService;
