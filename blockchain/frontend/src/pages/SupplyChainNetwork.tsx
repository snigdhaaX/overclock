import React, { useEffect, useState } from "react";
import {
  Building2,
  FileText,
  Truck,
  Warehouse,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { api } from "../services/api";
import {
  Supplier,
  PurchaseOrder,
  Shipment,
  Warehouse as WarehouseType,
  InventoryItem,
} from "../types/supplyChain";

interface SupplyChainNetworkProps {
  initialTab?: "network" | "suppliers" | "purchase-orders" | "shipments" | "inventory";
}

export const SupplyChainNetwork: React.FC<SupplyChainNetworkProps> = ({
  initialTab = "network",
}) => {
  const [activeTab, setActiveTab] = useState<
    "network" | "suppliers" | "purchase-orders" | "shipments" | "inventory"
  >(initialTab);

  // Data states
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  // Filtering & Pagination
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [supRes, poRes, shpRes, whRes, invRes] = await Promise.all([
        api.getSuppliers(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
        api.getPurchaseOrders(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
        api.getShipments(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
        api.getWarehouses(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
        api.getInventory(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
      ]);
      setSuppliers(supRes.items);
      setOrders(poRes.items);
      setShipments(shpRes.items);
      setWarehouses(whRes.items);
      setInventory(invRes.items);
      if (shpRes.items.length > 0 && !selectedShipment) {
        setSelectedShipment(shpRes.items[0]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadAllData();
  };

  // Filtered queries
  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.country.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredOrders = orders.filter(
    (o) =>
      o.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.supplier_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredShipments = shipments.filter(
    (s) =>
      s.tracking_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.carrier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.current_location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredInventory = inventory.filter(
    (i) =>
      i.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.warehouse_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title & View Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Operational Supply Chain Network
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time entity status across global suppliers, purchase orders, in-transit shipments, and regional warehouses.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-colors w-fit"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          <span>Sync Operations</span>
        </button>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("network")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeTab === "network"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Layers size={14} />
          <span>Network Topology</span>
        </button>
        <button
          onClick={() => setActiveTab("suppliers")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeTab === "suppliers"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Building2 size={14} />
          <span>Suppliers ({suppliers.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("purchase-orders")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeTab === "purchase-orders"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <FileText size={14} />
          <span>Purchase Orders ({orders.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("shipments")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeTab === "shipments"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Truck size={14} />
          <span>Shipment Monitoring ({shipments.length})</span>
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeTab === "inventory"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <Warehouse size={14} />
          <span>Warehouses & Inventory ({inventory.length})</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by code, name, SKU, or location..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* TAB CONTENT */}

      {/* 1. NETWORK TOPOLOGY OVERVIEW */}
      {activeTab === "network" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Tier 1 Suppliers</span>
            <div className="text-2xl font-bold font-mono text-white">
              {suppliers.filter((s) => s.tier === "Tier 1").length}
            </div>
            <div className="text-[11px] text-slate-400">Semiconductor & Display Foundries</div>
          </div>
          <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Active Logistics Lanes</span>
            <div className="text-2xl font-bold font-mono text-white">{shipments.length}</div>
            <div className="text-[11px] text-slate-400">Maritime & Intermodal Cargo</div>
          </div>
          <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Distribution Hubs</span>
            <div className="text-2xl font-bold font-mono text-white">{warehouses.length}</div>
            <div className="text-[11px] text-slate-400">Rotterdam, Singapore, Shenzhen</div>
          </div>
          <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 space-y-2">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Inventory Value</span>
            <div className="text-2xl font-bold font-mono text-white">
              $
              {(
                inventory.reduce((sum, item) => sum + item.on_hand_quantity * item.unit_value, 0) /
                1000000
              ).toFixed(2)}
              M
            </div>
            <div className="text-[11px] text-slate-400">Audited operational ledger balance</div>
          </div>
        </div>
      )}

      {/* 2. SUPPLIERS TABLE */}
      {activeTab === "suppliers" && (
        <div className="rounded-lg bg-navy-900 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">Supplier Code</th>
                <th className="p-3">Supplier Name</th>
                <th className="p-3">Location</th>
                <th className="p-3">Tier</th>
                <th className="p-3">Reliability</th>
                <th className="p-3">Avg Lead Time</th>
                <th className="p-3">Risk Index</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white">{s.supplier_code}</td>
                  <td className="p-3 font-sans font-semibold text-slate-200">{s.name}</td>
                  <td className="p-3 font-sans">
                    {s.city}, {s.country}
                  </td>
                  <td className="p-3">{s.tier}</td>
                  <td className="p-3 text-emerald-400 font-bold">
                    {(s.reliability_score * 100).toFixed(0)}%
                  </td>
                  <td className="p-3">{s.average_lead_time_days} days</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        s.risk_score < 30
                          ? "bg-emerald-500/10 text-emerald-400"
                          : s.risk_score < 60
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-rose-500/10 text-rose-400"
                      }`}
                    >
                      {s.risk_score}/100
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="text-emerald-400 font-bold">{s.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. PURCHASE ORDERS TABLE */}
      {activeTab === "purchase-orders" && (
        <div className="rounded-lg bg-navy-900 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">PO Number</th>
                <th className="p-3">Supplier</th>
                <th className="p-3">Order Date</th>
                <th className="p-3">Expected Delivery</th>
                <th className="p-3">Items & Quantity</th>
                <th className="p-3">Total Value</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white">{o.po_number}</td>
                  <td className="p-3 font-sans text-slate-200">{o.supplier_name}</td>
                  <td className="p-3">{new Date(o.order_date).toLocaleDateString()}</td>
                  <td className="p-3">{new Date(o.expected_delivery).toLocaleDateString()}</td>
                  <td className="p-3">
                    {o.items?.map((it) => `${it.sku} (${it.quantity})`).join(", ") || "1 SKU"}
                  </td>
                  <td className="p-3 font-bold text-white">
                    ${o.total_amount.toLocaleString()} {o.currency}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        o.status === "DELIVERED"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : o.status === "IN_TRANSIT"
                          ? "bg-blue-500/10 text-blue-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. SHIPMENTS MONITORING & CHECKPOINT HISTORY */}
      {activeTab === "shipments" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 rounded-lg bg-navy-900 border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Tracking</th>
                  <th className="p-3">Carrier / Mode</th>
                  <th className="p-3">Origin → Dest</th>
                  <th className="p-3">Delay</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                {filteredShipments.map((shp) => {
                  const isSelected = selectedShipment?.id === shp.id;
                  return (
                    <tr
                      key={shp.id}
                      onClick={() => setSelectedShipment(shp)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? "bg-slate-800/80 font-bold" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="p-3 font-bold text-white">{shp.tracking_number}</td>
                      <td className="p-3 font-sans">
                        <div>{shp.carrier_name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{shp.transport_mode}</div>
                      </td>
                      <td className="p-3 font-sans text-[11px]">
                        <div>{shp.origin}</div>
                        <div className="text-slate-400">→ {shp.destination}</div>
                      </td>
                      <td className="p-3">
                        {shp.delay_hours > 0 ? (
                          <span className="text-rose-400 font-bold">+{shp.delay_hours}h</span>
                        ) : (
                          <span className="text-emerald-400">On Time</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            shp.delay_hours > 0
                              ? "bg-rose-500/20 text-rose-400"
                              : "bg-emerald-500/20 text-emerald-400"
                          }`}
                        >
                          {shp.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Checkpoint Detail for selected shipment */}
          <div className="lg:col-span-5 p-5 rounded-lg bg-navy-900 border border-slate-800 space-y-4">
            {selectedShipment ? (
              <>
                <div className="pb-3 border-b border-slate-800">
                  <div className="text-xs uppercase font-bold text-slate-400">
                    Shipment Telemetry
                  </div>
                  <div className="font-mono text-base font-bold text-white mt-1">
                    {selectedShipment.tracking_number}
                  </div>
                  <div className="text-xs text-slate-300 mt-1">
                    Carrier: {selectedShipment.carrier_name} ({selectedShipment.carrier_code})
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 font-mono">
                    Current Location: {selectedShipment.current_location}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase text-slate-400">
                    Checkpoint Audit Trail
                  </div>
                  {selectedShipment.checkpoints && selectedShipment.checkpoints.length > 0 ? (
                    <div className="space-y-2 border-l-2 border-slate-800 ml-2 pl-4">
                      {selectedShipment.checkpoints.map((cp) => (
                        <div key={cp.id} className="relative space-y-1">
                          <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-orange-500" />
                          <div className="flex items-center justify-between text-xs font-mono">
                            <span className="font-bold text-white">{cp.location}</span>
                            <span className="text-[10px] text-slate-400">
                              {new Date(cp.checkpoint_time).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300">{cp.status}</div>
                          {cp.notes && (
                            <div className="text-[10px] text-amber-400/90 font-mono bg-slate-800/40 p-1.5 rounded">
                              {cp.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400 font-mono">
                      No discrete checkpoints registered yet.
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Select a shipment to inspect its tracking route.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. WAREHOUSES & INVENTORY */}
      {activeTab === "inventory" && (
        <div className="rounded-lg bg-navy-900 border border-slate-800 overflow-hidden">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
              <tr>
                <th className="p-3">SKU</th>
                <th className="p-3">Item Description</th>
                <th className="p-3">Warehouse Hub</th>
                <th className="p-3">On Hand</th>
                <th className="p-3">Reserved</th>
                <th className="p-3">Safety Stock</th>
                <th className="p-3">Available</th>
                <th className="p-3">Unit Value</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3 font-bold text-white">{item.sku}</td>
                  <td className="p-3 font-sans text-slate-200">{item.item_name}</td>
                  <td className="p-3 font-sans">{item.warehouse_name}</td>
                  <td className="p-3 font-bold text-white">{item.on_hand_quantity}</td>
                  <td className="p-3 text-amber-400">{item.reserved_quantity}</td>
                  <td className="p-3 text-slate-400">{item.safety_stock}</td>
                  <td className="p-3 text-emerald-400 font-bold">{item.available_quantity}</td>
                  <td className="p-3">${item.unit_value.toFixed(2)}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.available_quantity > item.safety_stock
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
