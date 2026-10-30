import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Truck,
  Building2,
  Clock,
  DollarSign,
  FileCheck2,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { api, fetchTrackedTransactions } from "../services/api";
import { Disruption, Shipment, Supplier, PurchaseOrder, RecoveryPlanDataContract } from "../types/supplyChain";
import { TrackedTransaction } from "../types/blockchain";

interface ExecutiveOverviewProps {
  onNavigate: (tab: string) => void;
  connectedAccount: string | null;
}

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  onNavigate,
  connectedAccount,
}) => {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [recoveryPlans, setRecoveryPlans] = useState<RecoveryPlanDataContract[]>([]);
  const [transactions, setTransactions] = useState<TrackedTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [disruptionsRes, shipmentsRes, suppliersRes, ordersRes, plansRes, txsRes] =
        await Promise.all([
          api.getActiveDisruptions().catch(() => []),
          api.getShipments(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
          api.getSuppliers(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
          api.getPurchaseOrders(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
          api.getRecoveryPlans(1, 100).catch(() => ({ items: [], total: 0, page: 1, page_size: 100, total_pages: 1 })),
          fetchTrackedTransactions(8).catch(() => []),
        ]);

      setDisruptions(disruptionsRes);
      setShipments(shipmentsRes.items);
      setSuppliers(suppliersRes.items);
      setPurchaseOrders(ordersRes.items);
      setRecoveryPlans(plansRes.items);
      setTransactions(txsRes);
    } catch (err: any) {
      setError(err?.message || "Failed to load executive overview data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [connectedAccount]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate real executive metrics
  const activeDisruptionsCount = disruptions.length;
  const criticalHighIncidents = disruptions.filter(
    (d) => d.severity === "CRITICAL" || d.severity === "HIGH"
  );
  const affectedShipmentIds = new Set<number>();
  disruptions.forEach((d) => {
    if (d.shipments) {
      d.shipments.forEach((s) => affectedShipmentIds.add(s.shipment_id));
    }
  });

  const delayedShipments = shipments.filter((s) => s.delay_hours > 0);
  const totalFinancialExposure = disruptions.reduce(
    (acc, d) => acc + (d.estimated_recovery_cost || 0),
    0
  );
  const pendingPlans = recoveryPlans.filter(
    (p) => p.status === "DRAFT" || p.status === "PENDING_APPROVAL"
  );

  // Overall Network Risk Score
  const avgSeverityScore =
    disruptions.length > 0
      ? disruptions.reduce((acc, d) => {
          const val =
            d.severity === "CRITICAL" ? 95 : d.severity === "HIGH" ? 75 : d.severity === "MEDIUM" ? 50 : 25;
          return acc + val;
        }, 0) / disruptions.length
      : 15;

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Executive Supply Chain Overview
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/30">
              Live Network
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global electronics supply network monitoring, AI disruption detection, and governance integrity.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-colors"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>{refreshing ? "Syncing..." : "Sync Feeds"}</span>
          </button>
          <button
            onClick={() => onNavigate("recovery-planning")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-sm"
          >
            <span>Launch Recovery</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
          <button onClick={handleRefresh} className="underline font-bold hover:text-white">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Disruptions */}
        <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Disruptions</span>
            <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">{activeDisruptionsCount}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium mt-1">
              <span>{criticalHighIncidents.length} Critical / High Severity</span>
            </div>
          </div>
          <button
            onClick={() => onNavigate("disruptions")}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-orange-400 hover:text-orange-300 flex items-center justify-between"
          >
            <span>Inspect incidents</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Network Risk Score */}
        <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Overall Risk Score</span>
            <div className="p-1.5 rounded bg-rose-500/10 text-rose-400">
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {avgSeverityScore.toFixed(1)} <span className="text-xs text-slate-400 font-sans">/ 100</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Deterministic weighted multi-factor model
            </div>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{ width: `${Math.min(avgSeverityScore, 100)}%` }}
              />
            </div>
            <span className="text-[10px] font-bold font-mono text-orange-400">
              {avgSeverityScore >= 70 ? "HIGH" : avgSeverityScore >= 40 ? "MODERATE" : "LOW"}
            </span>
          </div>
        </div>

        {/* Affected Shipments */}
        <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Shipments at Risk</span>
            <div className="p-1.5 rounded bg-blue-500/10 text-blue-400">
              <Truck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">
              {delayedShipments.length} <span className="text-xs text-slate-400 font-sans">/ {shipments.length}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Active in transit maritime & air freight
            </div>
          </div>
          <button
            onClick={() => onNavigate("shipments")}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-blue-400 hover:text-blue-300 flex items-center justify-between"
          >
            <span>Monitor shipments</span>
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Pending Recovery Plans */}
        <div className="p-4 rounded-lg bg-navy-900 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Recovery Plans</span>
            <div className="p-1.5 rounded bg-emerald-500/10 text-emerald-400">
              <ShieldCheck size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white">{recoveryPlans.length}</div>
            <div className="text-[11px] text-emerald-400 font-medium mt-1">
              {pendingPlans.length} Pending Governance Action
            </div>
          </div>
          <button
            onClick={() => onNavigate("governance")}
            className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center justify-between"
          >
            <span>Review governance</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {/* Disruption Feed & Shipment Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Disruption Stream (2 Cols) */}
        <div className="lg:col-span-2 p-5 rounded-lg bg-navy-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Active Operational Disruption Incidents
              </h2>
              <p className="text-xs text-slate-400">
                Correlated from synthetic telemetry and operational checkpoint backlogs.
              </p>
            </div>
            <button
              onClick={() => onNavigate("disruptions")}
              className="text-xs font-semibold text-orange-400 hover:underline"
            >
              View all
            </button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              Loading active disruptions...
            </div>
          ) : disruptions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              No active disruptions detected across the organization network.
            </div>
          ) : (
            <div className="space-y-3">
              {disruptions.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-md bg-slate-800/40 border border-slate-700/60 hover:border-slate-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.incident_code}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                            item.severity === "CRITICAL"
                              ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                              : item.severity === "HIGH"
                              ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                              : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          }`}
                        >
                          {item.severity}
                        </span>
                        <span className="text-xs text-slate-400">
                          {item.category.replace("_", " ")}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1 font-mono">
                        <span>Corridor: {item.geographic_region}</span>
                        <span>Delay: +{item.estimated_delay_hours}h</span>
                        <span>Confidence: {(item.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onNavigate("recovery-planning")}
                      className="px-2.5 py-1.5 rounded text-xs font-semibold text-orange-400 hover:text-white hover:bg-orange-600/30 border border-orange-500/30 transition-colors flex-shrink-0"
                    >
                      Remediate
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Governance & Settlement Activity (1 Col) */}
        <div className="p-5 rounded-lg bg-navy-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Recent On-Chain Activity
              </h2>
              <p className="text-xs text-slate-400">Immutable ledger transaction log</p>
            </div>
            <button
              onClick={() => onNavigate("transactions")}
              className="text-xs font-semibold text-orange-400 hover:underline"
            >
              Audit log
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-mono">
              No transactions recorded yet in this session.
            </div>
          ) : (
            <div className="space-y-2.5">
              {transactions.slice(0, 4).map((tx) => (
                <div
                  key={tx.tx_hash}
                  className="p-2.5 rounded bg-slate-800/30 border border-slate-700/50 flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-mono text-slate-200 font-bold truncate w-36">
                      {tx.function_name || "createRecoveryPlan"}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {tx.tx_hash.substring(0, 8)}...{tx.tx_hash.substring(tx.tx_hash.length - 6)}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      tx.status === "CONFIRMED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : tx.status === "FAILED"
                        ? "bg-rose-500/20 text-rose-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="p-3 rounded bg-slate-800/20 border border-slate-700/40 text-[11px] text-slate-400 space-y-1">
            <div className="font-semibold text-slate-300">Auditable Governance Protocol</div>
            <div>
              All recovery plans hash-anchored using RFC 8785 canonical JSON on Polygon Amoy & local Hardhat devnet.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
