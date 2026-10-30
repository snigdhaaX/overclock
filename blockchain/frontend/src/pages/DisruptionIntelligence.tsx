import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  ShieldAlert,
  Layers,
  ArrowRight,
  TrendingDown,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw,
  Sliders,
  ChevronRight,
  FileCheck2,
} from "lucide-react";
import { api } from "../services/api";
import {
  Disruption,
  DisruptionRisk,
  DisruptionImpact,
  RecoveryRecommendation,
} from "../types/supplyChain";
import { ExternalIntelligenceFeed } from "../components/ExternalIntelligenceFeed";
import { Radio, Database } from "lucide-react";

interface DisruptionIntelligenceProps {
  onSelectRecoveryIncident?: (incidentCode: string) => void;
}

export const DisruptionIntelligence: React.FC<DisruptionIntelligenceProps> = ({
  onSelectRecoveryIncident,
}) => {
  const [workspaceMode, setWorkspaceMode] = useState<"incidents" | "external_feed">("external_feed");
  const [disruptions, setDisruptions] = useState<Disruption[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Disruption | null>(null);
  const [riskData, setRiskData] = useState<DisruptionRisk | null>(null);
  const [impactData, setImpactData] = useState<DisruptionImpact | null>(null);
  const [recommendations, setRecommendations] = useState<RecoveryRecommendation[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [generatingRecs, setGeneratingRecs] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"risk" | "impact" | "recommendations">("risk");

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getActiveDisruptions();
      setDisruptions(data);
      if (data.length > 0 && !selectedIncident) {
        setSelectedIncident(data[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load active disruptions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  // When selected incident changes, load its risk and impact
  useEffect(() => {
    if (!selectedIncident) return;

    const fetchIncidentDetails = async () => {
      try {
        setLoadingDetails(true);
        const [risk, impact] = await Promise.all([
          api.getDisruptionRisk(selectedIncident.id).catch(() => null),
          api.getDisruptionImpact(selectedIncident.id).catch(() => null),
        ]);
        setRiskData(risk);
        setImpactData(impact);
        setRecommendations([]); // reset until user clicks or auto-generates
      } catch (err: any) {
        console.error("Failed to load incident detail:", err);
      } finally {
        setLoadingDetails(false);
      }
    };

    fetchIncidentDetails();
  }, [selectedIncident]);

  const handleGenerateRecommendations = async () => {
    if (!selectedIncident) return;
    try {
      setGeneratingRecs(true);
      const recs = await api.getRecoveryRecommendations(selectedIncident.id);
      setRecommendations(recs);
      setActiveTab("recommendations");
    } catch (err: any) {
      setError(err?.message || "Failed to generate recovery recommendations.");
    } finally {
      setGeneratingRecs(false);
    }
  };

  const handleIncidentConfirmed = async (disruption: Disruption) => {
    try {
      const data = await api.getActiveDisruptions();
      setDisruptions(data);
      const found = data.find((d) => d.id === disruption.id) || disruption;
      setSelectedIncident(found);
      setWorkspaceMode("incidents");
    } catch (e) {
      console.error("Error refreshing disruptions after confirmation:", e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Disruption Intelligence & Risk Assessment
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time external intelligence ingestion, explainable multi-factor scoring, and multi-tier operational recovery.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Top-level Workspace Mode Switcher */}
          <div className="flex bg-navy-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setWorkspaceMode("external_feed")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                workspaceMode === "external_feed"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio size={13} />
              <span>External Ingestion Feed</span>
            </button>
            <button
              onClick={() => setWorkspaceMode("incidents")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                workspaceMode === "incidents"
                  ? "bg-orange-500 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Database size={13} />
              <span>Operational Incidents ({disruptions.length})</span>
            </button>
          </div>

          <button
            onClick={loadIncidents}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-colors w-fit"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Mode View: External Intelligence Feed */}
      {workspaceMode === "external_feed" ? (
        <ExternalIntelligenceFeed onConfirmSuccess={handleIncidentConfirmed} />
      ) : (
        /* Operational Incidents Workspace */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incident List (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
              Active Incidents ({disruptions.length})
            </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              Loading incidents...
            </div>
          ) : disruptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono bg-navy-900 rounded-lg border border-slate-800">
              No active disruptions found.
            </div>
          ) : (
            <div className="space-y-2">
              {disruptions.map((d) => {
                const isSelected = selectedIncident?.id === d.id;
                return (
                  <div
                    key={d.id}
                    onClick={() => setSelectedIncident(d)}
                    className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-navy-800 border-orange-500 shadow-md"
                        : "bg-navy-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-mono text-xs font-bold text-white">
                          {d.incident_code}
                        </div>
                        <div className="text-[11px] text-slate-400 font-medium">
                          {d.category.replace("_", " ")}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                          d.severity === "CRITICAL"
                            ? "bg-rose-500/20 text-rose-400"
                            : d.severity === "HIGH"
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-amber-500/20 text-amber-400"
                        }`}
                      >
                        {d.severity}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-2 line-clamp-2 leading-relaxed">
                      {d.description}
                    </p>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>Corridor: {d.geographic_region.split("/")[0]}</span>
                      <span className="text-amber-400 font-semibold">+{d.estimated_delay_hours}h delay</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Incident Intelligence Workspace (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {selectedIncident ? (
            <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-6">
              {/* Incident Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-white">
                      {selectedIncident.incident_code}
                    </span>
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                      {selectedIncident.category}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30">
                      CONFIDENCE: {(selectedIncident.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1 font-mono">
                    Corridor: {selectedIncident.geographic_region} | Source: {selectedIncident.detection_source}
                  </div>
                </div>

                <button
                  onClick={handleGenerateRecommendations}
                  disabled={generatingRecs}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors shadow-sm"
                >
                  <Sliders size={13} />
                  <span>{generatingRecs ? "Synthesizing Options..." : "Generate Recovery Options"}</span>
                </button>
              </div>

              {/* Sub-Tabs: Risk Assessment vs Impact Analysis vs Recovery Candidates */}
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                <button
                  onClick={() => setActiveTab("risk")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    activeTab === "risk"
                      ? "bg-slate-800 text-orange-400 border border-orange-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  1. Risk Assessment
                </button>
                <button
                  onClick={() => setActiveTab("impact")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    activeTab === "impact"
                      ? "bg-slate-800 text-orange-400 border border-orange-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  2. Impact Dependency Analysis
                </button>
                <button
                  onClick={() => setActiveTab("recommendations")}
                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                    activeTab === "recommendations"
                      ? "bg-slate-800 text-orange-400 border border-orange-500/40"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  3. Recovery Recommendations ({recommendations.length})
                </button>
              </div>

              {/* TAB 1: RISK ASSESSMENT */}
              {activeTab === "risk" && (
                <div className="space-y-5">
                  {riskData ? (
                    <>
                      {/* Overall Score Badge */}
                      <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase font-bold text-slate-400">
                            Overall Calculated Disruption Risk
                          </div>
                          <div className="flex items-baseline gap-2 mt-1">
                            <span className="text-3xl font-extrabold font-mono text-white">
                              {riskData.overall_risk_score.toFixed(1)}
                            </span>
                            <span className="text-xs text-slate-400 font-sans">/ 100</span>
                            <span
                              className={`ml-2 px-2 py-0.5 rounded text-xs font-extrabold uppercase ${
                                riskData.risk_category === "CRITICAL"
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                  : riskData.risk_category === "HIGH"
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/40"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              }`}
                            >
                              {riskData.risk_category}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-2">{riskData.explanation}</p>
                        </div>
                      </div>

                      {/* Contributing Factors Breakdown */}
                      <div className="space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Explainable Multi-Factor Contribution Breakdown
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {Object.entries(riskData.contributing_factors).map(([factor, score]) => {
                            const weight = riskData.contributing_factor_weights?.[factor] || 0.15;
                            const formattedFactor = factor.replace(/_/g, " ").toUpperCase();
                            return (
                              <div
                                key={factor}
                                className="p-3 rounded-md bg-slate-800/30 border border-slate-700/50 space-y-1.5"
                              >
                                <div className="flex items-center justify-between text-xs">
                                  <span className="font-semibold text-slate-300">{formattedFactor}</span>
                                  <span className="font-mono font-bold text-white">
                                    {score.toFixed(1)} <span className="text-slate-400 text-[10px]">({(weight * 100).toFixed(0)}% wt)</span>
                                  </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-orange-500 rounded-full"
                                    style={{ width: `${Math.min(score, 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-mono">
                      Calculating risk assessment...
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: IMPACT DEPENDENCY ANALYSIS */}
              {activeTab === "impact" && (
                <div className="space-y-5">
                  {impactData ? (
                    <>
                      {/* Traversal Summary Banner */}
                      <div className="p-4 rounded-lg bg-slate-800/40 border border-slate-700/60 space-y-3">
                        <div className="text-xs font-bold uppercase tracking-wider text-orange-400">
                          End-to-End Supply Chain Dependency Chain
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                            Disruption: {selectedIncident.incident_code}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                            Shipments: {impactData.total_affected_shipments}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                            Purchase Orders: {impactData.total_affected_purchase_orders}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                            Suppliers: {impactData.total_affected_suppliers}
                          </span>
                          <ChevronRight size={14} className="text-slate-400" />
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700">
                            Customer Orders: {impactData.total_affected_customer_orders}
                          </span>
                        </div>
                        <div className="text-xs text-slate-300 pt-1 font-sans">
                          {impactData.summary}
                        </div>
                      </div>

                      {/* Financial SLA Exposure & Single Counting Proof */}
                      <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold uppercase text-rose-300">
                            Non-Duplicated Customer SLA Financial Exposure
                          </div>
                          <div className="text-2xl font-bold font-mono text-white mt-1">
                            ${impactData.total_financial_exposure_usd.toLocaleString("en-US", { minimumFractionDigits: 2 })} USD
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1">
                            Calculated strictly once per affected customer order, preventing artificial multi-count inflation.
                          </div>
                        </div>
                      </div>

                      {/* Customer Order SLA Table */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Customer Orders Exposed to Delivery Penalty
                        </div>
                        <div className="overflow-x-auto rounded border border-slate-800">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] font-mono">
                              <tr>
                                <th className="p-2.5">Order Number</th>
                                <th className="p-2.5">Customer</th>
                                <th className="p-2.5">SLA Deadline</th>
                                <th className="p-2.5">Delay Days</th>
                                <th className="p-2.5">Penalty Rate</th>
                                <th className="p-2.5">Total Exposure</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-slate-900/50 font-mono">
                              {impactData.customer_order_impacts.map((co) => (
                                <tr key={co.customer_order_id}>
                                  <td className="p-2.5 font-bold text-white">{co.order_number}</td>
                                  <td className="p-2.5 font-sans">{co.customer_name}</td>
                                  <td className="p-2.5">{new Date(co.sla_deadline).toLocaleDateString()}</td>
                                  <td className="p-2.5 text-rose-400 font-bold">+{co.delay_days} days</td>
                                  <td className="p-2.5">${co.daily_penalty_rate_usd.toLocaleString()}/day</td>
                                  <td className="p-2.5 text-rose-400 font-bold">
                                    ${co.penalty_exposure_usd.toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 font-mono">
                      Running impact graph traversal...
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: RECOVERY RECOMMENDATIONS */}
              {activeTab === "recommendations" && (
                <div className="space-y-4">
                  {recommendations.length === 0 ? (
                    <div className="p-8 text-center bg-slate-800/20 rounded-lg border border-slate-800 space-y-3">
                      <div className="text-xs text-slate-400 font-mono">
                        No candidate options generated yet for this incident.
                      </div>
                      <button
                        onClick={handleGenerateRecommendations}
                        disabled={generatingRecs}
                        className="px-4 py-2 rounded text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors"
                      >
                        {generatingRecs ? "Generating..." : "Generate Candidate Actions"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-xs text-slate-400">
                        The engine evaluated 5 recovery strategies against operational database constraints. Infeasible actions display explicit audit rationales.
                      </div>

                      {recommendations.map((rec) => {
                        const isFeasible = rec.feasibility_status === "FEASIBLE";
                        return (
                          <div
                            key={rec.recommendation_id}
                            className={`p-4 rounded-lg border transition-all space-y-3 ${
                              isFeasible
                                ? "bg-slate-800/40 border-slate-700/80 hover:border-slate-600"
                                : "bg-rose-950/20 border-rose-900/40 opacity-75"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs font-bold text-white">
                                    {rec.action_type}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                                    Mask: 0x0{rec.action_mask.toString(16)}
                                  </span>
                                  {isFeasible ? (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                                      <CheckCircle2 size={12} />
                                      FEASIBLE
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                                      <XCircle size={12} />
                                      INFEASIBLE
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-300 font-sans pt-1">
                                  {rec.proposed_action}
                                </p>
                              </div>

                              {isFeasible && onSelectRecoveryIncident && (
                                <button
                                  onClick={() => onSelectRecoveryIncident(selectedIncident.incident_code)}
                                  className="px-3 py-1.5 rounded text-xs font-bold text-white bg-orange-600 hover:bg-orange-500 transition-colors flex-shrink-0"
                                >
                                  Simulate
                                </button>
                              )}
                            </div>

                            {/* Feasible Metrics or Infeasible Rationale */}
                            {isFeasible ? (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-800/80 font-mono text-xs">
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase">Est. Cost</span>
                                  <span className="font-bold text-white">
                                    ${rec.estimated_cost_usd.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase">Delay Saved</span>
                                  <span className="font-bold text-emerald-400">
                                    +{rec.expected_delay_reduction_hours}h
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase">Net Benefit</span>
                                  <span className="font-bold text-orange-400">
                                    ${rec.net_financial_benefit_usd.toLocaleString()}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block uppercase">Op. Risk</span>
                                  <span className="font-bold text-slate-300">{rec.operational_risk}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-2.5 rounded bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-mono">
                                <span className="font-bold">Rejection Reason:</span> {rec.feasibility_reason}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-400 font-mono bg-navy-900 rounded-lg border border-slate-800">
              Select an incident from the left to view detailed intelligence.
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
