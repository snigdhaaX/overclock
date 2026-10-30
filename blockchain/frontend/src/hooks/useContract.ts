import { useState, useCallback, useEffect } from "react";
import { ethers, keccak256, toUtf8Bytes } from "ethers";
import { getBrowserProvider } from "../services/wallet";
import { getContractWithSigner, encodeBytes32, CONTRACT_ADDRESSES } from "../services/contract";
import { api } from "../services/api";
import { TrackedTransaction } from "../types/blockchain";

export const useContract = (providedContractAddress?: string) => {
  const [contractAddress, setContractAddress] = useState<string>(
    providedContractAddress || (import.meta.env.VITE_CONTRACT_ADDRESS as string) || ""
  );
  const [activeTx, setActiveTx] = useState<TrackedTransaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txError, setTxError] = useState<string | null>(null);

  // Auto-discover contract address based on connected network or backend
  useEffect(() => {
    if (providedContractAddress) {
      setContractAddress(providedContractAddress);
      return;
    }
    const provider = getBrowserProvider();
    if (provider) {
      provider
        .getNetwork()
        .then((net) => {
          const cid = Number(net.chainId);
          if (CONTRACT_ADDRESSES[cid]) {
            setContractAddress(CONTRACT_ADDRESSES[cid]);
            return;
          }
        })
        .catch(() => {});
    }
    api
      .getNetworkInfo()
      .then((info) => {
        if (info.contract_address) {
          setContractAddress(info.contract_address);
        }
      })
      .catch(() => {});
  }, [providedContractAddress]);

  const executeContractTx = useCallback(
    async (
      functionName: string,
      planId: string | null,
      planVersion: number | null,
      contractCall: (contract: ethers.Contract) => Promise<ethers.ContractTransactionResponse>
    ) => {
      setTxError(null);
      setIsSubmitting(true);
      setActiveTx(null);

      const provider = getBrowserProvider();
      if (!provider) {
        setIsSubmitting(false);
        throw new Error("MetaMask is not available. Please install and unlock MetaMask.");
      }

      const activeAddress = contractAddress || providedContractAddress;
      if (!activeAddress || !ethers.isAddress(activeAddress)) {
        setIsSubmitting(false);
        throw new Error("Valid smart contract address is not configured or deployed.");
      }

      try {
        const contract = await getContractWithSigner(activeAddress, provider);

        // 1. Submit transaction to blockchain via MetaMask
        const txResponse = await contractCall(contract);

        // 2. Register transaction with FastAPI
        const tracked = await api.registerTransaction({
          tx_hash: txResponse.hash,
          chain_id: Number(txResponse.chainId),
          function_name: functionName,
          plan_id: planId || undefined,
          plan_version: planVersion || undefined,
        });
        setActiveTx(tracked);

        // 3. Wait for receipt on-chain
        const receipt = await txResponse.wait(1);

        // 4. Force status reconciliation and event indexing in backend
        const reconciled = await api.reconcileTransaction(txResponse.hash);
        setActiveTx(reconciled);

        return { receipt, tracked: reconciled };
      } catch (err: any) {
        let msg = err.message || "Smart contract transaction failed.";
        if (err.data) {
          msg = `Execution reverted: ${err.data}`;
        } else if (err.reason) {
          msg = `Revert: ${err.reason}`;
        } else if (err.code === "ACTION_REJECTED") {
          msg = "Transaction was rejected by user in MetaMask.";
        }
        setTxError(msg);
        throw new Error(msg);
      } finally {
        setIsSubmitting(false);
      }
    },
    [contractAddress, providedContractAddress]
  );

  const anchorPlan = useCallback(
    async (
      planId: string,
      version: number,
      planHash: string,
      simulationHash: string,
      actionMask: number,
      additionalStages: number = 0
    ) => {
      return executeContractTx(
        "anchorPlan",
        planId,
        version,
        (contract) =>
          contract["anchorPlan(bytes32,uint32,bytes32,bytes32,uint8,uint8)"](
            encodeBytes32(planId),
            version,
            planHash,
            simulationHash,
            actionMask,
            additionalStages
          )
      );
    },
    [executeContractTx]
  );

  const approvePlan = useCallback(
    async (planId: string, version: number, stage: number) => {
      return executeContractTx(
        "approvePlan",
        planId,
        version,
        (contract) =>
          contract.approvePlan(encodeBytes32(planId), version, stage)
      );
    },
    [executeContractTx]
  );

  const formatReasonHash = (reason: string): string => {
    if (!reason || reason.trim() === "") {
      return "0x0000000000000000000000000000000000000000000000000000000000000000";
    }
    if (reason.startsWith("0x") && reason.length === 66) {
      return reason;
    }
    return keccak256(toUtf8Bytes(reason.trim()));
  };

  const rejectPlan = useCallback(
    async (planId: string, version: number, stage: number, reason: string) => {
      const reasonHash = formatReasonHash(reason);
      return executeContractTx(
        "rejectPlan",
        planId,
        version,
        (contract) =>
          contract.rejectPlan(encodeBytes32(planId), version, stage, reasonHash)
      );
    },
    [executeContractTx]
  );

  const requestRevision = useCallback(
    async (planId: string, version: number, stage: number, reason: string) => {
      const reasonHash = formatReasonHash(reason);
      return executeContractTx(
        "requestRevision",
        planId,
        version,
        (contract) =>
          contract.requestRevision(
            encodeBytes32(planId),
            version,
            stage,
            reasonHash
          )
      );
    },
    [executeContractTx]
  );

  const anchorExecution = useCallback(
    async (planId: string, version: number, evidenceHash: string) => {
      return executeContractTx(
        "anchorExecution",
        planId,
        version,
        (contract) =>
          contract.anchorExecution(
            encodeBytes32(planId),
            version,
            evidenceHash
          )
      );
    },
    [executeContractTx]
  );

  const dismissActiveTx = useCallback(() => {
    setActiveTx(null);
  }, []);

  return {
    contractAddress,
    isSubmitting,
    activeTx,
    txError,
    error: txError,
    setTxError,
    anchorPlan,
    anchorRecoveryPlan: (
      planId: string,
      orgId: string,
      planHash: string,
      simulationHash: string,
      actionMask: number
    ) => anchorPlan(planId, 1, planHash, simulationHash, actionMask),
    approvePlan,
    approveRecoveryPlan: approvePlan,
    rejectPlan,
    rejectRecoveryPlan: rejectPlan,
    requestRevision,
    requestRevisionRecoveryPlan: requestRevision,
    anchorExecution,
    anchorExecutionEvidence: anchorExecution,
    dismissActiveTx,
  };
};
