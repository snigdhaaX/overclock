import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  Lock,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import { VerificationReport, VerificationStatus } from "../types/blockchain";
import { verifyRecoveryPlan } from "../services/api";
import { HashComparison } from "../components/HashComparison";

export const VerificationCentre: React.FC = () => {
  const [planIdInput, setPlanIdInput] = useState<string>("REC-PLAN-2026-001");
  const [versionInput, setVersionInput] = useState<number>(1);
  const [report, setReport] = useState<VerificationReport | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!planIdInput.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await verifyRecoveryPlan(planIdInput.trim(), versionInput);
      setReport(res);
    } catch (err: any) {
      setError(err?.message || "Failed to execute plan verification call.");
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case "VERIFIED":
        return (
          <span className="badge badge-success flex items-center gap-1.5 py-1 px-3 text-xs">
            <CheckCircle2 className="w-4 h-4" />
            <span>VERIFIED INTEGRITY</span>
          </span>
        );
      case "HASH_MISMATCH":
        return (
          <span className="badge badge-danger flex items-center gap-1.5 py-1 px-3 text-xs">
            <XCircle className="w-4 h-4" />
            <span>HASH MISMATCH / TAMPER DETECTED</span>
          </span>
        );
      case "NOT_ANCHORED":
        return (
          <span className="badge badge-warning flex items-center gap-1.5 py-1 px-3 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>NOT ANCHORED ON-CHAIN</span>
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="badge badge-warning flex items-center gap-1.5 py-1 px-3 text-xs">
            <Clock className="w-4 h-4" />
            <span>SUPERSEDED BY NEWER VERSION</span>
          </span>
        );
      case "RPC_UNAVAILABLE":
        return (
          <span className="badge badge-danger flex items-center gap-1.5 py-1 px-3 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>RPC UNAVAILABLE</span>
          </span>
        );
      case "VERSION_NOT_FOUND":
        return (
          <span className="badge badge-neutral flex items-center gap-1.5 py-1 px-3 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>VERSION NOT FOUND</span>
          </span>
        );
      default:
        return (
          <span className="badge badge-warning flex items-center gap-1.5 py-1 px-3 text-xs">
            <Clock className="w-4 h-4" />
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Explanation Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            Blockchain Verification Centre
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Audit-grade cryptographic reconciliation between database records and immutable smart contract state.
          </p>
        </div>
      </div>

      {/* Verification Query Form */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-white text-sm flex items-center gap-2 border-b border-navy-700 pb-2">
          <Search className="w-4 h-4 text-accent-400" />
          Plan Integrity Audit Query
        </h3>

        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Recovery Plan Identifier
            </label>
            <input
              type="text"
              placeholder="e.g. REC-PLAN-2026-001"
              value={planIdInput}
              onChange={(e) => setPlanIdInput(e.target.value)}
              className="input font-mono text-xs w-full"
            />
          </div>

          <div className="w-full sm:w-36">
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Version Number
            </label>
            <input
              type="number"
              min="1"
              value={versionInput}
              onChange={(e) => setVersionInput(parseInt(e.target.value) || 1)}
              className="input font-mono text-xs w-full"
            />
          </div>

          <div className="w-full sm:w-auto pt-5">
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary text-xs w-full sm:w-auto px-6 py-2.5 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Reconciling..." : "Run Cryptographic Verification"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Verification Error */}
      {error && (
        <div className="card border-rose-500/40 bg-rose-500/10 text-rose-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-semibold">Verification System Error: </span>
            {error}
          </div>
        </div>
      )}

      {/* Verification Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Main Status Header Card */}
          <div className="card border-navy-700 bg-navy-800/90 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-navy-700 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 uppercase font-semibold">
                    Verification Result:
                  </span>
                  {getStatusBadge(report.result)}
                </div>
                <h3 className="text-lg font-bold text-white font-mono mt-1">
                  {report.plan_id} (Version {report.version})
                </h3>
              </div>
              <div className="text-xs text-slate-400 font-mono text-right">
                <div>Audit Timestamp:</div>
                <div className="text-slate-300">
                  {new Date(report.verification_timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {/* Verdict Explanation */}
            <div className="text-xs text-slate-300 bg-navy-900/60 p-3.5 rounded-lg border border-navy-800 space-y-1">
              <span className="font-semibold text-accent-300">Auditor Findings: </span>
              <span>{report.details}</span>
            </div>

            {/* Verification Detail Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-2">
              <div className="bg-navy-900/80 p-3 rounded border border-navy-700/80">
                <span className="text-slate-400 block text-[11px]">Hash Equality:</span>
                <span
                  className={`font-bold ${
                    report.hashes_match ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {report.hashes_match ? "MATCH (100% Exact)" : "MISMATCH DETECTED"}
                </span>
              </div>

              <div className="bg-navy-900/80 p-3 rounded border border-navy-700/80">
                <span className="text-slate-400 block text-[11px]">Version Status:</span>
                <span className="text-white font-bold">
                  {report.is_current_version ? "LATEST CURRENT" : `SUPERSEDED (Latest: v${report.latest_on_chain_version || 1})`}
                </span>
              </div>

              <div className="bg-navy-900/80 p-3 rounded border border-navy-700/80">
                <span className="text-slate-400 block text-[11px]">On-Chain State:</span>
                <span className="text-accent-300 font-bold">
                  {report.on_chain_status || "UNRECORDED"}
                </span>
              </div>

              <div className="bg-navy-900/80 p-3 rounded border border-navy-700/80">
                <span className="text-slate-400 block text-[11px]">Execution Clearance:</span>
                <span
                  className={`font-bold ${
                    report.execution_eligible ? "text-emerald-400" : "text-slate-400"
                  }`}
                >
                  {report.execution_eligible ? "AUTHORIZED" : report.execution_eligibility_reason || "LOCKED"}
                </span>
              </div>
            </div>
          </div>

          {/* Cryptographic Comparison Component */}
          <HashComparison
            databaseHash={report.database_hash}
            onChainHash={report.on_chain_hash}
            executionEvidenceHash={report.execution_evidence_hash}
            hashesMatch={report.hashes_match}
            statusText={report.result}
          />
        </div>
      )}
    </div>
  );
};
