export type TaskType =
  | 'pick_pack'
  | 'receive'
  | 'transfer'
  | 'inspection'
  | 'cycle_count';

export type TaskStatus = 'pending' | 'in_progress' | 'completed';
export type TaskPriority = 'Urgent' | 'High' | 'Medium' | 'Low';

export interface WarehouseTask {
  id: string;
  type: TaskType;
  title: string;
  orderId?: string;
  shipmentId?: string;
  productSku: string;
  productName: string;
  quantity: number;
  completedQuantity?: number;
  warehouseLocation: string;
  priority: TaskPriority;
  dueDate: string;
  assignedOperator: string;
  status: TaskStatus;
  notes?: string;
  completedAt?: string;
  steps?: {
    id: string;
    label: string;
    completed: boolean;
  }[];
}

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'quarantined';

export interface WarehouseProduct {
  id: string;
  sku: string;
  name: string;
  category: string;
  description: string;
  barcode: string;
  barcodeType: 'EAN-13' | 'QR' | 'Code-128';
  availableQuantity: number;
  reservedQuantity: number;
  quarantinedQuantity: number;
  stockStatus: StockStatus;
  assignedWarehouse: string;
  storageLocation: string;
  unit: string;
  unitPrice: number;
  expectedQuantity?: number;
  receivedQuantity?: number;
  imageUrl?: string;
}

export type DamageReason =
  | 'Physical Damage'
  | 'Packaging Damage'
  | 'Water Damage'
  | 'Manufacturing Defect'
  | 'Missing Components'
  | 'Other';

export interface DamageReport {
  id: string;
  shipmentId?: string;
  productSku: string;
  productName: string;
  supplier?: string;
  totalReceived?: number;
  damagedQuantity: number;
  damageReason: DamageReason;
  description: string;
  notes?: string;
  photoUri?: string;
  reportedBy: string;
  reportedAt: string;
  status: 'quarantined' | 'investigating' | 'resolved';
  warehouseId: string;
  txHash?: string;
}

export interface GoodsReceipt {
  id: string;
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
  receivedAt: string;
  status: 'confirmed' | 'draft' | 'discrepancy';
  txHash?: string;
}

export type TransferReason =
  | 'Fulfil Customer Orders'
  | 'Replenishment'
  | 'Warehouse Balancing'
  | 'Operational Requirement';

export type TransferStatus =
  | 'pending_approval'
  | 'approved'
  | 'in_transit'
  | 'completed'
  | 'draft';

export interface StockTransfer {
  id: string;
  fromWarehouse: string;
  toWarehouse: string;
  productSku: string;
  productName: string;
  availableQuantity: number;
  transferQuantity: number;
  transferReason: TransferReason;
  requiredDate: string;
  notes?: string;
  status: TransferStatus;
  requestedBy: string;
  requestedAt: string;
  approvedBy?: string;
  txHash?: string;
}

export interface InboundShipmentItem {
  id: string;
  supplier: string;
  carrier: string;
  productSku: string;
  productName: string;
  expectedQuantity: number;
  actualReceivedQuantity: number;
  damagedQuantity?: number;
  expectedArrivalDate: string;
  status: 'pending' | 'in_progress' | 'received' | 'delayed';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  warehouseDestination: string;
  purchaseRef: string;
}

export interface OutboundShipmentItem {
  id: string;
  orderId: string;
  destinationCustomer: string;
  productSku: string;
  productName: string;
  quantity: number;
  dispatchDate: string;
  expectedDelivery: string;
  status: 'pending' | 'dispatched' | 'delivered';
  priority: 'High' | 'Medium' | 'Low';
  carrier?: string;
}

export type LocationType = 'storage' | 'receiving' | 'dispatch' | 'quarantine';
export type OccupancyStatus =
  | 'available'
  | 'occupied'
  | 'receiving'
  | 'reserved'
  | 'quarantine';

export interface WarehouseLocation {
  id: string;
  name: string;
  aisle: string;
  rack: string;
  shelf: string;
  type: LocationType;
  occupancyStatus: OccupancyStatus;
  occupancyPercent: number;
  storedSkus: string[];
  capacityUnits: number;
  usedUnits: number;
  x: number;
  y: number;
  width: number;
  height: number;
  associatedTaskId?: string;
}

export type NotificationType =
  | 'shipment_arrived'
  | 'task_assigned'
  | 'transfer_approved'
  | 'low_stock'
  | 'damage_reported'
  | 'discrepancy'
  | 'shipment_dispatched'
  | 'task_overdue';

export interface WarehouseNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  isRead: boolean;
  relatedEntityType?: 'task' | 'shipment' | 'product' | 'transfer';
  relatedEntityId?: string;
}

export interface WarehouseKpis {
  availableUnits: number;
  incomingUnits: number;
  outgoingUnits: number;
  capacityUsedPercent: number;
  totalSkus: number;
  lowStockCount: number;
  quarantinedUnits: number;
}
