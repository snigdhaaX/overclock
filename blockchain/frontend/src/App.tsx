import React, { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { ExecutiveOverview } from "./pages/ExecutiveOverview";
import { DisruptionIntelligence } from "./pages/DisruptionIntelligence";
import { SupplyChainNetwork } from "./pages/SupplyChainNetwork";
import { RecoveryPlanning } from "./pages/RecoveryPlanning";
import { SimulationOptimisation } from "./pages/SimulationOptimisation";
import { PlanGovernance } from "./pages/PlanGovernance";
import { VerificationCentre } from "./pages/VerificationCentre";
import { TransactionExplorer } from "./pages/TransactionExplorer";
import { WalletManagement } from "./pages/WalletManagement";
import { TransactionStatus } from "./components/TransactionStatus";
import { useWallet } from "./hooks/useWallet";
import { useContract } from "./hooks/useContract";
import { fetchNetworkStatus } from "./services/api";
import { CONTRACT_ADDRESSES } from "./services/contract";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [selectedIncidentCode, setSelectedIncidentCode] = useState<string>("INC-2026-0881");
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
        // Handled in components
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
        networkName={isAmoy ? "Polygon Amoy" : chainId === 31337 ? "Hardhat DevNet" : "Hardhat (31337)"}
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
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === "overview" && (
              <ExecutiveOverview
                onNavigate={(tab) => {
                  if (tab === "wallets") setActiveTab("wallet");
                  else setActiveTab(tab);
                }}
                connectedAccount={account}
              />
            )}

            {activeTab === "disruptions" && (
              <DisruptionIntelligence
                onSelectRecoveryIncident={(incidentCode) => {
                  setSelectedIncidentCode(incidentCode);
                  setActiveTab("recovery-planning");
                }}
              />
            )}

            {activeTab === "network" && <SupplyChainNetwork initialTab="network" />}
            {activeTab === "suppliers" && <SupplyChainNetwork initialTab="suppliers" />}
            {activeTab === "purchase-orders" && <SupplyChainNetwork initialTab="purchase-orders" />}
            {activeTab === "shipments" && <SupplyChainNetwork initialTab="shipments" />}
            {activeTab === "inventory" && <SupplyChainNetwork initialTab="inventory" />}

            {activeTab === "recovery-planning" && (
              <RecoveryPlanning
                initialIncidentCode={selectedIncidentCode}
                onNavigateToGovernance={(_planId) => {
                  setActiveTab("governance");
                }}
              />
            )}

            {activeTab === "simulation" && <SimulationOptimisation />}

            {activeTab === "governance" && <PlanGovernance />}
            {activeTab === "verification" && <VerificationCentre />}
            {activeTab === "transactions" && <TransactionExplorer />}
            {activeTab === "wallet" && <WalletManagement />}
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
