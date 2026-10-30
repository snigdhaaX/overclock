import {
  DamageReport,
  GoodsReceipt,
  InboundShipmentItem,
  OutboundShipmentItem,
  StockStatus,
  StockTransfer,
  TaskPriority,
  TaskStatus,
  WarehouseKpis,
  WarehouseLocation,
  WarehouseNotification,
  WarehouseProduct,
  WarehouseTask,
} from '../types';
import {
  INITIAL_DAMAGE_REPORTS,
  INITIAL_GOODS_RECEIPTS,
  INITIAL_INBOUND_SHIPMENTS,
  INITIAL_NOTIFICATIONS,
  INITIAL_OUTBOUND_SHIPMENTS,
  INITIAL_PRODUCTS,
  INITIAL_STOCK_TRANSFERS,
  INITIAL_TASKS,
  INITIAL_WAREHOUSE_KPIS,
  INITIAL_WAREHOUSE_LOCATIONS,
} from '../data/warehouseMockData';

type Listener = () => void;

class WarehouseService {
  private kpis: WarehouseKpis = { ...INITIAL_WAREHOUSE_KPIS };
  private products: WarehouseProduct[] = [...INITIAL_PRODUCTS];
  private tasks: WarehouseTask[] = [...INITIAL_TASKS];
  private inboundShipments: InboundShipmentItem[] = [...INITIAL_INBOUND_SHIPMENTS];
  private outboundShipments: OutboundShipmentItem[] = [...INITIAL_OUTBOUND_SHIPMENTS];
  private stockTransfers: StockTransfer[] = [...INITIAL_STOCK_TRANSFERS];
  private damageReports: DamageReport[] = [...INITIAL_DAMAGE_REPORTS];
  private goodsReceipts: GoodsReceipt[] = [...INITIAL_GOODS_RECEIPTS];
  private locations: WarehouseLocation[] = [...INITIAL_WAREHOUSE_LOCATIONS];
  private notifications: WarehouseNotification[] = [...INITIAL_NOTIFICATIONS];

