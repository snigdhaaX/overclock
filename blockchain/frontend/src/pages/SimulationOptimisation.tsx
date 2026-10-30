import React, { useEffect, useState } from "react";
import {
  Sliders,
  AlertTriangle,
  RefreshCw,
  Clock,
  DollarSign,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Layers,
  Info,
} from "lucide-react";
import { api } from "../services/api";
import { Disruption, SimulationResult, SimulatedPlan } from "../types/supplyChain";

export const SimulationOptimisation: React.FC = () => {
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedDisruption, setSelectedDisruption] = useState<Disruption | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const active = await api.getActiveDisruptions();
      setDisruptions(active);
      if (active.length > 0) {
        setSelectedDisruption(active[0]);
        await runSimulation(active[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load simulation environment.");
    } finally {
      setLoading(false);
    }
  };

  const runSimulation = async (d: Disruption) => {
    try {
      setEvaluating(true);
      setError(null);
      const res = await api.evaluateSimulation({
        disruption_id: d.id,
        incident_code: d.incident_code,
      });
      setSimulation(res);
      setSelectedPlanIndex(0);
    } catch (err: any) {
      setError(err?.message || "Failed to evaluate simulation candidates.");
    } finally {
      setEvaluating(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectDisruption = (d: Disruption) => {
    setSelectedDisruption(d);
    runSimulation(d);
  };

  const activePlan: SimulatedPlan | undefined = simulation?.candidate_plans?.[selectedPlanIndex];

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Recovery Simulation & Multi-Criteria Optimisation
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comparative analysis of candidate recovery strategies against the unmitigated baseline scenario.
          </p>
        </div>

        <button
          onClick={() => selectedDisruption && runSimulation(selectedDisruption)}
          disabled={evaluating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-colors w-fit"
        >
          <RefreshCw size={13} className={evaluating ? "animate-spin" : ""} />
          <span>{evaluating ? "Simulating..." : "Re-run Simulation"}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Incident Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-bold uppercase text-slate-400 mr-2 flex-shrink-0">
          Target Incident:
        </span>
        {disruptions.map((d) => (
          <button
            key={d.id}
            onClick={() => handleSelectDisruption(d)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-all flex-shrink-0 ${
              selectedDisruption?.id === d.id
                ? "bg-orange-600 text-white shadow-sm"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            {d.incident_code} ({d.category})
          </button>
        ))}
      </div>

      {/* Simulation Workspace Grid */}
      {simulation && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Candidate Options Selector (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Simulated Strategies ({simulation.candidate_plans.length})
            </div>

            <div className="space-y-2">
              {simulation.candidate_plans.map((p, idx) => {
                const isSelected = selectedPlanIndex === idx;
                const isFeasible = p.feasibility_status === "FEASIBLE";
                return (
                  <div
                    key={p.recommendation_id}
                    onClick={() => setSelectedPlanIndex(idx)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-navy-800 border-orange-500 shadow-md"
                        : "bg-navy-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-white">
                            #{p.rank} {p.action_type}
                          </span>
                          {isFeasible ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              FEASIBLE
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                              INFEASIBLE
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 font-sans">
                          {p.proposed_action}
                        </div>
                      </div>

                      {isFeasible && (
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-orange-400">
                            {p.optimization_score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">score</span>
                        </div>
                      )}
                    </div>

                    {isFeasible && (
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Save: +{p.time_saved_hours}h</span>
                        <span className="text-emerald-400 font-semibold">
                          +${p.net_financial_benefit_usd.toLocaleString()} Net
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Comparative Matrix & Breakdown (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {activePlan ? (
              <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-lg font-bold text-white">
                        {activePlan.action_type}
                      </span>
                      <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                        Mask: 0x0{activePlan.action_mask.toString(16)}
                      </span>
                      <span className="text-xs font-bold text-orange-400 font-mono px-2 py-0.5 rounded bg-orange-500/10 border border-orange-500/30">
                        RANK #{activePlan.rank}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">{activePlan.proposed_action}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-2xl font-bold font-mono text-white">
                      {activePlan.optimization_score.toFixed(1)}
                      <span className="text-xs text-slate-400 font-sans">/ 100</span>
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      Optimisation Score
                    </div>
                  </div>
                </div>

                {/* Section 7 Required Comparison Table */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Baseline vs Recovery Option Comparison Matrix
                  </div>
                  <div className="rounded border border-slate-800 overflow-hidden">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono border-b border-slate-800">
                        <tr>
                          <th className="p-3">Metric</th>
                          <th className="p-3">Baseline</th>
                          <th className="p-3">Recovery Option</th>
                          <th className="p-3">Impact Variance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 font-mono">
                        <tr>
                          <td className="p-3 font-sans font-semibold text-slate-200">Expected Delay</td>
                          <td className="p-3 text-rose-400 font-bold">{activePlan.baseline_delay_hours}h</td>
                          <td className="p-3 text-emerald-400 font-bold">{activePlan.proposed_recovery_time_hours}h</td>
                          <td className="p-3 text-emerald-400 font-bold">-{activePlan.time_saved_hours}h saved</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-semibold text-slate-200">SLA Penalties</td>
                          <td className="p-3 text-rose-400 font-bold">${activePlan.baseline_sla_penalty_usd.toLocaleString()}</td>
                          <td className="p-3 text-emerald-400 font-bold">${activePlan.sla_penalty_after_recovery_usd.toLocaleString()}</td>
                          <td className="p-3 text-emerald-400 font-bold">-${activePlan.sla_penalty_avoided_usd.toLocaleString()} avoided</td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-semibold text-slate-200">Recovery Cost</td>
                          <td className="p-3">$0.00</td>
                          <td className="p-3 text-white font-bold">${activePlan.recovery_cost_usd.toLocaleString()}</td>
                          <td className="p-3 text-amber-400">+${activePlan.recovery_cost_usd.toLocaleString()} cost</td>
                        </tr>
                        <tr className="bg-slate-800/20">
                          <td className="p-3 font-sans font-bold text-white">Total Financial Impact</td>
                          <td className="p-3 text-rose-400 font-bold">${activePlan.baseline_sla_penalty_usd.toLocaleString()}</td>
                          <td className="p-3 text-white font-bold">${activePlan.total_recovery_impact_usd.toLocaleString()}</td>
                          <td className="p-3 text-slate-300">Cost + Remaining SLA</td>
                        </tr>
                        <tr className="bg-slate-800/40">
                          <td className="p-3 font-sans font-bold text-emerald-400">Net Avoided Loss</td>
                          <td className="p-3">$0.00</td>
                          <td className="p-3 text-emerald-400 font-bold">${activePlan.net_financial_benefit_usd.toLocaleString()}</td>
                          <td className="p-3 text-emerald-400 font-bold">
                            {activePlan.net_financial_benefit_usd >= 0 ? "Positive ROI" : "Deficit (Mitigation only)"}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3 font-sans font-semibold text-slate-200">Feasibility Status</td>
                          <td className="p-3 text-slate-400">—</td>
                          <td className="p-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                activePlan.feasibility_status === "FEASIBLE"
                                  ? "bg-emerald-500/10 text-emerald-400"
                                  : "bg-rose-500/10 text-rose-400"
                              }`}
                            >
                              {activePlan.feasibility_status}
                            </span>
                          </td>
                          <td className="p-3 font-sans text-slate-400 text-[11px]">
                            {activePlan.feasibility_reason || "Constraint validated"}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mathematical Integrity & Explainability Notice */}
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/60 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Info size={14} className="text-orange-400" />
                    <span>Explainability & Calculation Formula Integrity</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed font-sans">
                    Total recovery impact is strictly calculated as <code className="text-slate-300">Recovery Cost + Remaining SLA Penalty</code>.
                    Net Avoided Loss is strictly <code className="text-slate-300">Baseline SLA Penalty - Total Recovery Impact</code>.
                    Optimisation score authoritative utility weighting: <strong>40% financial benefit</strong>, <strong>40% time velocity</strong>, <strong>20% operational risk reduction</strong>. Infeasible candidates are strictly de-prioritized.
                  </p>
                </div>

                {/* Assumptions List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Operational Assumptions Behind Simulation
                  </div>
                  <ul className="space-y-1 text-xs text-slate-300 font-sans list-disc pl-5">
                    {activePlan.assumptions.map((asm, aIdx) => (
                      <li key={aIdx}>{asm}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 font-mono bg-navy-900 rounded-lg border border-slate-800">
                Select a simulated candidate from the left.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
