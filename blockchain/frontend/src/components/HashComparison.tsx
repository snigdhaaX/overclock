import React, { useState } from "react";
import { Copy, Check, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

interface HashComparisonProps {
  databaseHash: string;
  onChainHash?: string | null;
  simulationHash?: string | null;
  executionEvidenceHash?: string | null;
  hashesMatch: boolean;
  statusText?: string;
}

export const HashComparison: React.FC<HashComparisonProps> = ({
  databaseHash,
  onChainHash,
  simulationHash,
  executionEvidenceHash,
  hashesMatch,
  statusText,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="card" style={{ marginTop: "1.5rem" }}>
      <div className="card-header">
        <div>
          <h2>Cryptographic Hash Comparison</h2>
          <p style={{ fontSize: "0.8125rem" }}>
            RFC 8785 Canonical SHA-256 fingerprint compared with on-chain anchor
          </p>
        </div>
        {onChainHash ? (
          hashesMatch ? (
            <span className="badge badge-green" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>
              <CheckCircle2 size={16} /> Cryptographically Verified Match
            </span>
          ) : (
            <span className="badge badge-red" style={{ fontSize: "0.8125rem", padding: "0.375rem 0.75rem" }}>
              <XCircle size={16} /> Integrity Mismatch Detected
            </span>
          )
        ) : (
          <span className="badge badge-amber">
            <AlertTriangle size={14} /> Unanchored
          </span>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Database Hash */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            padding: "1rem",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              DATABASE CANONICAL PLAN HASH (OFF-CHAIN RECOMPUTED)
            </span>
            <button
              onClick={() => copyToClipboard(databaseHash, "db")}
              className="btn btn-secondary"
              style={{ padding: "0.2rem 0.5rem", fontSize: "0.6875rem" }}
            >
              {copiedKey === "db" ? <Check size={12} color="var(--status-green)" /> : <Copy size={12} />}
              <span>{copiedKey === "db" ? "Copied" : "Copy"}</span>
            </button>
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              wordBreak: "break-all",
              color: "var(--text-primary)",
            }}
          >
            {databaseHash}
          </div>
        </div>

        {/* On-Chain Anchored Hash */}
        <div
          style={{
            backgroundColor: "var(--bg-secondary)",
            padding: "1rem",
            borderRadius: "8px",
            border: `1px solid ${
              onChainHash
                ? hashesMatch
                  ? "rgba(16, 185, 129, 0.4)"
                  : "rgba(239, 68, 68, 0.4)"
                : "var(--border-color)"
            }`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>
              SMART CONTRACT ANCHORED HASH (POLYGON AMOY)
            </span>
            {onChainHash && (
              <button
                onClick={() => copyToClipboard(onChainHash, "onchain")}
                className="btn btn-secondary"
                style={{ padding: "0.2rem 0.5rem", fontSize: "0.6875rem" }}
              >
                {copiedKey === "onchain" ? <Check size={12} color="var(--status-green)" /> : <Copy size={12} />}
                <span>{copiedKey === "onchain" ? "Copied" : "Copy"}</span>
              </button>
            )}
          </div>
          <div
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "0.875rem",
              wordBreak: "break-all",
              color: onChainHash
                ? hashesMatch
                  ? "var(--status-green)"
                  : "var(--status-red)"
                : "var(--text-muted)",
            }}
          >
            {onChainHash || "No anchored hash found on-chain for this version."}
          </div>
        </div>

        {/* Simulation & Evidence Hashes */}
        <div className="grid-2">
          {simulationHash && (
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                padding: "0.875rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                SIMULATION OPTIMIZATION HASH
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  wordBreak: "break-all",
                  color: "var(--text-secondary)",
                }}
              >
                {simulationHash}
              </div>
            </div>
          )}

          {executionEvidenceHash && (
            <div
              style={{
                backgroundColor: "var(--bg-secondary)",
                padding: "0.875rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
              }}
            >
              <div style={{ fontSize: "0.6875rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.25rem" }}>
                EXECUTION EVIDENCE HASH
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "0.75rem",
                  wordBreak: "break-all",
                  color: "var(--status-green)",
                }}
              >
                {executionEvidenceHash}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
