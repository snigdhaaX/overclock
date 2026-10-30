import {
  AlternativeComparison,
  ApprovalAuditEvent,
  POStatus,
  ProcurementKpis,
  ProcurementNotification,
  ProcurementRequest,
  PurchaseOrder,
  RequestPriority,
  RequestStatus,
  SupplierProfile,
  SupplierQualification,
  SupplierRiskDimension,
} from '../types';
import {
  DEMO_COMPARISON_DATA,
  INITIAL_APPROVAL_AUDIT_EVENTS,
  INITIAL_PROCUREMENT_KPIS,
  INITIAL_PROCUREMENT_NOTIFICATIONS,
  INITIAL_PROCUREMENT_REQUESTS,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_RISK_DIMENSIONS,
  INITIAL_SUPPLIERS_PROFILES,
} from '../data/procurementMockData';
import { managerService } from '../../supply-chain-manager/services/managerService';

type Listener = () => void;

class ProcurementService {
  private kpis: ProcurementKpis = { ...INITIAL_PROCUREMENT_KPIS };
  private requests: ProcurementRequest[] = [...INITIAL_PROCUREMENT_REQUESTS];
  private suppliers: SupplierProfile[] = [...INITIAL_SUPPLIERS_PROFILES];
  private purchaseOrders: PurchaseOrder[] = [...INITIAL_PURCHASE_ORDERS];
  private riskDimensions: SupplierRiskDimension[] = [...INITIAL_RISK_DIMENSIONS];
  private auditEvents: ApprovalAuditEvent[] = [...INITIAL_APPROVAL_AUDIT_EVENTS];
  private notifications: ProcurementNotification[] = [...INITIAL_PROCUREMENT_NOTIFICATIONS];
  private comparison: AlternativeComparison = { ...DEMO_COMPARISON_DATA };

  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.recomputeKpis();
    this.listeners.forEach((fn) => fn());
  }

  private recomputeKpis(): void {
    const pending = this.requests.filter((r) => r.status === 'pending').length;
    const approvedToday = this.requests.filter((r) => r.status === 'approved').length;
    const activeSuppliers = this.suppliers.filter((s) => s.qualificationStatus === 'approved').length;
    const highRiskSuppliers = this.suppliers.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Critical').length;

    let totalUnderReview = 0;
    this.requests
      .filter((r) => r.status === 'pending')
      .forEach((r) => {
        totalUnderReview += r.estimatedCost;
      });

    this.kpis = {
      ...this.kpis,
      pendingRequestsCount: pending,
      approvedTodayCount: approvedToday,
      activeSuppliersCount: activeSuppliers,
      highRiskSuppliersCount: highRiskSuppliers,
      totalUnderReviewAmount: `₹${totalUnderReview.toLocaleString('en-IN')}`,
    };
  }

  // --- KPIs ---
  getKpis(): ProcurementKpis {
    return { ...this.kpis };
  }

  // --- Requests ---
  getRequests(status?: RequestStatus | 'all', priority?: RequestPriority | 'all', search?: string): ProcurementRequest[] {
    let list = [...this.requests];

    if (status && status !== 'all') {
      list = list.filter((r) => r.status === status);
    }
    if (priority && priority !== 'all') {
      list = list.filter((r) => r.priority === priority);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.productSku.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.supplierName.toLowerCase().includes(q) ||
          r.submittedBy.toLowerCase().includes(q) ||
          r.typeLabel.toLowerCase().includes(q)
      );
    }

    return list;
  }

  getRequestById(id: string): ProcurementRequest | undefined {
    return this.requests.find((r) => r.id.toLowerCase() === id.toLowerCase());
  }

  // --- Approval Governance Workflows ---
  approveRequest(
    requestId: string,
    actor: string = 'Priya Sharma (Procurement Approver)',
    comments?: string
  ): { success: boolean; error?: string; request?: ProcurementRequest; po?: PurchaseOrder } {
    const req = this.requests.find((r) => r.id.toLowerCase() === requestId.toLowerCase());
    if (!req) {
      return { success: false, error: 'Procurement request not found.' };
    }

    // Duplicate action check
    if (req.status === 'approved') {
      return { success: false, error: 'Request is already approved. Duplicate approvals are prevented.' };
    }
    if (req.status === 'rejected') {
      return { success: false, error: 'Request has already been rejected and cannot be directly approved.' };
    }

    // Delegation authority threshold check
    if (req.estimatedCost > req.approvalThreshold) {
      return {
        success: false,
        error: `Total estimated cost (₹${req.estimatedCost.toLocaleString('en-IN')}) exceeds individual delegation authority threshold of ₹${req.approvalThreshold.toLocaleString('en-IN')}. Executive co-signature required.`,
      };
    }

    const timestamp = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;
    const poId = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    req.status = 'approved';
    req.decisionTimestamp = timestamp;
    req.decisionActor = actor;
    req.decisionReason = comments || 'Approved within authorized delegation limits and supplier SLA standards.';
    req.poId = poId;
    req.txHash = txHash;

    // Automatically generate binding Purchase Order
    const newPO: PurchaseOrder = {
      id: poId,
      requestId: req.id,
      supplierId: req.supplierId,
      supplierName: req.supplierName,
      productSku: req.productSku,
      productName: req.productName,
      quantity: req.requestedQuantity,
      unitPrice: req.unitPrice,
      totalAmount: req.estimatedCost,
      currency: req.currency,
      createdAt: timestamp,
      expectedDeliveryDate: req.requiredDate,
      status: 'open',
      paymentTerms: 'Net 30 Days',
      shippingTerms: 'FOB Port of Nhava Sheva (JNPT)',
      destinationWarehouse: 'Mumbai Central Hub (WH-MUM)',
      approvedBy: actor,
      blockchainTxHash: txHash,
      items: [
        {
          sku: req.productSku,
          description: req.productName,
          quantity: req.requestedQuantity,
          unitPrice: req.unitPrice,
          total: req.estimatedCost,
        },
      ],
      auditHistory: [
        {
          event: 'Purchase Order Created & Blockchain Anchored',
          actor,
          timestamp,
          note: `Authorized from approved request ${req.id}.`,
        },
        {
          event: 'EDI Dispatch Initialized',
          actor: 'Automated Procurement Gateway',
          timestamp,
        },
      ],
    };

    this.purchaseOrders.unshift(newPO);

    // Record Audit Events
    const approvalEvent: ApprovalAuditEvent = {
      id: `EVT-P${Date.now().toString().slice(-4)}`,
      requestId: req.id,
      actor,
      role: 'Procurement Approver',
      timestamp,
      action: 'approved',
      actionLabel: 'Request Approved',
      status: 'approved',
      comments: req.decisionReason,
      txHash,
    };
    this.auditEvents.unshift(approvalEvent);

    const poEvent: ApprovalAuditEvent = {
      id: `EVT-P${Date.now().toString().slice(-3)}9`,
      requestId: req.id,
      actor,
      role: 'Procurement Approver',
      timestamp,
      action: 'po_created',
      actionLabel: 'Purchase Order Issued',
      status: 'approved',
      comments: `Issued Purchase Order ${poId} for ${req.requestedQuantity} units of ${req.productSku}.`,
      txHash,
    };
    this.auditEvents.unshift(poEvent);

    // Emit to shared Cross-Role Event Trail
    managerService.addAuditEvent({
      id: `EVT-${Date.now().toString().slice(-4)}`,
      type: 'plan_approved',
      actor,
      role: 'Procurement Approver',
      timestamp,
      relatedEntityId: req.id,
      relatedEntityType: 'plan',
      description: `Procurement Approved: ${req.requestedQuantity} units of ${req.productSku} (₹${req.estimatedCost.toLocaleString('en-IN')}) with ${req.supplierName}. PO: ${poId}.`,
      verificationStatus: 'verified',
      txHash,
    });

    // Add Notification
    this.notifications.unshift({
      id: `notif-pr-${Date.now()}`,
      type: 'po_created',
      title: `PO Created: ${poId}`,
      description: `Purchase Order issued to ${req.supplierName} for ${req.requestedQuantity} units of ${req.productSku}.`,
      timestamp: 'Just now',
      priority: req.priority,
      isRead: false,
      relatedEntityType: 'purchase_order',
      relatedEntityId: poId,
    });

    this.notify();
    return { success: true, request: req, po: newPO };
  }

  rejectRequest(
    requestId: string,
    actor: string = 'Priya Sharma (Procurement Approver)',
    reason: string
  ): { success: boolean; error?: string; request?: ProcurementRequest } {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'A mandatory rejection reason is required.' };
    }

    const req = this.requests.find((r) => r.id.toLowerCase() === requestId.toLowerCase());
    if (!req) {
      return { success: false, error: 'Procurement request not found.' };
    }

    if (req.status === 'approved' || req.status === 'rejected') {
      return { success: false, error: `Request is already ${req.status}. Duplicate action prevented.` };
    }

    const timestamp = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const txHash = `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    req.status = 'rejected';
    req.decisionTimestamp = timestamp;
    req.decisionActor = actor;
    req.decisionReason = reason.trim();
    req.txHash = txHash;

    const rejectionEvent: ApprovalAuditEvent = {
      id: `EVT-P${Date.now().toString().slice(-4)}`,
      requestId: req.id,
      actor,
      role: 'Procurement Approver',
      timestamp,
      action: 'rejected',
      actionLabel: 'Request Rejected',
      status: 'rejected',
      comments: req.decisionReason,
      txHash,
    };
    this.auditEvents.unshift(rejectionEvent);

    managerService.addAuditEvent({
      id: `EVT-${Date.now().toString().slice(-4)}`,
      type: 'plan_rejected',
      actor,
      role: 'Procurement Approver',
      timestamp,
      relatedEntityId: req.id,
      relatedEntityType: 'plan',
      description: `Procurement Rejected: ${req.id} for ${req.productSku}. Reason: ${reason}.`,
      verificationStatus: 'verified',
      txHash,
    });

    this.notifications.unshift({
      id: `notif-pr-${Date.now()}`,
      type: 'approval_required',
      title: `Request Rejected: ${req.id}`,
      description: `Rejection recorded for ${req.productSku}. Reason: ${reason}.`,
      timestamp: 'Just now',
      priority: 'High',
      isRead: false,
      relatedEntityType: 'request',
      relatedEntityId: req.id,
    });

    this.notify();
    return { success: true, request: req };
  }

  requestChanges(
    requestId: string,
    actor: string = 'Priya Sharma (Procurement Approver)',
    comments: string
  ): { success: boolean; error?: string; request?: ProcurementRequest } {
    if (!comments || comments.trim().length === 0) {
      return { success: false, error: 'Comments detailing requested changes are mandatory.' };
    }

    const req = this.requests.find((r) => r.id.toLowerCase() === requestId.toLowerCase());
    if (!req) {
      return { success: false, error: 'Procurement request not found.' };
    }

    const timestamp = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    req.status = 'changes_requested';
    req.decisionTimestamp = timestamp;
    req.decisionActor = actor;
    req.decisionReason = comments.trim();

    this.auditEvents.unshift({
      id: `EVT-P${Date.now().toString().slice(-4)}`,
      requestId: req.id,
      actor,
      role: 'Procurement Approver',
      timestamp,
      action: 'changes_requested',
      actionLabel: 'Changes Requested',
      status: 'changes_requested',
      comments: comments.trim(),
    });

    this.notify();
    return { success: true, request: req };
  }

  // --- Suppliers ---
  getSuppliers(filter?: SupplierQualification | 'all', search?: string): SupplierProfile[] {
    let list = [...this.suppliers];

    if (filter && filter !== 'all') {
      list = list.filter((s) => s.qualificationStatus === filter);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          s.location.toLowerCase().includes(q) ||
          s.category.toLowerCase().includes(q) ||
          s.productsSupplied.some((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      );
    }

    return list;
  }

  getSupplierById(id: string): SupplierProfile | undefined {
    return this.suppliers.find((s) => s.id.toLowerCase() === id.toLowerCase());
  }

  // --- Alternative Comparison ---
  getComparisonData(): AlternativeComparison {
    return { ...this.comparison };
  }

  selectProposedSupplier(
    comparisonId: string,
    proposedSupplierId: string
  ): { success: boolean; error?: string; message: string } {
    const comp = this.comparison;
    if (comp.id !== comparisonId) {
      return { success: false, error: 'Comparison record not found.', message: '' };
    }

    const supp = this.suppliers.find((s) => s.id === proposedSupplierId);
    if (!supp) {
      return { success: false, error: 'Proposed supplier not found in registry.', message: '' };
    }

    const isQualified = supp.qualificationStatus === 'approved';
    const note = isQualified
      ? `Proposed supplier ${supp.name} selected for workflow proposal. Approved status confirmed.`
      : `Proposed supplier ${supp.name} selected as a sourcing proposal. NOTE: Supplier qualification is PENDING; binding PO creation requires QA audit signoff.`;

    comp.recommendationNote = note;

    this.notify();
    return {
      success: true,
      message: note,
    };
  }

  // --- Purchase Orders ---
  getPurchaseOrders(status?: POStatus | 'all', search?: string): PurchaseOrder[] {
    let list = [...this.purchaseOrders];

    if (status && status !== 'all') {
      list = list.filter((po) => po.status === status);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(
        (po) =>
          po.id.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.productSku.toLowerCase().includes(q) ||
          po.productName.toLowerCase().includes(q)
      );
    }

    return list;
  }

  getPurchaseOrderById(id: string): PurchaseOrder | undefined {
    return this.purchaseOrders.find((po) => po.id.toLowerCase() === id.toLowerCase());
  }

  cancelPurchaseOrder(
    poId: string,
    actor: string = 'Priya Sharma (Procurement Approver)',
    reason: string
  ): { success: boolean; error?: string; po?: PurchaseOrder } {
    const po = this.purchaseOrders.find((p) => p.id.toLowerCase() === poId.toLowerCase());
    if (!po) {
      return { success: false, error: 'Purchase Order not found.' };
    }
    if (po.status === 'completed' || po.status === 'cancelled') {
      return { success: false, error: `PO is already ${po.status} and cannot be cancelled.` };
    }

    const timestamp = 'Today, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    po.status = 'cancelled';
    po.auditHistory.push({
      event: 'Purchase Order Cancelled by Approver',
      actor,
      timestamp,
      note: reason || 'Cancelled under approver administrative authority.',
    });

    this.notify();
    return { success: true, po };
  }

  // --- Risk Analysis ---
  getRiskDimensions(): SupplierRiskDimension[] {
    return [...this.riskDimensions];
  }

  // --- Audit Events ---
  getAuditEvents(filter?: RequestStatus | 'all', search?: string): ApprovalAuditEvent[] {
    let list = [...this.auditEvents];

    if (filter && filter !== 'all') {
      list = list.filter((e) => e.status === filter);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.id.toLowerCase().includes(q) ||
          e.requestId.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q) ||
          e.actionLabel.toLowerCase().includes(q) ||
          (e.comments && e.comments.toLowerCase().includes(q))
      );
    }

    return list;
  }

  // --- Notifications ---
  getNotifications(filter?: 'all' | 'unread' | 'critical'): ProcurementNotification[] {
    let list = [...this.notifications];
    if (filter === 'unread') {
      list = list.filter((n) => !n.isRead);
    } else if (filter === 'critical') {
      list = list.filter((n) => n.priority === 'Critical' || n.priority === 'Urgent');
    }
    return list;
  }

  markNotificationRead(id: string): void {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.notify();
    }
  }

  markAllNotificationsRead(): void {
    this.notifications.forEach((n) => {
      n.isRead = true;
    });
    this.notify();
  }
}

export const procurementService = new ProcurementService();
export default procurementService;

