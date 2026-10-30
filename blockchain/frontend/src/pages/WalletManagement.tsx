import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Wallet,
  KeyRound,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Unlink,
  Link2,
  ExternalLink,
  Layers,
  Building2,
  UserCheck,
} from "lucide-react";
import { useWallet } from "../hooks/useWallet";
import { CATEGORY_NAMES } from "../types/blockchain";
import { getExplorerAddressUrl } from "../services/wallet";

export const WalletManagement: React.FC = () => {
  const {
    account,
    chainId,
    isMetaMaskInstalled,
    isConnecting,
    isSigning,
    walletStatus,
    error,
    connect,
    disconnect,
    signAndVerifyNonce,
    unlinkCurrentWallet,
    refreshWalletStatus,
    switchNetwork,
  } = useWallet();

  const [simulatedUserId, setSimulatedUserId] = useState<string>("USR-SCM-001");
  const [simulatedOrgId, setSimulatedOrgId] = useState<string>("ORG-APEX-GLOBAL");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isConnected = !!account;
  const isLinked = !!walletStatus?.linked;
  const onChainAuth = walletStatus?.on_chain_authorization;
  const isRegisteredOnChain = !!onChainAuth?.active;

  const handleSignNonce = async () => {
    setFeedbackMsg(null);
    try {
      await signAndVerifyNonce(simulatedUserId, simulatedOrgId);
      setFeedbackMsg({
        type: "success",
        text: `Wallet cryptographically linked and verified with identity: ${simulatedUserId}`,
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Nonce signing and signature verification failed.",
      });
    }
  };

  const handleUnlink = async () => {
    setFeedbackMsg(null);
    try {
      await unlinkCurrentWallet();
      setFeedbackMsg({
        type: "success",
        text: "Wallet unlinked from application account.",
      });
    } catch (err: any) {
      setFeedbackMsg({
        type: "error",
        text: err?.message || "Failed to unlink wallet.",
      });
    }
  };

  const categoriesMask = onChainAuth?.categories || 0;
  const activeCategories = [0x01, 0x02, 0x04, 0x08, 0x10].filter(
    (mask) => (categoriesMask & mask) !== 0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">
            Wallet Identity & Ledger Authorization
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Cryptographic wallet linking, EIP-191 domain authentication, and on-chain governance role clearance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected && (
            <button
              onClick={refreshWalletStatus}
              className="btn btn-secondary flex items-center gap-1.5 text-xs"
              title="Refresh Authorization"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh Status</span>
            </button>
          )}
        </div>
      </div>

      {/* Global Alerts */}
      {feedbackMsg && (
        <div
          className={`card p-4 flex items-center gap-3 ${
            feedbackMsg.type === "success"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
              : "border-rose-500/40 bg-rose-500/10 text-rose-300"
          }`}
        >
          {feedbackMsg.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm">{feedbackMsg.text}</span>
        </div>
      )}

      {error && (
        <div className="card border-rose-500/40 bg-rose-500/10 text-rose-300 p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* 4-Tier Security Condition Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* State 1: Wallet Connected */}
        <div className="card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">1. Wallet Connection</span>
            <Wallet className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
            <span className="font-bold text-white text-base">
              {isConnected ? "MetaMask Active" : "Disconnected"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Browser provider detected and account unlocked.
          </p>
        </div>

        {/* State 2: App Account Linked */}
        <div className="card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">2. Account Linked</span>
            <Link2 className="w-4 h-4 text-accent-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isLinked ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span className="font-bold text-white text-base">
              {isLinked ? "Verified Nonce" : "Unlinked"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            EIP-191 domain signature verified by backend API.
          </p>
        </div>

        {/* State 3: On-Chain Registry */}
        <div className="card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">3. On-Chain Registry</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isRegisteredOnChain ? "bg-emerald-400" : "bg-rose-400"
              }`}
            />
            <span className="font-bold text-white text-base">
              {isRegisteredOnChain ? "Active Signer" : "Unregistered"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Stored in TrustChainGovernance wallet registry mapping.
          </p>
        </div>

        {/* State 4: Governance Clearances */}
        <div className="card">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">4. Stage Clearances</span>
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                activeCategories.length > 0 ? "bg-emerald-400" : "bg-slate-500"
              }`}
            />
            <span className="font-bold text-white text-base">
              {activeCategories.length > 0
                ? `${activeCategories.length} Roles Assigned`
                : "None"}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Bitmask authorization for multi-stage plan approvals.
          </p>
        </div>
      </div>

      {/* Main Connection & Linking Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Connection Details & Signer Form */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card space-y-5">
            <h3 className="font-bold text-lg text-white border-b border-navy-700 pb-3 flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-accent-500" />
              MetaMask Session & Nonce Verification
            </h3>

            {!isMetaMaskInstalled ? (
              <div className="bg-rose-500/10 border border-rose-500/30 p-4 rounded-lg text-rose-300 text-sm">
                <p className="font-semibold">MetaMask Browser Extension Not Detected</p>
                <p className="text-xs mt-1">
                  Please install MetaMask from the official store to connect your hardware or software web3 wallet.
                </p>
              </div>
            ) : !isConnected ? (
              <div className="bg-navy-900/60 border border-navy-700/80 p-6 rounded-lg text-center space-y-4">
                <Wallet className="w-12 h-12 mx-auto text-accent-400 opacity-80" />
                <div>
                  <h4 className="text-white font-semibold">Connect Your Web3 Wallet</h4>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    Connect your MetaMask wallet to inspect on-chain governance roles, anchor recovery plans, and authorize disruption workflows.
                  </p>
                </div>
                <button
                  onClick={connect}
                  disabled={isConnecting}
                  className="btn btn-primary px-6 py-2.5 text-sm"
                >
                  {isConnecting ? "Requesting Connection..." : "Connect MetaMask"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-navy-900/80 border border-navy-700 rounded-lg p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-navy-800 pb-3">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Connected Account</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-accent-300 font-bold">
                        {account}
                      </span>
                      {chainId && getExplorerAddressUrl(chainId, account) && (
                        <a
                          href={getExplorerAddressUrl(chainId, account) || undefined}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-accent-400"
                          title="View on Explorer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-slate-500">Network Chain ID:</span>{" "}
                      <code className="text-white font-mono">{chainId}</code>
                    </div>
                    <div>
                      <span className="text-slate-500">Provider:</span>{" "}
                      <span className="text-slate-300 font-semibold">MetaMask (EIP-1193)</span>
                    </div>
                  </div>
                </div>

                {/* Local Dev Identity Linking Adapter */}
                <div className="bg-navy-900/40 border border-navy-700/60 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <UserCheck className="w-4 h-4 text-accent-400" />
                        Organizational Account Linking
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Signs an EIP-191 domain-bound challenge nonce to bind this wallet with your enterprise account.
                      </p>
                    </div>
                    {isLinked ? (
                      <span className="badge badge-success">LINKED</span>
                    ) : (
                      <span className="badge badge-warning">NOT LINKED</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Application User ID
                      </label>
                      <input
                        type="text"
                        value={simulatedUserId}
                        onChange={(e) => setSimulatedUserId(e.target.value)}
                        disabled={isLinked}
                        className="input font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Organization ID
                      </label>
                      <input
                        type="text"
                        value={simulatedOrgId}
                        onChange={(e) => setSimulatedOrgId(e.target.value)}
                        disabled={isLinked}
                        className="input font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    {isLinked ? (
                      <button
                        onClick={handleUnlink}
                        className="btn btn-secondary text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500 flex items-center gap-1.5"
                      >
                        <Unlink className="w-3.5 h-3.5" />
                        <span>Unlink Wallet</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleSignNonce}
                        disabled={isSigning}
                        className="btn btn-primary text-xs flex items-center gap-1.5"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>{isSigning ? "Awaiting Signature..." : "Sign Domain Nonce in MetaMask"}</span>
                      </button>
                    )}

                    <button
                      onClick={disconnect}
                      className="btn btn-secondary text-xs text-slate-400 hover:text-white"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: On-Chain Roles & Clearance Card */}
        <div className="space-y-6">
          <div className="card space-y-4">
            <h3 className="font-bold text-white flex items-center gap-2 border-b border-navy-700 pb-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              On-Chain Governance Clearance
            </h3>

            {!isRegisteredOnChain ? (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 text-xs text-amber-300 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Wallet Not Registered on Smart Contract</span>
                </div>
                <p className="text-slate-400">
                  This wallet address has not been registered in the smart contract registry for organization{" "}
                  <code className="text-white">{simulatedOrgId}</code>.
                </p>
                <p className="text-slate-400">
                  To register signers, the contract owner or admin calls <code className="text-accent-400">registerWallet()</code>.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-navy-900/60 p-3 rounded border border-navy-800 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Organization:</span>
                    <span className="text-white font-mono font-bold">{onChainAuth.org_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Status:</span>
                    <span className="badge badge-success text-[10px] py-0 px-1.5">ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Registered Block Time:</span>
                    <span className="text-slate-300 font-mono">
                      {new Date(onChainAuth.registered_at * 1000).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-300 mb-2">
                    Authorized Approval Categories
                  </h4>
                  <div className="space-y-1.5">
                    {activeCategories.map((mask) => (
                      <div
                        key={mask}
                        className="bg-navy-900/80 border border-navy-700/80 rounded p-2 text-xs flex items-center justify-between"
                      >
                        <span className="text-white font-medium">
                          {CATEGORY_NAMES[mask] || `Category 0x${mask.toString(16)}`}
                        </span>
                        <code className="text-accent-400 font-mono text-[11px]">
                          0x{mask.toString(16).padStart(2, "0")}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
