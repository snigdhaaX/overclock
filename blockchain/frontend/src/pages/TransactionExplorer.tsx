import React, { useState, useEffect } from "react";
import {
  Activity,
  Search,
  Filter,
  ExternalLink,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Layers,
  Database,
  Calendar,
} from "lucide-react";
import { TrackedTransaction } from "../types/blockchain";
import { fetchTrackedTransactions } from "../services/api";
import { getExplorerTxUrl } from "../services/wallet";

export const TransactionExplorer: React.FC = () => {
  const [transactions, setTransactions] = useState<TrackedTransaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [planFilter, setPlanFilter] = useState<string>("");
  const [operationFilter, setOperationFilter] = useState<string>("ALL");

  const loadTransactions = async () => {
    try {
      setError(null);
      const res = await fetchTrackedTransactions(50);
      setTransactions(res);
    } catch (err: any) {
      setError(err?.message || "Failed to load transaction ledger audit records.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadTransactions();
  };

  // Filter logic
  const filteredTxs = transactions.filter((tx) => {
    if (statusFilter !== "ALL" && tx.status !== statusFilter) return false;
    if (operationFilter !== "ALL" && tx.function_name !== operationFilter) return false;
    if (planFilter.trim()) {
      const q = planFilter.trim().toLowerCase();
      const hasPlan = tx.plan_id?.toLowerCase().includes(q);
      const hasHash = tx.tx_hash.toLowerCase().includes(q);
      const hasWallet = tx.submitter_wallet.toLowerCase().includes(q);
      if (!hasPlan && !hasHash && !hasWallet) return false;
    }
    return true;
  });

  // Extract distinct operations
  const operations = Array.from(
    new Set(transactions.map((t) => t.function_name).filter(Boolean))
  ) as string[];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent-400" />
            Blockchain Transaction Explorer
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Immutable settlement audit trail for all recovery plan anchors, stage approvals, and evidence submissions.
          </p>
        </div>
        <div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-accent-400" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-rose-500/40 bg-rose-500/10 text-rose-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Error Loading Transactions: </span>
            {error}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 border-b border-navy-700 pb-2">
          <Filter className="w-4 h-4 text-accent-400" />
          <span>Audit Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Search by Plan ID / Hash / Signer
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search..."
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Settlement Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input font-mono text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="INCLUDED">INCLUDED</option>
              <option value="PENDING">PENDING</option>
              <option value="SUBMITTED">SUBMITTED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Contract Operation
            </label>
            <select
              value={operationFilter}
              onChange={(e) => setOperationFilter(e.target.value)}
              className="input font-mono text-xs"
            >
              <option value="ALL">All Operations</option>
              {operations.map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-navy-900/80 border-b border-navy-700 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Tx Hash</th>
                <th className="py-3 px-4">Operation</th>
                <th className="py-3 px-4">Plan Ref</th>
                <th className="py-3 px-4">Submitter Wallet</th>
                <th className="py-3 px-4">Block / Gas</th>
                <th className="py-3 px-4">Confirmations</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Explorer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/60 font-mono">
              {filteredTxs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 font-sans">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-400" />
                    <p className="text-sm">No transaction audit logs matched your query.</p>
                  </td>
                </tr>
              ) : (
                filteredTxs.map((tx) => {
                  const isConfirmed = tx.status === "CONFIRMED";
                  const isFailed = tx.status === "FAILED";
                  const isPending =
                    tx.status === "PENDING" || tx.status === "SUBMITTED" || tx.status === "INCLUDED";
                  const explorerUrl = getExplorerTxUrl(tx.chain_id, tx.tx_hash);

                  return (
                    <tr
                      key={tx.tx_hash}
                      className="hover:bg-navy-800/50 transition-colors"
                    >
                      {/* Tx Hash */}
                      <td className="py-3 px-4 text-slate-200 font-bold truncate max-w-[140px]" title={tx.tx_hash}>
                        {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-6)}
                      </td>

                      {/* Operation */}
                      <td className="py-3 px-4 text-accent-300 font-sans font-semibold">
                        {tx.function_name || "Contract Call"}
                      </td>

                      {/* Plan Ref */}
                      <td className="py-3 px-4 text-slate-300">
                        {tx.plan_id ? (
                          <span>
                            {tx.plan_id} (v{tx.plan_version ?? 1})
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>

                      {/* Submitter */}
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[130px]" title={tx.submitter_wallet}>
                        {tx.submitter_wallet.slice(0, 8)}...{tx.submitter_wallet.slice(-4)}
                      </td>

                      {/* Block / Gas */}
                      <td className="py-3 px-4 text-slate-400">
                        <div>#{tx.block_number ?? "—"}</div>
                        <div className="text-[10px] text-slate-500">
                          {tx.gas_used ? `${tx.gas_used.toLocaleString()} gas` : ""}
                        </div>
                      </td>

                      {/* Confirmations */}
                      <td className="py-3 px-4 text-slate-200 font-bold">
                        {tx.confirmations}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`badge text-[10px] py-0.5 px-2 ${
                            isConfirmed
                              ? "badge-success"
                              : isFailed
                              ? "badge-danger"
                              : "badge-warning"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Explorer Link */}
                      <td className="py-3 px-4 text-right">
                        {explorerUrl ? (
                          <a
                            href={explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-accent-400 hover:text-accent-300"
                            title="Open in PolygonScan"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-600">Local</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
