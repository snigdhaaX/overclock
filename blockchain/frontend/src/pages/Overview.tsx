import React, { useEffect, useState } from "react";
import {
  Activity,
  Layers,
  Database,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Radio,
  FileCheck2,
  ExternalLink,
  RefreshCw,
  Wallet,
  ArrowRight,
} from "lucide-react";
import {
  NetworkInfo,
  TrackedTransaction,
  IndexedEvent,
  LinkedWalletResponse,
} from "../types/blockchain";
import {
  fetchNetworkStatus,
  fetchTrackedTransactions,
  fetchIndexedEvents,
  fetchWalletStatus,
} from "../services/api";
import { getExplorerTxUrl } from "../services/wallet";

interface OverviewProps {
  onNavigate: (tab: string) => void;
  connectedAccount: string | null;
}

export const Overview: React.FC<OverviewProps> = ({
  onNavigate,
  connectedAccount,
}) => {
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [walletStatus, setWalletStatus] = useState<LinkedWalletResponse | null>(null);
  const [transactions, setTransactions] = useState<TrackedTransaction[]>([]);
  const [events, setEvents] = useState<IndexedEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      const [netRes, txRes, evtRes] = await Promise.all([
        fetchNetworkStatus(),
        fetchTrackedTransactions(10),
        fetchIndexedEvents({ limit: 10 }),
      ]);
      setNetwork(netRes);
      setTransactions(txRes);
      setEvents(evtRes);

      if (connectedAccount) {
        try {
          const wStatus = await fetchWalletStatus(connectedAccount);
          setWalletStatus(wStatus);
        } catch {
          // Ignore wallet status failure if wallet not linked yet
        }
      }
    } catch (err: any) {
      setError(err?.message || "Failed to connect to TRUSTCHAIN blockchain service.");
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

  const pendingCount = transactions.filter(
    (tx) => tx.status === "PENDING" || tx.status === "SUBMITTED" || tx.status === "INCLUDED"
  ).length;
  const confirmedCount = transactions.filter((tx) => tx.status === "CONFIRMED").length;
  const failedCount = transactions.filter((tx) => tx.status === "FAILED").length;

  return (
    <div className="space-y-6">
      {/* Top Header / Refresh Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Blockchain Governance Overview
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Real-time ledger telemetry, smart contract state, and transaction settlement metrics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-accent-400" : ""}`} />
            <span>Refresh State</span>
          </button>
          <button
            onClick={() => onNavigate("verification")}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Open Verification Centre</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-rose-500/40 bg-rose-500/10 text-rose-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Connectivity Warning: </span>
            {error}
          </div>
        </div>
      )}

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Node Connectivity */}
        <div className="card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">RPC Connectivity</span>
            <Radio className={`w-4 h-4 ${network?.connected ? "text-emerald-400" : "text-rose-400"}`} />
          </div>
          <div className="text-xl font-bold text-white flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                network?.connected ? "bg-emerald-400 animate-pulse" : "bg-rose-500"
              }`}
            />
            {network?.connected ? "Operational" : "Disconnected"}
          </div>
          <p className="text-xs text-slate-400 mt-2 truncate font-mono">
            {network?.rpc_url || "Configuring RPC..."}
          </p>
        </div>

        {/* Chain ID & Block Height */}
        <div className="card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Latest Block</span>
            <Layers className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {network?.latest_block !== null && network?.latest_block !== undefined
              ? `#${network.latest_block.toLocaleString()}`
              : "—"}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Chain ID:{" "}
            <code className="text-accent-400">
              {network?.chain_id ?? network?.expected_chain_id ?? "—"}
            </code>{" "}
            {network?.chain_id === 80002
              ? "(Polygon Amoy)"
              : network?.chain_id === 31337
              ? "(Hardhat Local)"
              : ""}
          </p>
        </div>

        {/* Contract Anchor Address */}
        <div className="card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Governance Contract</span>
            <Database className="w-4 h-4 text-accent-400" />
          </div>
          <div className="text-sm font-mono text-white truncate font-bold" title={network?.contract_address}>
            {network?.contract_address || "Not Deployed"}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2">
            <span>ABI Loaded:</span>
            <span className={network?.abi_loaded ? "text-emerald-400 font-semibold" : "text-rose-400"}>
              {network?.abi_loaded ? "Verified" : "Missing"}
            </span>
          </div>
        </div>

        {/* Active Transactions */}
        <div className="card">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Transactions</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="text-white font-bold">{confirmedCount}</span>
              <span className="text-slate-400 text-xs">Conf</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-white font-bold">{pendingCount}</span>
              <span className="text-slate-400 text-xs">Pend</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              <span className="text-white font-bold">{failedCount}</span>
              <span className="text-slate-400 text-xs">Fail</span>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Tracked in audit ledger</p>
        </div>
      </div>

      {/* Connected Account & Authorization Banner */}
      <div className="card bg-navy-800/90 border-navy-700">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent-500/10 border border-accent-500/30 flex items-center justify-center text-accent-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">Browser Wallet Session:</span>
                {connectedAccount ? (
                  <span className="font-mono text-sm text-accent-300 font-bold">
                    {connectedAccount}
                  </span>
                ) : (
                  <span className="badge badge-warning">Wallet Not Connected</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {connectedAccount
                  ? walletStatus?.linked
                    ? `Linked to User: ${walletStatus.wallet?.user_id} (${walletStatus.wallet?.organization_id})`
                    : "Connected in MetaMask. Signature required to link organizational identity."
                  : "Connect MetaMask browser extension to submit on-chain anchors and approvals."}
              </p>
            </div>
          </div>
          <div>
            <button
              onClick={() => onNavigate("wallets")}
              className="btn btn-secondary text-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              <span>Manage Wallet Authorization</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Section: Recent Ledger Events & Tracked Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Blockchain Events */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-navy-700 pb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-accent-400" />
              On-Chain Governance Events
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {events.length} Recent Logs
            </span>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-sm">No smart contract events indexed yet.</p>
              <p className="text-xs text-slate-500 mt-1">
                Events will appear here as plans are anchored and approved.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {events.map((evt, idx) => (
                <div
                  key={`${evt.tx_hash}-${evt.log_index}-${idx}`}
                  className="bg-navy-900/70 border border-navy-700/80 rounded-lg p-3 hover:border-navy-600 transition-colors text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-accent-400 font-mono">
                      {evt.event_name}
                    </span>
                    <span className="text-slate-400 font-mono">
                      Block #{evt.block_number}
                    </span>
                  </div>
                  {evt.plan_id && (
                    <div className="text-slate-300 font-mono text-[11px] mb-1">
                      Plan ID: <span className="text-white font-semibold">{evt.plan_id}</span>
                      {evt.plan_version && ` (v${evt.plan_version})`}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-slate-400 font-mono text-[10px]">
                    <span className="truncate max-w-[200px]" title={evt.wallet_address || ""}>
                      Actor: {evt.wallet_address || "—"}
                    </span>
                    <span className="truncate max-w-[150px]" title={evt.tx_hash}>
                      Tx: {evt.tx_hash.slice(0, 10)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tracked Transaction Queue */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-navy-700 pb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-400" />
              Transaction Settlement Pipeline
            </h3>
            <button
              onClick={() => onNavigate("transactions")}
              className="text-xs text-accent-400 hover:text-accent-300 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-500" />
              <p className="text-sm">No transactions registered in tracking queue.</p>
              <p className="text-xs text-slate-500 mt-1">
                Submissions via MetaMask will be tracked here through confirmation.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {transactions.map((tx) => {
                const isConfirmed = tx.status === "CONFIRMED";
                const isFailed = tx.status === "FAILED";
                const isPending =
                  tx.status === "PENDING" || tx.status === "SUBMITTED" || tx.status === "INCLUDED";
                const explorerUrl = getExplorerTxUrl(tx.chain_id, tx.tx_hash);

                return (
                  <div
                    key={tx.tx_hash}
                    className="bg-navy-900/70 border border-navy-700/80 rounded-lg p-3 hover:border-navy-600 transition-colors text-xs"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
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
                        <span className="font-semibold text-white">
                          {tx.function_name || "Smart Contract Call"}
                        </span>
                      </div>
                      <span className="text-[11px] text-accent-400 font-mono font-bold">
                        {tx.confirmations} Conf
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-400 font-mono text-[11px]">
                      <span className="truncate max-w-[220px]" title={tx.tx_hash}>
                        {tx.tx_hash}
                      </span>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-400 hover:text-accent-300 inline-flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
