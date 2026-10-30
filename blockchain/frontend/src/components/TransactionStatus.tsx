import React from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  X,
  AlertCircle,
  Clock,
} from "lucide-react";
import { TrackedTransaction } from "../types/blockchain";
import { getExplorerTxUrl } from "../services/wallet";

interface TransactionStatusProps {
  transaction: TrackedTransaction | null;
  onDismiss: () => void;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  transaction,
  onDismiss,
}) => {
  if (!transaction) return null;

  const isPending =
    transaction.status === "SUBMITTED" ||
    transaction.status === "PENDING" ||
    transaction.status === "INCLUDED";
  const isConfirmed = transaction.status === "CONFIRMED";
  const isFailed = transaction.status === "FAILED";

  const explorerUrl = getExplorerTxUrl(
    transaction.chain_id,
    transaction.tx_hash
  );

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-navy-800 border-2 border-navy-600 rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {isPending && <Loader2 className="w-5 h-5 text-accent-400 animate-spin" />}
          {isConfirmed && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {isFailed && <XCircle className="w-5 h-5 text-rose-400" />}
          <h4 className="font-semibold text-sm text-white">
            {transaction.function_name
              ? `Contract Call: ${transaction.function_name}`
              : "Blockchain Transaction"}
          </h4>
        </div>
        <button
          onClick={onDismiss}
          className="text-slate-400 hover:text-white transition-colors"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-300 mb-3">
        {isPending && "Transaction submitted to network. Awaiting block inclusion and confirmations..."}
        {isConfirmed && "Transaction successfully confirmed on the ledger!"}
        {isFailed && (transaction.error_message || "Transaction reverted or failed execution on-chain.")}
      </p>

      <div className="space-y-1.5 bg-navy-900/90 rounded-lg p-2.5 text-xs font-mono border border-navy-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Tx Hash:</span>
          <span className="text-slate-200 truncate max-w-[200px]" title={transaction.tx_hash}>
            {transaction.tx_hash}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Status:</span>
          <span
            className={`badge text-[10px] py-0.5 px-2 ${
              isConfirmed
                ? "badge-success"
                : isFailed
                ? "badge-danger"
                : "badge-warning"
            }`}
          >
            {transaction.status}
          </span>
        </div>

        {transaction.block_number && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Block:</span>
            <span className="text-slate-200">{transaction.block_number}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="text-slate-400">Confirmations:</span>
          <span className="text-accent-400 font-bold">
            {transaction.confirmations}
          </span>
        </div>

        {transaction.plan_id && (
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Plan Ref:</span>
            <span className="text-slate-300">
              {transaction.plan_id} (v{transaction.plan_version})
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between pt-2 border-t border-navy-700 text-xs">
        <span className="text-slate-400">
          Chain ID: <code className="text-slate-200">{transaction.chain_id}</code>
        </span>
        {explorerUrl ? (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent-400 hover:text-accent-300 transition-colors font-medium"
          >
            <span>View on Explorer</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <span className="text-slate-500 italic">Local Hardhat DevNet</span>
        )}
      </div>
    </div>
  );
};
