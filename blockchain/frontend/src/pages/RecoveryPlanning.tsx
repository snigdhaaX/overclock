import React, { useEffect, useState } from "react";
import {
  Compass,
  AlertTriangle,
  Sliders,
  FileCheck2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Hash,
  ArrowRight,
  Clock,
  DollarSign,
  TrendingDown,
  Layers,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";
import { api } from "../services/api";
import {
  Disruption,
  DisruptionImpact,
  RecoveryRecommendation,
  SimulationResult,
  RecoveryPlanDataContract,
} from "../types/supplyChain";

interface RecoveryPlanningProps {
  initialIncidentCode?: string;
  onNavigateToGovernance?: (planId: string) => void;
}

export const RecoveryPlanning: React.FC<RecoveryPlanningProps> = ({
  initialIncidentCode,
  onNavigateToGovernance,
}) => {
  // Wizard state steps: 1 to 5
  // Step 1: Select Disruption
  // Step 2: Impact Analysis & Generate Candidates
  // Step 3: Candidate Selection & Simulation
  // Step 4: Draft Recovery Plan Generation
  // Step 5: Canonical Hash Verification & Governance Submission
  const [currentStep, setCurrentStep] = useState<number>(1);

  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [impactData, setImpactData] = useState<DisruptionImpact | null>(null);
  const [recommendations, setRecommendations] = useState<RecoveryRecommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<RecoveryRecommendation | null>(null);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [generatedPlan, setGeneratedPlan] = useState<RecoveryPlanDataContract | null>(null);

  // Canonical Hash Inspection & Verification
  const [canonicalPayload, setCanonicalPayload] = useState<string>("");
  const [hashVerificationStatus, setHashVerificationStatus] = useState<"IDLE" | "VERIFIED" | "MISMATCH">("IDLE");
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  // Loaders & errors
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDisruptions = async () => {
      try {
        setLoading(true);
        const data = await api.getActiveDisruptions();
        setDisruptions(data);
        if (data.length > 0) {
          const initial = initialIncidentCode
            ? data.find((d) => d.incident_code === initialIncidentCode) || data[0]
            : data[0];
          setSelectedDisruption(initial);
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load active disruptions.");
      } finally {
        setLoading(false);
      }
    };
    fetchDisruptions();
  }, [initialIncidentCode]);

  // Step 2 Action: Run Impact & Fetch Recommendations
  const handleRunImpactAndRecs = async () => {
    if (!selectedDisruption) return;
    try {
      setLoading(true);
      setError(null);
      const [impact, recs] = await Promise.all([
        api.getDisruptionImpact(selectedDisruption.id),
        api.getRecoveryRecommendations(selectedDisruption.id),
      ]);
      setImpactData(impact);
      setRecommendations(recs);
      const firstFeasible = recs.find((r) => r.feasibility_status === "FEASIBLE") || recs[0];
      setSelectedRecommendation(firstFeasible);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err?.message || "Failed to analyze impact.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3 Action: Run Simulation for Selected Candidate
  const handleSimulateCandidate = async (rec: RecoveryRecommendation) => {
    if (!selectedDisruption) return;
    try {
      setLoading(true);
      setError(null);
      setSelectedRecommendation(rec);
      const sim = await api.evaluateSimulation({
        disruption_id: selectedDisruption.id,
        incident_code: selectedDisruption.incident_code,
        candidate_recommendations: [rec],
      });
      setSimulationResult(sim);
      setCurrentStep(3);
    } catch (err: any) {
      setError(err?.message || "Failed to simulate candidate.");
    } finally {
      setLoading(false);
    }
  };

  // Step 4 Action: Generate Draft Recovery Plan
  const handleGenerateDraftPlan = async () => {
    if (!selectedDisruption || !selectedRecommendation || !simulationResult) return;
    try {
      setLoading(true);
      setError(null);
      const draft = await api.generateRecoveryPlan({
        incident_id: selectedDisruption.incident_code,
        action_type: selectedRecommendation.action_type,
        proposed_actions: [selectedRecommendation.proposed_action],
        affected_shipments: selectedRecommendation.affected_shipments,
        affected_orders: selectedRecommendation.affected_orders,
        estimated_recovery_time_hours: selectedRecommendation.estimated_recovery_time_hours,
        recovery_cost_usd: selectedRecommendation.estimated_cost_usd,
        simulation_results: simulationResult,
        assumptions: selectedRecommendation.assumptions,
      });

      setGeneratedPlan(draft);

      // Load canonical JSON payload from hash service
      const hashRes = await api.generateCanonicalHash({
        organization_id: draft.organization_id,
        incident_id: draft.incident_id,
        plan_id: draft.plan_id,
        version: draft.version,
        action_mask: draft.action_mask,
        recovery_cost_usd: draft.recovery_cost_usd.toString(),
        estimated_recovery_time_hours: draft.estimated_recovery_time_hours,
        simulation_hash: draft.simulation_hash,
      });

      setCanonicalPayload(hashRes.canonical_json);
      setHashVerificationStatus("IDLE");
      setCurrentStep(4);
    } catch (err: any) {
      setError(err?.message || "Failed to generate draft recovery plan.");
    } finally {
      setLoading(false);
    }
  };

  // Step 5: Verify Canonical Hash
  const handleVerifyCanonicalHash = async () => {
    if (!generatedPlan) return;
    try {
      const dataToVerify = {
        organization_id: generatedPlan.organization_id,
        incident_id: generatedPlan.incident_id,
        plan_id: generatedPlan.plan_id,
        version: generatedPlan.version,
        action_mask: generatedPlan.action_mask,
        recovery_cost_usd: generatedPlan.recovery_cost_usd.toString(),
        estimated_recovery_time_hours: generatedPlan.estimated_recovery_time_hours,
        simulation_hash: generatedPlan.simulation_hash,
      };

      const res = await api.verifyPlanHash(dataToVerify, generatedPlan.canonical_plan_hash);
      if (res.valid) {
        setHashVerificationStatus("VERIFIED");
      } else {
        setHashVerificationStatus("MISMATCH");
      }
    } catch {
      setHashVerificationStatus("MISMATCH");
    }
  };

  const copyHash = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          AI Recovery Planning & Decision Workspace
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Constraint-checked operational mitigation synthesis, baseline comparative simulation, and RFC 8785 hash verification.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Stepper Progress Bar */}
      <div className="p-4 rounded-lg bg-navy-900 border border-slate-800">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className={`flex items-center gap-2 ${currentStep >= 1 ? "text-orange-400 font-bold" : "text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 text-[11px] border border-slate-700">1</span>
            <span>Incident</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
          <div className={`flex items-center gap-2 ${currentStep >= 2 ? "text-orange-400 font-bold" : "text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 text-[11px] border border-slate-700">2</span>
            <span>Candidates</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
          <div className={`flex items-center gap-2 ${currentStep >= 3 ? "text-orange-400 font-bold" : "text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 text-[11px] border border-slate-700">3</span>
            <span>Simulation</span>
          </div>
          <ChevronRight size={14} className="text-slate-400" />
          <div className={`flex items-center gap-2 ${currentStep >= 4 ? "text-orange-400 font-bold" : "text-slate-400"}`}>
            <span className="w-5 h-5 rounded-full flex items-center justify-center bg-slate-800 text-[11px] border border-slate-700">4</span>
            <span>Draft Plan & Hash</span>
          </div>
        </div>
      </div>

      {/* STEP 1: SELECT INCIDENT */}
      {currentStep === 1 && (
        <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-4">
          <div className="text-sm font-bold uppercase tracking-wider text-slate-300">
            Step 1: Select Active Disruption Incident
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {disruptions.map((d) => (
              <div
                key={d.id}
                onClick={() => setSelectedDisruption(d)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedDisruption?.id === d.id
                    ? "bg-navy-800 border-orange-500 shadow-md"
                    : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-white">{d.incident_code}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-500/20 text-rose-400">
                    {d.severity}
                  </span>
                </div>
                <div className="text-xs text-slate-300 font-sans mt-2">{d.description}</div>
                <div className="mt-3 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                  <span>Corridor: {d.geographic_region}</span>
                  <span className="text-amber-400 font-bold">+{d.estimated_delay_hours}h delay</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleRunImpactAndRecs}
              disabled={loading || !selectedDisruption}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-sm"
            >
              <span>{loading ? "Analyzing..." : "Analyze Impact & Candidates"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: REVIEW CANDIDATES & CHOOSE STRATEGY */}
      {currentStep === 2 && (
        <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Step 2: Candidate Recovery Actions ({selectedDisruption?.incident_code})
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Select a feasible recovery strategy to evaluate against the unmitigated baseline.
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-xs text-slate-400 hover:text-white underline font-mono"
            >
              Back to incident
            </button>
          </div>

          <div className="space-y-3">
            {recommendations.map((rec) => {
              const isFeasible = rec.feasibility_status === "FEASIBLE";
              const isSelected = selectedRecommendation?.recommendation_id === rec.recommendation_id;
              return (
                <div
                  key={rec.recommendation_id}
                  onClick={() => isFeasible && setSelectedRecommendation(rec)}
                  className={`p-4 rounded-lg border transition-all ${
                    !isFeasible
                      ? "bg-rose-950/20 border-rose-900/40 opacity-70 cursor-not-allowed"
                      : isSelected
                      ? "bg-navy-800 border-orange-500 shadow-md cursor-pointer"
                      : "bg-slate-900/60 border-slate-800 hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {rec.action_type}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                          Mask: 0x0{rec.action_mask.toString(16)}
                        </span>
                        {isFeasible ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                            FEASIBLE
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                            INFEASIBLE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 font-sans pt-1">
                        {rec.proposed_action}
                      </p>
                    </div>

                    {isFeasible && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSimulateCandidate(rec);
                        }}
                        className="px-3 py-1.5 rounded text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors flex-shrink-0"
                      >
                        Simulate Option
                      </button>
                    )}
                  </div>

                  {isFeasible ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 font-mono text-xs mt-2">
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase">Est. Cost</span>
                        <span className="font-bold text-white">${rec.estimated_cost_usd.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase">Delay Saved</span>
                        <span className="font-bold text-emerald-400">+{rec.expected_delay_reduction_hours}h</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase">Net Benefit</span>
                        <span className="font-bold text-orange-400">${rec.net_financial_benefit_usd.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block uppercase">Risk</span>
                        <span className="font-bold text-slate-300">{rec.operational_risk}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-mono mt-2">
                      <span className="font-bold">Rejection Reason:</span> {rec.feasibility_reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: SIMULATION COMPARISON */}
      {currentStep === 3 && simulationResult && (
        <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Step 3: Comparative Simulation Matrix
              </div>
              <div className="text-xs text-slate-400 mt-1 font-mono">
                Simulation ID: {simulationResult.simulation_id} | Hash: {simulationResult.simulation_hash.substring(0, 16)}...
              </div>
            </div>
            <button
              onClick={() => setCurrentStep(2)}
              className="text-xs text-slate-400 hover:text-white underline font-mono"
            >
              Change candidate
            </button>
          </div>

          {/* Metric Comparison Table */}
          <div className="rounded border border-slate-800 overflow-hidden">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                <tr>
                  <th className="p-3">Evaluation Metric</th>
                  <th className="p-3">Baseline (Unmitigated)</th>
                  <th className="p-3">Proposed Recovery Option</th>
                  <th className="p-3">Net Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 font-mono">
                <tr>
                  <td className="p-3 font-sans font-semibold text-slate-200">Expected Delay</td>
                  <td className="p-3 text-rose-400 font-bold">
                    {simulationResult.baseline_scenario.delay_hours} hours
                  </td>
                  <td className="p-3 text-emerald-400 font-bold">
                    {selectedRecommendation?.estimated_recovery_time_hours} hours
                  </td>
                  <td className="p-3 text-emerald-400 font-bold">
                    -{selectedRecommendation ? selectedRecommendation.expected_delay_reduction_hours : 0}h saved
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-sans font-semibold text-slate-200">Customer SLA Penalty</td>
                  <td className="p-3 text-rose-400 font-bold">
                    ${simulationResult.baseline_scenario.sla_financial_penalty_usd.toLocaleString()}
                  </td>
                  <td className="p-3 text-emerald-400 font-bold">
                    ${(
                      simulationResult.baseline_scenario.sla_financial_penalty_usd -
                      (selectedRecommendation?.sla_penalty_saved_usd || 0)
                    ).toLocaleString()}
                  </td>
                  <td className="p-3 text-emerald-400 font-bold">
                    -${selectedRecommendation?.sla_penalty_saved_usd.toLocaleString()} avoided
                  </td>
                </tr>
                <tr>
                  <td className="p-3 font-sans font-semibold text-slate-200">Direct Logistical Cost</td>
                  <td className="p-3">$0.00</td>
                  <td className="p-3 text-white font-bold">
                    ${selectedRecommendation?.estimated_cost_usd.toLocaleString()}
                  </td>
                  <td className="p-3 text-amber-400">
                    +${selectedRecommendation?.estimated_cost_usd.toLocaleString()} investment
                  </td>
                </tr>
                <tr className="bg-slate-800/30">
                  <td className="p-3 font-sans font-bold text-white">Total Financial Impact</td>
                  <td className="p-3 font-bold text-rose-400">
                    ${simulationResult.baseline_scenario.sla_financial_penalty_usd.toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-white">
                    ${(
                      (selectedRecommendation?.estimated_cost_usd || 0) +
                      (simulationResult.baseline_scenario.sla_financial_penalty_usd -
                        (selectedRecommendation?.sla_penalty_saved_usd || 0))
                    ).toLocaleString()}
                  </td>
                  <td className="p-3 font-bold text-emerald-400">
                    ${selectedRecommendation?.net_financial_benefit_usd.toLocaleString()} Net Benefit
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleGenerateDraftPlan}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-sm"
            >
              <span>{loading ? "Generating Plan..." : "Generate Authoritative Draft Plan"}</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: DRAFT PLAN REVIEW & HASH VERIFICATION */}
      {currentStep === 4 && generatedPlan && (
        <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Step 4: Authoritative Operational Plan Review
              </div>
              <div className="font-mono text-base font-bold text-white mt-1">
                Plan ID: {generatedPlan.plan_id} (Version {generatedPlan.version})
              </div>
            </div>
            <span className="px-2.5 py-1 rounded text-xs font-bold uppercase font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
              STATUS: {generatedPlan.status}
            </span>
          </div>

          {/* Plan Metadata Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded bg-slate-800/30 border border-slate-700/60 font-mono text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Organization</span>
              <span className="font-bold text-white">{generatedPlan.organization_id}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Action Mask</span>
              <span className="font-bold text-orange-400">0x0{generatedPlan.action_mask.toString(16)}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Est. Cost</span>
              <span className="font-bold text-white">${generatedPlan.recovery_cost_usd.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block uppercase">Recovery Transit</span>
              <span className="font-bold text-emerald-400">{generatedPlan.estimated_recovery_time_hours} hours</span>
            </div>
          </div>

          {/* Cryptographic Digests */}
          <div className="space-y-3 p-4 rounded bg-slate-900 border border-slate-800 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[10px] uppercase font-bold">
                Canonical SHA-256 Plan Hash (RFC 8785)
              </span>
              <button
                onClick={() => copyHash(generatedPlan.canonical_plan_hash)}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
              >
                {copiedHash ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>Copy</span>
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 break-all select-all">
              {generatedPlan.canonical_plan_hash}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold">
                Simulation Hash
              </span>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-slate-200 break-all select-all">
              {generatedPlan.simulation_hash}
            </div>
          </div>

          {/* Canonical Payload Inspection */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Inspect Canonical JSON Payload
            </div>
            <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-[11px] font-mono text-emerald-400/90 overflow-x-auto max-h-48">
              {canonicalPayload}
            </pre>
          </div>

          {/* Verification Action */}
          <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-white">Cryptographic Hash Verification</div>
              <div className="text-[11px] text-slate-400">
                Audits normalized payload against computed SHA-256 digest to ensure zero tamper risk.
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hashVerificationStatus === "VERIFIED" && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400">
                  <CheckCircle2 size={16} />
                  Hash Verified
                </span>
              )}
              {hashVerificationStatus === "MISMATCH" && (
                <span className="flex items-center gap-1 text-xs font-bold text-rose-400">
                  <XCircle size={16} />
                  Hash Mismatch!
                </span>
              )}
              <button
                onClick={handleVerifyCanonicalHash}
                className="px-3.5 py-1.5 rounded text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              >
                Verify Hash
              </button>
            </div>
          </div>

          {/* Governance Submission Trigger */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <div className="text-xs text-slate-400 font-mono">
              Draft stored locally in database. Explicit blockchain transaction required to anchor.
            </div>

            {onNavigateToGovernance && (
              <button
                onClick={() => onNavigateToGovernance(generatedPlan.plan_id)}
                className="flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
              >
                <ShieldCheck size={14} />
                <span>Submit to On-Chain Governance</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
