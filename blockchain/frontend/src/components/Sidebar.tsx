import React from "react";
import {
  LayoutDashboard,
  Wallet,
  ShieldCheck,
  FileCheck2,
  ListOrdered,
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
  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "wallet", label: "Wallet Management", icon: Wallet },
    { id: "governance", label: "Plan Governance", icon: ShieldCheck },
    { id: "verification", label: "Verification Centre", icon: FileCheck2 },
    { id: "transactions", label: "Transaction Explorer", icon: ListOrdered },
  ];

  return (
    <aside
      style={{
        width: "260px",
        backgroundColor: "var(--bg-secondary)",
        borderRight: "1px solid var(--border-color)",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          padding: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "8px",
            backgroundColor: "var(--accent-orange)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: 800,
          }}
        >
          <Layers size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.02em" }}>
            TRUST<span style={{ color: "var(--accent-orange)" }}>CHAIN</span>
          </div>
          <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Blockchain Module
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: "1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: isActive ? "var(--bg-panel)" : "transparent",
                color: isActive ? "var(--accent-orange)" : "var(--text-secondary)",
                fontWeight: isActive ? 600 : 500,
                fontSize: "0.875rem",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s ease",
                borderLeft: isActive ? "3px solid var(--accent-orange)" : "3px solid transparent",
              }}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Network Badge at Bottom */}
      <div
        style={{
          padding: "1.25rem",
          borderTop: "1px solid var(--border-color)",
          backgroundColor: "rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginBottom: "0.375rem" }}>
          TARGET NETWORK
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isAmoy ? "var(--status-green)" : "var(--status-amber)",
            }}
          />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{networkName}</span>
        </div>
      </div>
    </aside>
  );
};
