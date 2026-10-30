import React from "react";
import {
  LayoutDashboard,
  AlertTriangle,
  Network,
  Building2,
  FileText,
  Truck,
  Warehouse,
  Compass,
  Sliders,
  ShieldCheck,
  FileCheck2,
  ListOrdered,
  Wallet,
  Layers,
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  networkName?: string;
  isAmoy: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  networkName = "Polygon Amoy",
  isAmoy,
}) => {
  const sections = [
    {
      group: "INTELLIGENCE & OPERATIONS",
      items: [
        { id: "overview", label: "Executive Overview", icon: LayoutDashboard },
        { id: "disruptions", label: "Disruption Intelligence", icon: AlertTriangle },
        { id: "network", label: "Supply Chain Network", icon: Network },
        { id: "suppliers", label: "Suppliers", icon: Building2 },
        { id: "purchase-orders", label: "Purchase Orders", icon: FileText },
        { id: "shipments", label: "Shipment Monitoring", icon: Truck },
        { id: "inventory", label: "Warehouses & Inventory", icon: Warehouse },
      ],
    },
    {
      group: "AI RECOVERY & DECISION",
      items: [
        { id: "recovery-planning", label: "Recovery Planning", icon: Compass },
        { id: "simulation", label: "Simulation & Optimisation", icon: Sliders },
      ],
    },
    {
      group: "BLOCKCHAIN GOVERNANCE",
      items: [
        { id: "governance", label: "Governance & Approvals", icon: ShieldCheck },
        { id: "verification", label: "Verification Centre", icon: FileCheck2 },
        { id: "transactions", label: "Audit & Transactions", icon: ListOrdered },
        { id: "wallet", label: "Wallet & Settings", icon: Wallet },
      ],
    },
  ];

  return (
    <aside
      className="w-64 bg-navy-950 flex flex-col flex-shrink-0 border-r border-slate-800 select-none overflow-hidden"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
      }}
    >
      {/* Brand Header */}
      <div
        className="p-4 flex items-center gap-3 border-b border-slate-800"
        style={{ borderBottom: "1px solid var(--border-color)" }}
      >
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-white shadow-sm flex-shrink-0"
          style={{ backgroundColor: "var(--accent-orange)" }}
        >
          <Layers size={20} />
        </div>
        <div className="min-w-0">
          <div className="font-extrabold text-base tracking-tight text-white leading-tight">
            TRUST<span style={{ color: "var(--accent-orange)" }}>CHAIN</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono tracking-wider uppercase">
            Disruption Platform
          </div>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {sections.map((section) => (
          <div key={section.group}>
            <div className="px-3 pb-1 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
              {section.group}
            </div>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-all text-left ${
                      isActive
                        ? "text-orange-400 font-semibold"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                    }`}
                    style={{
                      background: isActive ? "var(--bg-panel)" : "transparent",
                      borderLeft: isActive
                        ? "3px solid var(--accent-orange)"
                        : "3px solid transparent",
                    }}
                  >
                    <Icon size={16} className={isActive ? "text-orange-400" : "text-slate-400"} />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Target Network & Identity Status Footer */}
      <div
        className="p-3 border-t border-slate-800 text-xs bg-black/20"
        style={{ borderTop: "1px solid var(--border-color)" }}
      >
        <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1">
          Active Environment
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{
                backgroundColor: isAmoy ? "var(--status-green)" : "var(--status-amber)",
              }}
            />
            <span className="text-xs font-semibold text-slate-200">{networkName}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800/60 border border-slate-700/50">
            ORG-APEX
          </span>
        </div>
      </div>
    </aside>
  );
};