  private listeners: Set<Listener> = new Set();
  private isOnline: boolean = true;
  private pendingSyncQueue: Array<{ type: string; payload: any }> = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.recomputeKpis();
    this.listeners.forEach((fn) => fn());
  }

  private recomputeKpis() {
    let available = 0;
    let quarantined = 0;
    let lowStock = 0;

    this.products.forEach((p) => {
      available += p.availableQuantity;
      quarantined += p.quarantinedQuantity;
      if (p.stockStatus === 'low_stock') lowStock++;
    });

    this.kpis = {
      ...this.kpis,
      availableUnits: available,
      quarantinedUnits: quarantined,
      lowStockCount: lowStock,
      totalSkus: this.products.length,
    };
  }

  // Connectivity
  getConnectionStatus() {
    return {
      isOnline: this.isOnline,
      pendingCount: this.pendingSyncQueue.length,
    };
  }

  toggleConnectionStatus(online: boolean) {
    this.isOnline = online;
    if (online && this.pendingSyncQueue.length > 0) {
      this.pendingSyncQueue = [];
    }
    this.notify();
  }

  // KPIs
  getWarehouseKpis(): WarehouseKpis {
    return { ...this.kpis };
  }

  // Inventory & Products
  getWarehouseInventory(filter?: StockStatus | 'all', search?: string): WarehouseProduct[] {
    let list = [...this.products];
    if (filter && filter !== 'all') {
      list = list.filter((p) => p.stockStatus === filter);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.sku.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.barcode.includes(q) ||
          p.category.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getProductById(id: string): WarehouseProduct | undefined {
    return this.products.find((p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase());
  }

  getProductBySku(sku: string): WarehouseProduct | undefined {
    return this.products.find((p) => p.sku.toLowerCase() === sku.toLowerCase());
  }

  getProductByBarcode(barcode: string): WarehouseProduct | undefined {
    return this.products.find((p) => p.barcode === barcode.trim());
  }

  // Tasks
  getWarehouseTasks(status?: TaskStatus | 'all', priority?: TaskPriority | 'all', search?: string): WarehouseTask[] {
    let list = [...this.tasks];
    if (status && status !== 'all') {
      list = list.filter((t) => t.status === status);
    }
    if (priority && priority !== 'all') {
      list = list.filter((t) => t.priority === priority);
    }
    if (search && search.trim().length > 0) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.title.toLowerCase().includes(q) ||
          (t.orderId && t.orderId.toLowerCase().includes(q)) ||
          (t.shipmentId && t.shipmentId.toLowerCase().includes(q)) ||
          t.productSku.toLowerCase().includes(q)
      );
    }
    return list;
  }

  getTaskById(id: string): WarehouseTask | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  updateTaskStatus(taskId: string, status: TaskStatus, completedQuantity?: number): boolean {
    const idx = this.tasks.findIndex((t) => t.id === taskId);
    if (idx === -1) return false;

    const task = this.tasks[idx];
    const updated: WarehouseTask = {
      ...task,
      status,
      completedQuantity: completedQuantity !== undefined ? completedQuantity : task.completedQuantity,
      completedAt: status === 'completed' ? new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
    };

    if (status === 'completed' && task.steps) {
      updated.steps = task.steps.map((s) => ({ ...s, completed: true }));
    }

    this.tasks[idx] = updated;

    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      type: 'task_assigned',
      title: `Task ${task.id} ${status === 'completed' ? 'Completed' : 'Updated'}`,
      description: `${task.title} status marked as ${status.replace('_', ' ').toUpperCase()}.`,
      timestamp: 'Just now',
      priority: 'Low',
      isRead: false,
      relatedEntityType: 'task',
      relatedEntityId: task.id,
    });

    this.notify();
    return true;
  }

  completeTaskStep(taskId: string, stepId: string): boolean {
    const task = this.tasks.find((t) => t.id === taskId);
    if (!task || !task.steps) return false;

    const step = task.steps.find((s) => s.id === stepId);
    if (!step) return false;

    step.completed = !step.completed;

    const allCompleted = task.steps.every((s) => s.completed);
    if (allCompleted) {
      task.status = 'completed';
      task.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      task.status = 'in_progress';
    }

    this.notify();
    return true;
  }

  // Shipments
  getIncomingShipments(status?: string): InboundShipmentItem[] {
    if (!status || status === 'all') return [...this.inboundShipments];
    return this.inboundShipments.filter((s) => s.status === status);
  }

  getShipmentById(id: string): InboundShipmentItem | undefined {
    return this.inboundShipments.find((s) => s.id === id);
  }

  getOutgoingShipments(status?: string): OutboundShipmentItem[] {
    if (!status || status === 'all') return [...this.outboundShipments];
    return this.outboundShipments.filter((s) => s.status === status);
  }

  // Goods Receipt Workflow
  createGoodsReceipt(payload: {
    shipmentId: string;
    supplier: string;
    carrier: string;
    expectedArrivalDate: string;
    expectedQuantity: number;
    receivedQuantity: number;
    damagedQuantity: number;
    productSku: string;
    productName: string;
    purchaseRef: string;
    warehouseDestination: string;
    notes?: string;
    receivedBy: string;
  }): { success: boolean; error?: string; receipt?: GoodsReceipt } {
    if (payload.receivedQuantity < 0) {
      return { success: false, error: 'Received quantity cannot be negative.' };
    }
    if (payload.damagedQuantity > payload.receivedQuantity) {
      return { success: false, error: 'Damaged quantity cannot exceed total received quantity.' };
    }

    const receiptId = `GR-${Date.now().toString().slice(-6)}`;
    const newReceipt: GoodsReceipt = {
      id: receiptId,
      ...payload,
      receivedAt: 'Just now',
      status: payload.damagedQuantity > 0 ? 'discrepancy' : 'confirmed',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    };

    this.goodsReceipts.unshift(newReceipt);

    // Update Product Inventory
    const prod = this.products.find((p) => p.sku.toLowerCase() === payload.productSku.toLowerCase());
    if (prod) {
      const netAvailable = payload.receivedQuantity - payload.damagedQuantity;
      prod.availableQuantity += netAvailable;
      prod.quarantinedQuantity += payload.damagedQuantity;
      prod.stockStatus = prod.availableQuantity > 50 ? 'in_stock' : prod.availableQuantity > 0 ? 'low_stock' : 'out_of_stock';
      prod.receivedQuantity = (prod.receivedQuantity || 0) + payload.receivedQuantity;
    }

    // Update Shipment
    const shp = this.inboundShipments.find((s) => s.id === payload.shipmentId);
    if (shp) {
      shp.actualReceivedQuantity = payload.receivedQuantity;
      shp.damagedQuantity = payload.damagedQuantity;
      shp.status = payload.receivedQuantity >= shp.expectedQuantity ? 'received' : 'in_progress';
    }

    // Update Associated Task if exists
    const relatedTask = this.tasks.find((t) => t.shipmentId === payload.shipmentId);
    if (relatedTask) {
      relatedTask.status = 'completed';
      relatedTask.completedQuantity = payload.receivedQuantity;
      relatedTask.completedAt = 'Just now';
    }

    // Add Notification
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      type: payload.damagedQuantity > 0 ? 'discrepancy' : 'shipment_arrived',
      title: `Goods Receipt Confirmed: ${payload.shipmentId}`,
      description: `Received ${payload.receivedQuantity} units (${payload.damagedQuantity} damaged) of ${payload.productSku}.`,
      timestamp: 'Just now',
      priority: payload.damagedQuantity > 0 ? 'High' : 'Medium',
      isRead: false,
      relatedEntityType: 'shipment',
      relatedEntityId: payload.shipmentId,
    });

    this.notify();
    return { success: true, receipt: newReceipt };
  }

  // Damage Reporting Workflow
  createDamageReport(payload: {
    shipmentId?: string;
    productSku: string;
    productName: string;
    supplier?: string;
    totalReceived?: number;
    damagedQuantity: number;
    damageReason: DamageReport['damageReason'];
    description: string;
    notes?: string;
    photoUri?: string;
    reportedBy: string;
    warehouseId: string;
  }): { success: boolean; error?: string; report?: DamageReport } {
    if (payload.damagedQuantity <= 0) {
      return { success: false, error: 'Damaged quantity must be greater than zero.' };
    }

    const reportId = `DMG-${Date.now().toString().slice(-4)}`;
    const newReport: DamageReport = {
      id: reportId,
      ...payload,
      reportedAt: 'Just now',
      status: 'quarantined',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    };

    this.damageReports.unshift(newReport);

    // Quarantine Stock: deduct from available if present, add to quarantined
    const prod = this.products.find((p) => p.sku.toLowerCase() === payload.productSku.toLowerCase());
    if (prod) {
      const deductFromAvailable = Math.min(prod.availableQuantity, payload.damagedQuantity);
      prod.availableQuantity -= deductFromAvailable;
      prod.quarantinedQuantity += payload.damagedQuantity;
      prod.stockStatus = prod.availableQuantity === 0 ? 'out_of_stock' : prod.availableQuantity < 50 ? 'low_stock' : 'in_stock';
    }

    // Add Notification
    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      type: 'damage_reported',
      title: `Damage Logged: ${reportId} (${payload.productSku})`,
      description: `${payload.damagedQuantity} units quarantined for reason: ${payload.damageReason}.`,
      timestamp: 'Just now',
      priority: 'High',
      isRead: false,
      relatedEntityType: 'product',
      relatedEntityId: payload.productSku,
    });

    this.notify();
    return { success: true, report: newReport };
  }

  // Stock Transfer Workflow
  createStockTransfer(payload: {
    fromWarehouse: string;
    toWarehouse: string;
    productSku: string;
    productName: string;
    transferQuantity: number;
    transferReason: StockTransfer['transferReason'];
    requiredDate: string;
    notes?: string;
    requestedBy: string;
  }): { success: boolean; error?: string; transfer?: StockTransfer } {
    if (payload.fromWarehouse === payload.toWarehouse) {
      return { success: false, error: 'Source and destination warehouses must be different.' };
    }
    if (payload.transferQuantity <= 0) {
      return { success: false, error: 'Transfer quantity must be greater than zero.' };
    }

    const prod = this.products.find((p) => p.sku.toLowerCase() === payload.productSku.toLowerCase());
    const available = prod ? prod.availableQuantity : 0;

    if (payload.transferQuantity > available) {
      return { success: false, error: `Insufficient available stock (${available} units available).` };
    }

    const transferId = `TRF-${Date.now().toString().slice(-4)}`;
    const newTransfer: StockTransfer = {
      id: transferId,
      ...payload,
      availableQuantity: available,
      status: 'pending_approval',
      requestedAt: 'Just now',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
    };

    this.stockTransfers.unshift(newTransfer);

    // Note: Governance rule: Do NOT deduct available stock prematurely until approved!

    this.notifications.unshift({
      id: `notif-${Date.now()}`,
      type: 'task_assigned',
      title: `Stock Transfer Request: ${transferId}`,
      description: `Requested transfer of ${payload.transferQuantity} units from ${payload.fromWarehouse} to ${payload.toWarehouse}.`,
      timestamp: 'Just now',
      priority: 'Medium',
      isRead: false,
      relatedEntityType: 'transfer',
      relatedEntityId: transferId,
    });

    this.notify();
    return { success: true, transfer: newTransfer };
  }

  getStockTransfers(): StockTransfer[] {
    return [...this.stockTransfers];
  }

  getDamageReports(): DamageReport[] {
    return [...this.damageReports];
  }

  getGoodsReceipts(): GoodsReceipt[] {
    return [...this.goodsReceipts];
  }

  // Warehouse Floor Map Locations
  getWarehouseLocations(type?: string): WarehouseLocation[] {
    if (!type || type === 'all') return [...this.locations];
    return this.locations.filter((l) => l.type === type);
  }

  getLocationById(id: string): WarehouseLocation | undefined {
    return this.locations.find((l) => l.id === id);
  }

  // Notifications
  getNotifications(filter?: 'all' | 'unread' | 'critical'): WarehouseNotification[] {
    let list = [...this.notifications];
    if (filter === 'unread') {
      list = list.filter((n) => !n.isRead);
    } else if (filter === 'critical') {
      list = list.filter((n) => n.priority === 'Critical' || n.priority === 'High');
    }
    return list;
  }

  markNotificationRead(id: string) {
    const notif = this.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.notify();
    }
  }

  markAllNotificationsRead() {
    this.notifications.forEach((n) => (n.isRead = true));
    this.notify();
  }
}

export const warehouseService = new WarehouseService();
export default warehouseService;
