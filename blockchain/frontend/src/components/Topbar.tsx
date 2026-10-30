import React, { useState } from "react";
import { Copy, Check, Shield, AlertTriangle, KeyRound } from "lucide-react";
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
  const hasSession = !!localStorage.getItem("trustchain_session_token");

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
      className="h-16 px-6 flex items-center justify-between border-b border-slate-800 bg-navy-900 select-none flex-shrink-0"
      style={{
        backgroundColor: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border-color)",
      }}
    >
      {/* Contract & Org Context */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">
            ORGANISATION:
          </span>
          <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30">
            ORG-APEX-GLOBAL
          </span>
        </div>

        <div className="h-4 w-px bg-slate-800" />

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 tracking-wider">
            GOVERNANCE CONTRACT:
          </span>
          {contractAddress ? (
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono bg-slate-800/80 border border-slate-700/60 text-slate-200"
            >
              <span>{formatAddr(contractAddress)}</span>
              <button
                onClick={() => copyAddress(contractAddress)}
                title="Copy Address"
                className="text-slate-400 hover:text-white transition-colors"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              </button>
            </div>
          ) : (
            <span className="text-xs text-slate-400 italic">Connecting RPC...</span>
          )}
        </div>
      </div>

      {/* Wallet, Session & Network Actions */}
      <div className="flex items-center gap-3">
        {/* Network indicator pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-800/60 border border-slate-700/50">
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: isAmoy ? "var(--status-green)" : chainId === 31337 ? "var(--status-blue)" : "var(--status-amber)",
            }}
          />
          <span className="text-slate-300">
            {isAmoy ? "Polygon Amoy" : chainId === 31337 ? "Hardhat (31337)" : "Network Offline"}
          </span>
        </div>

        {/* Chain Switcher if not on Amoy and Amoy is wanted */}
        {account && !isAmoy && chainId !== 31337 && (
          <button
            onClick={switchNetwork}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-amber-400 border border-amber-500/40 hover:bg-amber-500/10 transition-colors"
          >
            <AlertTriangle size={13} />
            <span>Switch to Amoy (80002)</span>
          </button>
        )}

        {account ? (
          <div className="flex items-center gap-2">
            {/* Authenticated Session Badge */}
            {hasSession && (
              <span className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" title="Cryptographically verified session active">
                <KeyRound size={12} />
                Session Active
              </span>
            )}

            {/* Linking Button or Badge */}
            {isLinked ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" title="Wallet linked to organizational user identity">
                <Shield size={12} />
                Linked
              </span>
            ) : (
              <button
                onClick={linkWalletWithNonce}
                disabled={isLinking}
                className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-sm"
              >
                <Shield size={13} />
                {isLinking ? "Signing Nonce..." : "Sign Link Nonce"}
              </button>
            )}

            {/* Account pill */}
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-800/80 border border-slate-700/60 font-mono text-xs text-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{formatAddr(account)}</span>
            </div>

            <button
              onClick={disconnect}
              className="px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-sm"
          >
            Connect MetaMask
          </button>
        )}
      </div>
    </header>
  );
};
