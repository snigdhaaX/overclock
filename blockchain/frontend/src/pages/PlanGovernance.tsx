import React, { useState, useEffect } from "react";
import {
  FileCheck2,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
  Send,
  Layers,
  ArrowRight,
  User,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  OnChainPlanVersion,
  PlanDecision,
  ACTION_NAMES,
  CATEGORY_NAMES,
} from "../types/blockchain";
import {
  fetchPlanVersionDetails,
  fetchPlanDecisions,
  fetchPlanLatestVersion,
} from "../services/api";
import { ApprovalTimeline } from "../components/ApprovalTimeline";
import { useContract } from "../hooks/useContract";
import { useWallet } from "../hooks/useWallet";

interface ActionModalConfig {
  action: "ANCHOR" | "APPROVE" | "REJECT" | "REVISION" | "EXECUTE";
  title: string;
  stage?: number;
  stageName?: string;
}

export const PlanGovernance: React.FC = () => {
  const { account, chainId, walletStatus } = useWallet();
  const {
    isSubmitting,
    activeTx,
    error: contractError,
    anchorRecoveryPlan,
    approveRecoveryPlan,
    rejectRecoveryPlan,
    requestRevisionRecoveryPlan,
    anchorExecutionEvidence,
  } = useContract();

  // Search state
  const [searchPlanId, setSearchPlanId] = useState<string>("REC-PLAN-2026-001");
  const [searchVersion, setSearchVersion] = useState<number>(1);
  const [activePlanId, setActivePlanId] = useState<string>("REC-PLAN-2026-001");
  const [activeVersion, setActiveVersion] = useState<number>(1);

  // Loaded data state
  const [planData, setPlanData] = useState<OnChainPlanVersion | null>(null);
  const [decisions, setDecisions] = useState<PlanDecision[]>([]);
  const [latestVerNumber, setLatestVerNumber] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Transaction confirmation modal state
  const [modalConfig, setModalConfig] = useState<ActionModalConfig | null>(null);
  const [modalReason, setModalReason] = useState<string>("");

  // New Anchor inputs
  const [showAnchorForm, setShowAnchorForm] = useState<boolean>(false);
  const [newPlanId, setNewPlanId] = useState<string>("REC-PLAN-2026-002");
  const [newOrgId, setNewOrgId] = useState<string>("ORG-APEX-GLOBAL");
  const [newPlanHash, setNewPlanHash] = useState<string>("0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef");
  const [newSimHash, setNewSimHash] = useState<string>("0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890");
  const [newActionMask, setNewActionMask] = useState<number>(0x03);

  // Evidence input
  const [evidenceHashInput, setEvidenceHashInput] = useState<string>("0x5555555555555555555555555555555555555555555555555555555555555555");

  const loadPlan = async (id: string, ver: number) => {
    setLoading(true);
    setSearchError(null);
    try {
      const [verDetails, decs, latest] = await Promise.all([
        fetchPlanVersionDetails(id, ver),
        fetchPlanDecisions(id, ver),
        fetchPlanLatestVersion(id).catch(() => ({ latest_version: null })),
      ]);
      setPlanData(verDetails);
      setDecisions(decs);
      setLatestVerNumber(latest?.latest_version ?? null);
      setActivePlanId(id);
      setActiveVersion(ver);
    } catch (err: any) {
      setSearchError(err?.message || "Failed to load on-chain plan version details.");
      setPlanData(null);
      setDecisions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlan(activePlanId, activeVersion);
  }, []);

  // When active transaction completes, refresh the plan state
  useEffect(() => {
    if (activeTx && activeTx.status === "CONFIRMED") {
      loadPlan(activePlanId, activeVersion);
    }
  }, [activeTx?.status]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchPlanId.trim()) return;
    loadPlan(searchPlanId.trim(), searchVersion);
  };

  // Check user authorization for governance actions
  const onChainCategories = walletStatus?.on_chain_authorization?.categories || 0;
  const isRegisteredSigner = !!walletStatus?.on_chain_authorization?.active;
  const isCreator =
    planData && account && planData.creator.toLowerCase() === account.toLowerCase();

  // Execution eligibility
  const requiredStages = planData?.required_stages || 0;
  const completedStages = planData?.completed_stages || 0;
  const isFullyApproved =
    requiredStages > 0 && (completedStages & requiredStages) === requiredStages;
  const isExecuted =
    planData?.status === "EXECUTED" ||
    (planData?.execution_evidence_hash &&
      planData?.execution_evidence_hash !==
        "0x0000000000000000000000000000000000000000000000000000000000000000");

  const handleConfirmAction = async () => {
    if (!modalConfig) return;
    const { action, stage } = modalConfig;

    try {
      if (action === "ANCHOR") {
        await anchorRecoveryPlan(
          newPlanId,
          newOrgId,
          newPlanHash,
          newSimHash,
          newActionMask
        );
        setShowAnchorForm(false);
        setActivePlanId(newPlanId);
        setActiveVersion(1);
      } else if (action === "APPROVE" && stage !== undefined) {
        await approveRecoveryPlan(activePlanId, activeVersion, stage);
      } else if (action === "REJECT" && stage !== undefined) {
        await rejectRecoveryPlan(activePlanId, activeVersion, stage, modalReason);
      } else if (action === "REVISION" && stage !== undefined) {
        await requestRevisionRecoveryPlan(activePlanId, activeVersion, stage, modalReason);
      } else if (action === "EXECUTE") {
        await anchorExecutionEvidence(activePlanId, activeVersion, evidenceHashInput);
      }
      setModalConfig(null);
      setModalReason("");
    } catch (err: any) {
      // Handled via contract hook error
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Recovery Plan Governance & Approvals
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Decentralized multi-stage governance, creator duty separation, and execution authorization.
          </p>
        </div>
        <div>
          <button
            onClick={() => setShowAnchorForm(!showAnchorForm)}
            className="btn btn-primary text-xs flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{showAnchorForm ? "Hide Anchor Form" : "Anchor New Recovery Plan"}</span>
          </button>
        </div>
      </div>

      {/* Global Contract/Hook Errors */}
      {contractError && (
        <div className="card border-rose-500/40 bg-rose-500/10 text-rose-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-sm">{contractError}</span>
        </div>
      )}

      {/* New Plan Anchor Form Drawer */}
      {showAnchorForm && (
        <div className="card bg-navy-800/90 border-accent-500/30 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-navy-700 pb-3">
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Send className="w-4 h-4 text-accent-400" />
              Anchor Disruption Recovery Plan (MetaMask Signed)
            </h3>
            <span className="badge badge-warning text-[10px]">CREATOR TRANSACTION</span>
          </div>
          <p className="text-xs text-slate-300">
            Anchors canonical SHA-256 fingerprints to the ledger. Your connected wallet will be recorded as the authoritative immutable plan creator.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Recovery Plan ID
              </label>
              <input
                type="text"
                value={newPlanId}
                onChange={(e) => setNewPlanId(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Organization ID
              </label>
              <input
                type="text"
                value={newOrgId}
                onChange={(e) => setNewOrgId(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Canonical Plan SHA-256 Hash (bytes32 hex)
              </label>
              <input
                type="text"
                value={newPlanHash}
                onChange={(e) => setNewPlanHash(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Digital Twin Simulation Hash (bytes32 hex)
              </label>
              <input
                type="text"
                value={newSimHash}
                onChange={(e) => setNewSimHash(e.target.value)}
                className="input font-mono text-xs"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <div className="text-xs text-slate-400">
              Action Bitmask: <code className="text-accent-400 font-mono">0x03</code> (Stock Transfer + Procurement)
            </div>
            <button
              onClick={() =>
                setModalConfig({
                  action: "ANCHOR",
                  title: "Confirm Recovery Plan Ledger Anchoring",
                })
              }
              disabled={isSubmitting || !account}
              className="btn btn-primary text-xs flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit Anchor Transaction</span>
            </button>
          </div>
        </div>
      )}

      {/* Plan Lookup Bar */}
      <form onSubmit={handleSearch} className="card p-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex-1 w-full flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Enter Recovery Plan ID (e.g. REC-PLAN-2026-001)"
              value={searchPlanId}
              onChange={(e) => setSearchPlanId(e.target.value)}
              className="input font-mono text-xs flex-1"
            />
          </div>
          <div className="w-full sm:w-32 flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold">Ver:</span>
            <input
              type="number"
              min="1"
              value={searchVersion}
              onChange={(e) => setSearchVersion(parseInt(e.target.value) || 1)}
              className="input font-mono text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary text-xs w-full sm:w-auto px-5"
          >
            {loading ? "Reading Ledger..." : "Lookup Plan"}
          </button>
        </div>
      </form>

      {/* Search Error Notice */}
      {searchError && (
        <div className="card border-rose-500/40 bg-rose-500/10 text-rose-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <div className="text-xs">
            <span className="font-semibold">Lookup Notice: </span>
            {searchError}
          </div>
        </div>
      )}

      {/* Plan Details & Governance Controls Grid */}
      {planData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Metadata & Creator Info */}
          <div className="space-y-6">
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-navy-700 pb-3">
                <h3 className="font-bold text-white text-base">Plan Metadata</h3>
                <span className="badge badge-info text-[10px]">
                  Version {activeVersion}
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400">Plan ID:</span>
                  <div className="font-mono text-white font-bold">{activePlanId}</div>
                </div>

                <div>
                  <span className="text-slate-400">Organization:</span>
                  <div className="font-mono text-slate-200">{planData.org_id}</div>
                </div>

                <div>
                  <span className="text-slate-400">Creator Wallet:</span>
                  <div className="font-mono text-slate-300 truncate" title={planData.creator}>
                    {planData.creator}
                  </div>
                  {isCreator && (
                    <span className="badge badge-warning text-[9px] mt-1">
                      YOU ARE CREATOR (Blocked from Approving)
                    </span>
                  )}
                </div>

                <div>
                  <span className="text-slate-400">Anchored Timestamp:</span>
                  <div className="text-slate-300 font-mono">
                    {new Date(planData.anchored_at * 1000).toLocaleString()}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Canonical Plan Hash:</span>
                  <div className="font-mono text-[11px] text-slate-300 break-all bg-navy-900/80 p-2 rounded border border-navy-700">
                    {planData.plan_hash}
                  </div>
                </div>

                <div>
                  <span className="text-slate-400">Simulation Validation Hash:</span>
                  <div className="font-mono text-[11px] text-slate-300 break-all bg-navy-900/80 p-2 rounded border border-navy-700">
                    {planData.simulation_hash}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Clearance Box */}
            <div className="card space-y-3">
              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-accent-400" />
                Execution Evidence Anchoring
              </h4>

              {isExecuted ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded text-xs text-emerald-300 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Evidence Anchored on Ledger</span>
                  </div>
                  <div className="font-mono text-[11px] break-all">
                    {planData.execution_evidence_hash}
                  </div>
                </div>
              ) : isFullyApproved ? (
                <div className="space-y-3">
                  <p className="text-xs text-emerald-300">
                    All governance checkpoints satisfied! Supply chain operators may anchor execution proof.
                  </p>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Evidence Hash</label>
                    <input
                      type="text"
                      value={evidenceHashInput}
                      onChange={(e) => setEvidenceHashInput(e.target.value)}
                      className="input font-mono text-xs"
                    />
                  </div>
                  <button
                    onClick={() =>
                      setModalConfig({
                        action: "EXECUTE",
                        title: "Confirm Execution Evidence Anchoring",
                      })
                    }
                    disabled={isSubmitting}
                    className="btn btn-primary text-xs w-full"
                  >
                    Anchor Execution Evidence
                  </button>
                </div>
              ) : (
                <div className="bg-navy-900/60 p-3 rounded text-xs text-slate-400">
                  Plan approvals are still pending. Evidence anchoring is locked until all required stages complete.
                </div>
              )}
            </div>
          </div>

          {/* Right Two Columns: Timeline & Interactive Approval Buttons */}
          <div className="lg:col-span-2 space-y-6">
            <ApprovalTimeline
              planVersion={planData}
              decisions={decisions}
              planId={activePlanId}
              version={activeVersion}
            />

            {/* Stage Decision Actions Panel */}
            <div className="card space-y-4">
              <div className="flex items-center justify-between border-b border-navy-700 pb-3">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-accent-400" />
                  Authorized Governance Controls
                </h4>
                <span className="text-xs text-slate-400">
                  MetaMask will prompt for cryptographic confirmation
                </span>
              </div>

              {/* Dynamic Action Buttons per Stage */}
              <div className="space-y-3">
                {[0x01, 0x02, 0x04, 0x08].map((stageMask) => {
                  const isStageRequired = (requiredStages & stageMask) !== 0;
                  if (!isStageRequired) return null;

                  const isStageDone = (completedStages & stageMask) !== 0;
                  const hasCategory = (onChainCategories & stageMask) !== 0;
                  const canDecide =
                    hasCategory &&
                    !isCreator &&
                    isRegisteredSigner &&
                    !isStageDone &&
                    planData.status === "PENDING_APPROVAL";

                  const stageName =
                    stageMask === 0x01
                      ? "Supply Chain Manager"
                      : stageMask === 0x02
                      ? "Warehouse Approver"
                      : stageMask === 0x04
                      ? "Procurement Approver"
                      : "Administrator";

                  return (
                    <div
                      key={stageMask}
                      className="bg-navy-900/80 border border-navy-700/80 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-xs">
                            {stageName}
                          </span>
                          {isStageDone ? (
                            <span className="badge badge-success text-[10px]">DONE</span>
                          ) : (
                            <span className="badge badge-warning text-[10px]">AWAITING</span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Requires role category: <code className="text-accent-400">0x0{stageMask}</code>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {canDecide ? (
                          <>
                            <button
                              onClick={() =>
                                setModalConfig({
                                  action: "APPROVE",
                                  title: `Approve Stage: ${stageName}`,
                                  stage: stageMask,
                                  stageName,
                                })
                              }
                              disabled={isSubmitting}
                              className="btn btn-primary text-xs py-1 px-3"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setModalConfig({
                                  action: "REVISION",
                                  title: `Request Revision: ${stageName}`,
                                  stage: stageMask,
                                  stageName,
                                })
                              }
                              disabled={isSubmitting}
                              className="btn btn-secondary text-xs py-1 px-2.5 text-amber-400 border-amber-500/50"
                            >
                              Revision
                            </button>
                            <button
                              onClick={() =>
                                setModalConfig({
                                  action: "REJECT",
                                  title: `Reject Plan: ${stageName}`,
                                  stage: stageMask,
                                  stageName,
                                })
                              }
                              disabled={isSubmitting}
                              className="btn btn-secondary text-xs py-1 px-2.5 text-rose-400 border-rose-500/50"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-500 italic">
                            {isStageDone
                              ? "Stage Already Approved"
                              : isCreator
                              ? "Creator Cannot Self-Approve"
                              : !hasCategory
                              ? "Wallet Lacks Stage Category"
                              : "Actions Unavailable"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal Before Wallet Submission */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-navy-800 border-2 border-navy-600 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-navy-700 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Info className="w-5 h-5 text-accent-400" />
                {modalConfig.title}
              </h3>
              <button
                onClick={() => setModalConfig(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              You are about to submit an on-chain transaction. MetaMask will prompt you to review gas fees and sign the smart contract call.
            </p>

            <div className="bg-navy-900/90 rounded p-3 text-xs font-mono space-y-1.5 border border-navy-700">
              <div className="flex justify-between">
                <span className="text-slate-400">Operation:</span>
                <span className="text-accent-400 font-bold">{modalConfig.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan ID:</span>
                <span className="text-white">{activePlanId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan Version:</span>
                <span className="text-white">v{activeVersion}</span>
              </div>
              {modalConfig.stageName && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Approval Stage:</span>
                  <span className="text-white">{modalConfig.stageName}</span>
                </div>
              )}
            </div>

            {(modalConfig.action === "REJECT" || modalConfig.action === "REVISION") && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Reason for Governance Decision (Hashed On-Chain)
                </label>
                <textarea
                  rows={2}
                  value={modalReason}
                  onChange={(e) => setModalReason(e.target.value)}
                  placeholder="Provide explicit operational or inventory rationale..."
                  className="input font-mono text-xs w-full"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-navy-700">
              <button
                onClick={() => setModalConfig(null)}
                className="btn btn-secondary text-xs"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isSubmitting}
                className="btn btn-primary text-xs flex items-center gap-1.5"
              >
                <span>Confirm & Sign in MetaMask</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
