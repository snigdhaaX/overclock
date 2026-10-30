import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { Overview } from "./pages/Overview";
import { WalletManagement } from "./pages/WalletManagement";
import { PlanGovernance } from "./pages/PlanGovernance";
import { VerificationCentre } from "./pages/VerificationCentre";
import { TransactionExplorer } from "./pages/TransactionExplorer";
import { TransactionStatus } from "./components/TransactionStatus";
import { useWallet } from "./hooks/useWallet";
import { useContract } from "./hooks/useContract";
import { fetchNetworkStatus } from "./services/api";
import { CONTRACT_ADDRESSES } from "./services/contract";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [contractAddress, setContractAddress] = useState<string>(
    (import.meta.env.VITE_CONTRACT_ADDRESS as string) || ""
  );

  const {
    account,
    chainId,
    isAmoy,
    isSigning,
    walletStatus,
    connect,
    disconnect,
    switchNetwork,
    signAndVerifyNonce,
  } = useWallet();

  const { activeTx, dismissActiveTx } = useContract();

  useEffect(() => {
    if (chainId && CONTRACT_ADDRESSES[chainId]) {
      setContractAddress(CONTRACT_ADDRESSES[chainId]);
      return;
    }
    fetchNetworkStatus()
      .then((res) => {
        if (res.contract_address) {
          setContractAddress(res.contract_address);
        }
      })
      .catch(() => {
        // Handled in pages
      });
  }, [chainId]);

  const handleLinkWallet = async () => {
    try {
      await signAndVerifyNonce("USR-SCM-001", "ORG-APEX-GLOBAL");
    } catch {
      // Handled in hook
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-navy-900 text-slate-100 font-sans">
      {/* Persistent Enterprise Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAmoy={isAmoy}
        networkName={isAmoy ? "Polygon Amoy" : chainId === 31337 ? "Hardhat DevNet" : "Unknown"}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navigation & Status Bar */}
        <Topbar
          account={account}
          chainId={chainId}
          isAmoy={isAmoy}
          contractAddress={contractAddress}
          linkedInfo={walletStatus}
          connect={connect}
          disconnect={disconnect}
          switchNetwork={switchNetwork}
          linkWalletWithNonce={handleLinkWallet}
          isLinking={isSigning}
        />

        {/* Dynamic Route View */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === "overview" && (
              <Overview
                onNavigate={(tab) => {
                  if (tab === "wallets") setActiveTab("wallet");
                  else setActiveTab(tab);
                }}
                connectedAccount={account}
              />
            )}
            {activeTab === "wallet" && <WalletManagement />}
            {activeTab === "governance" && <PlanGovernance />}
            {activeTab === "verification" && <VerificationCentre />}
            {activeTab === "transactions" && <TransactionExplorer />}
          </div>
        </main>
      </div>

      {/* Floating Active Transaction Tracker */}
      <TransactionStatus
        transaction={activeTx}
        onDismiss={dismissActiveTx}
      />
    </div>
  );
};

export default App;
