import React, { useState } from "react";
import { Copy, Check, ExternalLink, Shield, AlertTriangle } from "lucide-react";
import { LinkedWalletResponse } from "../types/blockchain";

interface TopbarProps {
  account: string | null;
  chainId: number | null;
  isAmoy: boolean;
  contractAddress: string;
  linkedInfo: LinkedWalletResponse | null;
  connect: () => void;
  disconnect: () => void;
  switchNetwork: () => void;
  linkWalletWithNonce: () => void;
  isLinking: boolean;
}

export const Topbar: React.FC<TopbarProps> = ({
  account,
  chainId,
  isAmoy,
  contractAddress,
  linkedInfo,
  connect,
  disconnect,
  switchNetwork,
  linkWalletWithNonce,
  isLinking,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddr = (addr: string) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  const isLinked = linkedInfo?.linked && linkedInfo?.wallet?.wallet_address.toLowerCase() === account?.toLowerCase();

  return (
    <header
      style={{
        height: "70px",
        backgroundColor: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 2rem",
      }}
    >
      {/* Contract Address Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
            GOVERNANCE CONTRACT:
          </span>
          {contractAddress ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                backgroundColor: "var(--bg-panel)",
                padding: "0.25rem 0.625rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                fontSize: "0.8125rem",
                fontFamily: "var(--font-mono)",
              }}
            >
              <span>{formatAddr(contractAddress)}</span>
              <button
                onClick={() => copyAddress(contractAddress)}
                title="Copy Address"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {copied ? <Check size={14} color="var(--status-green)" /> : <Copy size={14} />}
              </button>
            </div>
          ) : (
            <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontStyle: "italic" }}>
              Not Deployed (Amoy Pending)
            </span>
          )}
        </div>
      </div>

      {/* Wallet & Network Info */}
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        {/* Chain Switcher if wrong chain */}
        {account && !isAmoy && (
          <button
            onClick={switchNetwork}
            className="btn btn-secondary"
            style={{
              padding: "0.375rem 0.75rem",
              fontSize: "0.75rem",
              color: "var(--status-amber)",
              borderColor: "var(--status-amber)",
            }}
          >
            <AlertTriangle size={14} />
            <span>Switch to Amoy (80002)</span>
          </button>
        )}

        {account ? (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Linking Badge */}
            {isLinked ? (
              <span className="badge badge-green" title="Wallet linked to organizational user identity">
                <Shield size={12} />
                Linked
              </span>
            ) : (
              <button
                onClick={linkWalletWithNonce}
                disabled={isLinking}
                className="btn btn-primary"
                style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
              >
                <Shield size={14} />
                {isLinking ? "Signing Nonce..." : "Sign Link Nonce"}
              </button>
            )}

            {/* Account pill */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                backgroundColor: "var(--bg-panel)",
                border: "1px solid var(--border-color)",
                padding: "0.375rem 0.75rem",
                borderRadius: "8px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  backgroundColor: "var(--status-green)",
                }}
              />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 600 }}>
                {formatAddr(account)}
              </span>
            </div>

            <button
              onClick={disconnect}
              className="btn btn-secondary"
              style={{ padding: "0.375rem 0.75rem", fontSize: "0.75rem" }}
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button onClick={connect} className="btn btn-primary">
            Connect MetaMask
          </button>
        )}
      </div>
    </header>
  );
};
