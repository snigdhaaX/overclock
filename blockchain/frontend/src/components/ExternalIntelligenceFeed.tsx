import React, { useEffect, useState } from "react";
import {
  Radio,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Link,
  PlusCircle,
  ExternalLink,
  ShieldAlert,
  Server,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import {
  IntelligenceSource,
  ExternalDisruptionEvent,
  IngestionRun,
  Disruption,
} from "../types/supplyChain";

interface ExternalIntelligenceFeedProps {
  onConfirmSuccess?: (disruption: Disruption) => void;
}

export const ExternalIntelligenceFeed: React.FC<ExternalIntelligenceFeedProps> = ({
  onConfirmSuccess,
}) => {
  const [sources, setSources] = useState<IntelligenceSource[]>([]);
  const [events, setEvents] = useState<ExternalDisruptionEvent[]>([]);
  const [history, setHistory] = useState<IngestionRun[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<ExternalDisruptionEvent | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [ingesting, setIngesting] = useState<boolean>(false);
  const [reviewing, setReviewing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [activeSubTab, setActiveSubTab] = useState<"feed" | "sources" | "history">("feed");
  const [statusFilter, setStatusFilter] = useState<string>("");

  // Evidence Verification State
  const [verifyingIntegrity, setVerifyingIntegrity] = useState<boolean>(false);
  const [integrityResult, setIntegrityResult] = useState<any | null>(null);

  // Manual Report Form State
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualTitle, setManualTitle] = useState<string>("");
  const [manualDescription, setManualDescription] = useState<string>("");
  const [manualCategory, setManualCategory] = useState<string>("PORT_CONGESTION");
  const [manualSeverity, setManualSeverity] = useState<string>("HIGH");
  const [manualRegion, setManualRegion] = useState<string>("");
  const [manualCorridor, setManualCorridor] = useState<string>("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [sourcesRes, eventsRes, historyRes] = await Promise.all([
        api.getIntelligenceSources().catch(() => []),
        api.getExternalEvents(1, 30, statusFilter || undefined).catch(() => ({ items: [] })),
        api.getIngestionHistory(15).catch(() => []),
      ]);

      setSources(sourcesRes);
      setEvents(eventsRes.items || []);
      setHistory(historyRes);
      if (eventsRes.items?.length > 0 && !selectedEvent) {
        setSelectedEvent(eventsRes.items[0]);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load external disruption intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleTriggerIngest = async (forceDemo: boolean = false) => {
    try {
      setIngesting(true);
      setError(null);
      await api.triggerIngestionRun(undefined, forceDemo);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Ingestion cycle failed.");
    } finally {
      setIngesting(false);
    }
  };

  const handleConfirmEvent = async () => {
    if (!selectedEvent) return;
    try {
      setReviewing(true);
      const disruption = await api.confirmExternalEvent(
        selectedEvent.event_id,
        reviewNotes || "Confirmed by analyst after source provenance and corridor verification."
      );
      setReviewNotes("");
      await loadData();
      if (onConfirmSuccess) {
        onConfirmSuccess(disruption);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to confirm event into operational disruption.");
    } finally {
      setReviewing(false);
    }
  };

  const handleRejectEvent = async () => {
    if (!selectedEvent) return;
    try {
      setReviewing(true);
      await api.rejectExternalEvent(
        selectedEvent.event_id,
        reviewNotes || "Rejected as false positive / uncorroborated report."
      );
      setReviewNotes("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to reject event.");
    } finally {
      setReviewing(false);
    }
  };

  const handleSubmitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setReviewing(true);
      await api.submitManualEvent({
        title: manualTitle,
        description: manualDescription,
        category: manualCategory,
        severity: manualSeverity,
        geographic_region: manualRegion,
        affected_corridor: manualCorridor || undefined,
      });
      setShowManualModal(false);
      setManualTitle("");
      setManualDescription("");
      setManualRegion("");
      setManualCorridor("");
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to submit manual report.");
    } finally {
      setReviewing(false);
    }
  };

  const handleVerifyIntegrity = async (eventId: string) => {
    try {
      setVerifyingIntegrity(true);
      const res = await api.verifyEventEvidence(eventId);
      setIntegrityResult(res);
    } catch (err: any) {
      setIntegrityResult({ is_valid: false, status: "ERROR", error: err.message });
    } finally {
      setVerifyingIntegrity(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-navy-900 border border-slate-800">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Radio size={18} className="text-orange-400 animate-pulse" />
            External Disruption Intelligence & Data Ingestion
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time multi-source connectors (AIS, Port Telemetry, NOAA Weather, Trade Press) with provenance scoring and human-in-the-loop review.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleTriggerIngest(false)}
            disabled={ingesting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-colors"
          >
            <RefreshCw size={13} className={ingesting ? "animate-spin" : ""} />
            <span>{ingesting ? "Ingesting Feeds..." : "Poll Live / Demo Feeds"}</span>
          </button>

          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <PlusCircle size={13} />
            <span>Manual Field Report</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold underline">Dismiss</button>
        </div>
      )}

      {/* Sub Tabs: Feed vs Sources vs History */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveSubTab("feed")}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeSubTab === "feed"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Disruption Candidates ({events.length})
        </button>
        <button
          onClick={() => setActiveSubTab("sources")}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeSubTab === "sources"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Source Connectors ({sources.length})
        </button>
        <button
          onClick={() => setActiveSubTab("history")}
          className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            activeSubTab === "history"
              ? "bg-slate-800 text-orange-400 border border-orange-500/40"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Ingestion Logs ({history.length})
        </button>
      </div>

      {/* VIEW 1: CANDIDATES FEED & REVIEW WORKSPACE */}
      {activeSubTab === "feed" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Candidates List (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs px-1">
              <span className="font-bold uppercase tracking-wider text-slate-400">
                Incoming Alerts
              </span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-navy-950 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1"
              >
                <option value="">All Statuses</option>
                <option value="VALIDATED">Validated (Pending)</option>
                <option value="CONFIRMED_AS_DISRUPTION">Confirmed</option>
                <option value="DUPLICATE">Duplicates</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono">
                Loading intelligence feed...
              </div>
            ) : events.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 font-mono bg-navy-900 rounded-lg border border-slate-800">
                No external events found for filter.
              </div>
            ) : (
              <div className="space-y-2">
                {events.map((evt) => {
                  const isSelected = selectedEvent?.id === evt.id;
                  return (
                    <div
                      key={evt.id}
                      onClick={() => {
                        setSelectedEvent(evt);
                        setIntegrityResult(null);
                      }}
                      className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? "bg-navy-800 border-orange-500 shadow-md"
                          : "bg-navy-900 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-white truncate">
                          {evt.external_event_id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                              evt.mode === "LIVE"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                                : evt.mode === "MANUAL"
                                ? "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                            }`}
                          >
                            {evt.mode}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              evt.severity === "CRITICAL"
                                ? "bg-rose-500/20 text-rose-400"
                                : evt.severity === "HIGH"
                                ? "bg-orange-500/20 text-orange-400"
                                : "bg-slate-700 text-slate-300"
                            }`}
                          >
                            {evt.severity}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs font-semibold text-slate-200 line-clamp-1 mb-1">
                        {evt.title}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="truncate max-w-[200px]">{evt.geographic_region}</span>
                        <span className="text-emerald-400 font-bold">
                          {(evt.confidence_score * 100).toFixed(0)}% trust
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Review & Correlation Centre (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            {selectedEvent ? (
              <div className="p-6 rounded-lg bg-navy-900 border border-slate-800 space-y-5">
                {/* Event Header */}
                <div className="pb-4 border-b border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="font-mono text-xs font-bold text-orange-400">
                      {selectedEvent.event_id} ({selectedEvent.external_event_id})
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        selectedEvent.validation_status === "CONFIRMED_AS_DISRUPTION"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : selectedEvent.validation_status === "DUPLICATE"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : selectedEvent.validation_status === "REJECTED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                      }`}
                    >
                      {selectedEvent.validation_status}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white">{selectedEvent.title}</h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    {selectedEvent.description}
                  </p>
                </div>

                {/* Provenance & Source Metadata */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded bg-slate-950 border border-slate-800 font-mono text-xs">
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Source Feed</span>
                    <span className="text-white font-bold">{selectedEvent.source_type}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Mode</span>
                    <span className="text-white font-bold">{selectedEvent.mode} MODE</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Trust Score</span>
                    <span className="text-emerald-400 font-bold">
                      {(selectedEvent.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-400 block">Reported Time</span>
                    <span className="text-slate-300">
                      {new Date(selectedEvent.event_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                {/* Evidence Items & Cryptographic Integrity */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Captured Evidence Records ({selectedEvent.evidences?.length || 0})
                    </span>
                    <button
                      onClick={() => handleVerifyIntegrity(selectedEvent.event_id)}
                      disabled={verifyingIntegrity}
                      className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                    >
                      <RefreshCw size={11} className={verifyingIntegrity ? "animate-spin" : ""} />
                      <span>Verify Evidence Integrity</span>
                    </button>
                  </div>

                  {integrityResult && (
                    <div
                      className={`p-3 rounded-lg text-xs font-mono space-y-2 border ${
                        integrityResult.status === "VALID"
                          ? "bg-emerald-950/40 text-emerald-300 border-emerald-800/80"
                          : integrityResult.status === "CONTENT_TAMPERED"
                          ? "bg-rose-950/40 text-rose-300 border-rose-800/80"
                          : integrityResult.status === "EVIDENCE_MISSING"
                          ? "bg-amber-950/40 text-amber-300 border-amber-800/80"
                          : integrityResult.status === "ASSOCIATION_MISMATCH"
                          ? "bg-purple-950/40 text-purple-300 border-purple-800/80"
                          : integrityResult.status === "MANIFEST_MISMATCH"
                          ? "bg-red-950/40 text-red-300 border-red-800/80"
                          : "bg-slate-900 text-slate-300 border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {integrityResult.status === "VALID" ? (
                            <CheckCircle2 size={15} className="text-emerald-400" />
                          ) : (
                            <XCircle size={15} className="text-rose-400" />
                          )}
                          <span className="font-bold tracking-wide">
                            INTEGRITY STATUS: {integrityResult.status}
                          </span>
                        </div>
                        {integrityResult.manifest_root_hash && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[200px]" title={integrityResult.manifest_root_hash}>
                            ROOT: {integrityResult.manifest_root_hash.slice(0, 14)}...
                          </span>
                        )}
                      </div>

                      {integrityResult.details && (
                        <p className="text-[11px] leading-relaxed opacity-90">{integrityResult.details}</p>
                      )}

                      {(integrityResult.proves || integrityResult.cannot_prove) && (
                        <div className="pt-2 border-t border-slate-800/60 space-y-1 text-[11px]">
                          {integrityResult.proves && (
                            <div>
                              <span className="text-emerald-400 font-bold uppercase tracking-wider text-[10px]">What this proves: </span>
                              <span className="text-slate-300">{integrityResult.proves}</span>
                            </div>
                          )}
                          {integrityResult.cannot_prove && (
                            <div>
                              <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">What this cannot prove: </span>
                              <span className="text-slate-400">{integrityResult.cannot_prove}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {!selectedEvent.evidences || selectedEvent.evidences.length === 0 ? (
                    <div className="p-3 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
                      No raw evidence payloads linked to this event.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvent.evidences.map((ev) => (
                        <div
                          key={ev.id}
                          className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white uppercase text-[11px]">
                              {ev.evidence_type}
                            </span>
                            {ev.hash_sha256 && (
                              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[240px]">
                                SHA-256: {ev.hash_sha256}
                              </span>
                            )}
                          </div>
                          <p className="text-slate-300 text-[11px] leading-relaxed">{ev.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Correlated Supply Chain Entities */}
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Correlated Supply Chain Network Impacts ({selectedEvent.correlations?.length || 0})</span>
                  </div>

                  {!selectedEvent.correlations || selectedEvent.correlations.length === 0 ? (
                    <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
                      No direct supply chain entities correlated. Event may be in an unutilized corridor.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedEvent.correlations.map((c, cIdx) => (
                        <div
                          key={cIdx}
                          className="p-3 rounded bg-slate-950 border border-slate-800/80 flex items-start justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white uppercase font-mono">
                                {c.entity_type} #{c.entity_id}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {c.match_criteria}
                              </span>
                            </div>
                            <p className="text-slate-300 mt-1">{c.reason_for_match}</p>
                          </div>
                          <div className="text-right flex-shrink-0 font-mono">
                            <span className="text-emerald-400 font-bold block">
                              {(c.relevance_score * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Authorised Review & Decision Action Box */}
                {selectedEvent.validation_status === "VALIDATED" || selectedEvent.validation_status === "PENDING_REVIEW" ? (
                  <div className="p-4 rounded-lg bg-slate-800/40 border border-orange-500/30 space-y-3">
                    <div className="text-xs font-bold text-white uppercase tracking-wider">
                      Authorised Analyst Verification
                    </div>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      placeholder="Enter verification notes, harbor master corroboration, or operational findings..."
                      className="w-full text-xs p-2.5 rounded bg-navy-950 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                      rows={2}
                    />

                    <div className="flex items-center gap-3 justify-end pt-1">
                      <button
                        onClick={handleRejectEvent}
                        disabled={reviewing}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/60 transition-colors"
                      >
                        <XCircle size={13} />
                        <span>Reject as False Alarm</span>
                      </button>

                      <button
                        onClick={handleConfirmEvent}
                        disabled={reviewing}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors shadow-sm"
                      >
                        <CheckCircle2 size={13} />
                        <span>Confirm into Operational Disruption</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-400 font-mono">
                    Event review finalized as <span className="font-bold text-white">{selectedEvent.validation_status}</span>.
                    {selectedEvent.linked_disruption_id && (
                      <span className="block mt-1 text-emerald-400">
                        Linked Disruption Incident ID: #{selectedEvent.linked_disruption_id}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-400 font-mono bg-navy-900 rounded-lg border border-slate-800">
                Select an external event from the left to view evidence and review actions.
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: CONFIGURED SOURCES */}
      {activeSubTab === "sources" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sources.map((s) => (
            <div key={s.id} className="p-4 rounded-lg bg-navy-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-white text-sm block">{s.source_name}</span>
                  <span className="text-[10px] font-mono text-slate-400">{s.source_id}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      s.connection_status === "HEALTHY"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : s.connection_status === "DEGRADED"
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                        : s.connection_status === "UNAVAILABLE"
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        : s.connection_status === "NOT_CONFIGURED"
                        ? "bg-slate-700/40 text-slate-400 border border-slate-600"
                        : "bg-purple-500/20 text-purple-400 border border-purple-500/40"
                    }`}
                  >
                    {s.connection_status || s.mode}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {s.mode}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-300">
                <div>
                  <span className="text-slate-400 text-[10px] block">Provider</span>
                  <span>{s.provider_name}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Rate Limit</span>
                  <span>{s.rate_limit_rpm} req/min</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Credentials</span>
                  <span>{s.requires_auth ? `Env: ${s.env_key_name}` : "Public / Webhook"}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Reliability Tier</span>
                  <span>{s.reliability_tier}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Processed / Dups</span>
                  <span className="text-white font-bold">{s.events_processed_count || 0} / {s.duplicates_count || 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Consecutive Fails</span>
                  <span className={s.consecutive_failures > 0 ? "text-rose-400 font-bold" : "text-slate-300"}>
                    {s.consecutive_failures || 0}
                  </span>
                </div>
              </div>

              {s.last_error_message && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-[11px] text-rose-300 font-mono">
                  {s.last_error_message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* VIEW 3: INGESTION LOGS */}
      {activeSubTab === "history" && (
        <div className="rounded-lg border border-slate-800 overflow-hidden bg-navy-900">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Run ID</th>
                <th className="p-3">Source</th>
                <th className="p-3">Mode</th>
                <th className="p-3">Status</th>
                <th className="p-3">Events Ingested</th>
                <th className="p-3">Duplicates</th>
                <th className="p-3">Duration</th>
                <th className="p-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {history.map((h) => (
                <tr key={h.id} className="hover:bg-slate-800/30">
                  <td className="p-3 text-white font-bold">{h.run_id}</td>
                  <td className="p-3">{h.source_id}</td>
                  <td className="p-3">
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800">{h.mode}</span>
                  </td>
                  <td className="p-3">
                    <span className={h.status === "SUCCESS" ? "text-emerald-400" : "text-rose-400"}>
                      {h.status}
                    </span>
                  </td>
                  <td className="p-3 text-white font-bold">{h.events_ingested}</td>
                  <td className="p-3 text-amber-400">{h.duplicates_filtered}</td>
                  <td className="p-3">{h.execution_duration_ms}ms</td>
                  <td className="p-3 text-slate-400">
                    {new Date(h.started_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MANUAL REPORT SUBMISSION MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-navy-900 border border-slate-700 rounded-lg max-w-lg w-full p-5 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle size={16} className="text-orange-400" />
              Submit Field Disruption Intelligence Report
            </h3>
            <p className="text-xs text-slate-400">
              Register a verified field observation into the intelligence pipeline. Will be subjected to automated supply-chain correlation and analyst review.
            </p>

            <form onSubmit={handleSubmitManual} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Incident Title</label>
                <input
                  type="text"
                  required
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="e.g. Kaohsiung Berth 3 Quayside Crane Power Outage"
                  className="w-full p-2 rounded bg-navy-950 border border-slate-700 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Category & Severity</label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="p-2 rounded bg-navy-950 border border-slate-700 text-white"
                  >
                    <option value="PORT_CONGESTION">Port Congestion</option>
                    <option value="WEATHER">Severe Weather</option>
                    <option value="GEOPOLITICAL">Geopolitical Incident</option>
                    <option value="LABOR_STRIKE">Labor Strike</option>
                    <option value="SUPPLIER_INSOLVENCY">Supplier Outage</option>
                  </select>
                  <select
                    value={manualSeverity}
                    onChange={(e) => setManualSeverity(e.target.value)}
                    className="p-2 rounded bg-navy-950 border border-slate-700 text-white"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Geographic Region & Corridor</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={manualRegion}
                    onChange={(e) => setManualRegion(e.target.value)}
                    placeholder="e.g. Port of Kaohsiung, Taiwan"
                    className="p-2 rounded bg-navy-950 border border-slate-700 text-white"
                  />
                  <input
                    type="text"
                    value={manualCorridor}
                    onChange={(e) => setManualCorridor(e.target.value)}
                    placeholder="e.g. Asia-Europe Maritime Route"
                    className="p-2 rounded bg-navy-950 border border-slate-700 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-semibold">Detailed Description</label>
                <textarea
                  required
                  rows={3}
                  value={manualDescription}
                  onChange={(e) => setManualDescription(e.target.value)}
                  placeholder="Provide operational timeline, affected berths, expected duration, and sources..."
                  className="w-full p-2 rounded bg-navy-950 border border-slate-700 text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-3 py-1.5 rounded bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewing}
                  className="px-4 py-1.5 rounded bg-orange-600 text-white font-bold"
                >
                  {reviewing ? "Submitting..." : "Submit Intelligence Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
