import React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  FileCheck2,
  ArrowDown,
  User,
  Hash,
} from "lucide-react";
import { OnChainPlanVersion, PlanDecision } from "../types/blockchain";

interface ApprovalTimelineProps {
  planVersion: OnChainPlanVersion | null;
  decisions: PlanDecision[];
  planId: string;
  version: number;
}

const STAGE_CONFIG: Record<
  number,
  { name: string; description: string; role: string }
> = {
  0x01: {
    name: "Supply Chain Manager Approval",
    description: "Evaluates operational feasibility and initial disruption response.",
    role: "Supply Chain Manager",
  },
  0x02: {
    name: "Warehouse Approver",
    description: "Authorizes inventory reallocation and stock movements.",
    role: "Warehouse Operations",
  },
  0x04: {
    name: "Procurement Approver",
    description: "Authorizes purchase orders, alternative vendors, and spot rates.",
    role: "Procurement Operations",
  },
  0x08: {
    name: "Administrator Approval",
    description: "Executive and governance compliance oversight.",
    role: "System Administrator",
  },
};

export const ApprovalTimeline: React.FC<ApprovalTimelineProps> = ({
  planVersion,
  decisions,
  planId,
  version,
}) => {
  if (!planVersion) {
    return (
      <div className="card text-center p-8 text-slate-400">
        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No plan version selected or plan is not anchored on-chain.</p>
      </div>
    );
  }

  const requiredStages = planVersion.required_stages || 0;
  const completedStages = planVersion.completed_stages || 0;

  // Extract individual required stages from bitmask
  const stageKeys = [0x01, 0x02, 0x04, 0x08].filter(
    (mask) => (requiredStages & mask) !== 0
  );

  const isExecuted =
    planVersion.status === "EXECUTED" ||
    (planVersion.execution_evidence_hash &&
      planVersion.execution_evidence_hash !==
        "0x0000000000000000000000000000000000000000000000000000000000000000");

  const isAllApproved =
    requiredStages > 0 && (completedStages & requiredStages) === requiredStages;

  const isRejected = planVersion.status === "REJECTED";
  const isRevisionRequested = planVersion.status === "REVISION_REQUESTED";

  return (
    <div className="card space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-navy-700 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-accent-500" />
            Governance Lifecycle & Approval Timeline
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic stage verification based on on-chain required stage snapshot (Mask:{" "}
            <code className="text-accent-400">0x{requiredStages.toString(16).padStart(2, "0")}</code>)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`badge ${
              isExecuted
                ? "badge-info"
                : isRejected
                ? "badge-danger"
                : isRevisionRequested
                ? "badge-warning"
                : isAllApproved
                ? "badge-success"
                : "badge-warning"
            }`}
          >
            {planVersion.status}
          </span>
          <span className="text-xs text-slate-400">
            Stages: {completedStages.toString(2).split("1").length - 1} /{" "}
            {requiredStages.toString(2).split("1").length - 1} Completed
          </span>
        </div>
      </div>

      <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-navy-700">
        {/* Step 1: Plan Anchored */}
        <div className="relative flex items-start gap-4">
          <div className="absolute -left-6 mt-0.5 w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 text-xs">
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <div className="flex-1 bg-navy-800/80 border border-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">
                1. Plan Anchored on Ledger
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {planVersion.anchored_at
                  ? new Date(planVersion.anchored_at * 1000).toLocaleString()
                  : "Recorded"}
              </span>
            </div>
            <p className="text-xs text-slate-300 mb-2">
              Canonical plan hash was anchored by the plan creator.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono bg-navy-900/60 p-2 rounded border border-navy-800">
              <div className="truncate">
                <span className="text-slate-500">Creator: </span>
                <span className="text-slate-300">{planVersion.creator}</span>
              </div>
              <div className="truncate">
                <span className="text-slate-500">Plan Hash: </span>
                <span className="text-slate-300">{planVersion.plan_hash}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Required Stages */}
        {stageKeys.map((stageMask, idx) => {
          const config = STAGE_CONFIG[stageMask] || {
            name: `Stage 0x${stageMask.toString(16)}`,
            description: "Required governance checkpoint",
            role: "Authorized Approver",
          };

          const isCompleted = (completedStages & stageMask) !== 0;
          const stageDecisions = decisions.filter((d) => d.stage === stageMask);
          const latestDecision = stageDecisions[stageDecisions.length - 1];

          let icon = <Clock className="w-3.5 h-3.5 text-amber-400" />;
          let circleClass = "bg-amber-500/20 border-amber-500 text-amber-400";
          let badge = <span className="badge badge-warning">PENDING</span>;

          if (isCompleted) {
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
            circleClass = "bg-emerald-500/20 border-emerald-500 text-emerald-400";
            badge = <span className="badge badge-success">APPROVED</span>;
          } else if (isRejected) {
            icon = <XCircle className="w-3.5 h-3.5 text-rose-400" />;
            circleClass = "bg-rose-500/20 border-rose-500 text-rose-400";
            badge = <span className="badge badge-danger">BLOCKED / REJECTED</span>;
          } else if (isRevisionRequested) {
            icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
            circleClass = "bg-amber-500/20 border-amber-500 text-amber-400";
            badge = <span className="badge badge-warning">REVISION REQUESTED</span>;
          }

          return (
            <div key={stageMask} className="relative flex items-start gap-4">
              <div
                className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${circleClass}`}
              >
                {icon}
              </div>
              <div className="flex-1 bg-navy-800/80 border border-navy-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {idx + 2}. {config.name}
                    </span>
                    {badge}
                  </div>
                  {latestDecision && (
                    <span className="text-xs text-slate-400 font-mono">
                      {new Date(latestDecision.timestamp * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mb-2">{config.description}</p>

                {latestDecision ? (
                  <div className="space-y-1 bg-navy-900/60 p-2.5 rounded border border-navy-800 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <div className="flex items-center gap-1.5 font-mono truncate">
                        <User className="w-3.5 h-3.5 text-accent-400" />
                        <span>Approver: {latestDecision.actor}</span>
                      </div>
                      <span className="font-semibold text-accent-400">
                        Decision: {latestDecision.decision}
                      </span>
                    </div>
                    {latestDecision.reason_hash &&
                      latestDecision.reason_hash !==
                        "0x0000000000000000000000000000000000000000000000000000000000000000" && (
                        <div className="flex items-center gap-1.5 font-mono text-slate-400 truncate">
                          <Hash className="w-3.5 h-3.5 text-slate-500" />
                          <span>Reason Hash: {latestDecision.reason_hash}</span>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic bg-navy-900/40 p-2 rounded">
                    Awaiting decision by an authorized wallet with category: {config.role}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Step Final: Execution Authorization & Evidence */}
        <div className="relative flex items-start gap-4">
          <div
            className={`absolute -left-6 mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${
              isExecuted
                ? "bg-blue-500/20 border-blue-500 text-blue-400"
                : isAllApproved
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                : "bg-navy-900 border-navy-600 text-slate-600"
            }`}
          >
            {isExecuted ? (
              <ShieldCheck className="w-3.5 h-3.5" />
            ) : isAllApproved ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Clock className="w-3.5 h-3.5" />
            )}
          </div>
          <div className="flex-1 bg-navy-800/80 border border-navy-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">
                {stageKeys.length + 2}. Execution & Evidence Verification
              </span>
              <span
                className={`badge ${
                  isExecuted
                    ? "badge-info"
                    : isAllApproved
                    ? "badge-success"
                    : "badge-neutral"
                }`}
              >
                {isExecuted
                  ? "EXECUTED & EVIDENCE ANCHORED"
                  : isAllApproved
                  ? "EXECUTION ELIGIBLE"
                  : "NOT ELIGIBLE"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-2">
              Once all required approval stages are confirmed on-chain, operations are cleared to execute and post cryptographic execution evidence.
            </p>

            {isExecuted && (
              <div className="space-y-1 bg-navy-900/60 p-2.5 rounded border border-navy-800 text-xs font-mono">
                <div className="truncate text-slate-300">
                  <span className="text-slate-500">Evidence Hash: </span>
                  <span className="text-accent-300">
                    {planVersion.execution_evidence_hash}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="truncate">
                    Executed By: {planVersion.executed_by || "Recorded"}
                  </span>
                  <span>
                    {planVersion.executed_at
                      ? new Date(planVersion.executed_at * 1000).toLocaleString()
                      : ""}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
