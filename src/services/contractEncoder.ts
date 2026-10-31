import { ethers } from 'ethers';
import { TRUSTCHAIN_GOVERNANCE_ABI, CONTRACT_ADDRESSES } from '../contracts/TrustChainGovernanceABI';

const iface = new ethers.Interface(TRUSTCHAIN_GOVERNANCE_ABI);

export interface PreparedTransaction {
  to: string;
  data: string;
  functionName: string;
  chainId: number;
}

export const encodeBytes32 = (str: string): string => {
  if (str.startsWith('0x') && str.length === 66) {
    return str;
  }
  return ethers.encodeBytes32String(str);
};

export const ContractEncoder = {
  getContractAddress(isLocal: boolean = false): string {
    return isLocal ? CONTRACT_ADDRESSES.localhost.address : CONTRACT_ADDRESSES.amoy.address;
  },

  getChainId(isLocal: boolean = false): number {
    return isLocal ? CONTRACT_ADDRESSES.localhost.chainId : CONTRACT_ADDRESSES.amoy.chainId;
  },

  encodeBytes32,

  /**
   * Encodes anchorPlan(bytes32,uint32,bytes32,bytes32,uint8,uint8)
   */
  encodeAnchorPlan(
    planId: string,
    version: number,
    planHash: string,
    simulationHash: string,
    actionMask: number,
    requiredStages: number,
    isLocal: boolean = false
  ): PreparedTransaction {
    const formattedPlanHash = planHash.startsWith('0x') ? planHash : `0x${planHash}`;
    const formattedSimHash = simulationHash.startsWith('0x') ? simulationHash : `0x${simulationHash}`;

    const data = iface.encodeFunctionData('anchorPlan', [
      encodeBytes32(planId),
      version,
      formattedPlanHash,
      formattedSimHash,
      actionMask,
      requiredStages,
    ]);

    return {
      to: this.getContractAddress(isLocal),
      data,
      functionName: 'anchorPlan',
      chainId: this.getChainId(isLocal),
    };
  },

  /**
   * Encodes approvePlan(bytes32,uint32,uint8)
   */
  encodeApprovePlan(
    planId: string,
    version: number,
    stage: number,
    isLocal: boolean = false
  ): PreparedTransaction {
    const data = iface.encodeFunctionData('approvePlan', [encodeBytes32(planId), version, stage]);

    return {
      to: this.getContractAddress(isLocal),
      data,
      functionName: 'approvePlan',
      chainId: this.getChainId(isLocal),
    };
  },

  /**
   * Encodes rejectPlan(bytes32,uint32,uint8,bytes32)
   */
  encodeRejectPlan(
    planId: string,
    version: number,
    stage: number,
    reasonHash: string,
    isLocal: boolean = false
  ): PreparedTransaction {
    const formattedReasonHash = reasonHash.startsWith('0x') ? reasonHash : `0x${reasonHash}`;
    const data = iface.encodeFunctionData('rejectPlan', [
      encodeBytes32(planId),
      version,
      stage,
      formattedReasonHash,
    ]);

    return {
      to: this.getContractAddress(isLocal),
      data,
      functionName: 'rejectPlan',
      chainId: this.getChainId(isLocal),
    };
  },

  /**
   * Encodes requestRevision(bytes32,uint32,uint8,bytes32)
   */
  encodeRequestRevision(
    planId: string,
    version: number,
    stage: number,
    reasonHash: string,
    isLocal: boolean = false
  ): PreparedTransaction {
    const formattedReasonHash = reasonHash.startsWith('0x') ? reasonHash : `0x${reasonHash}`;
    const data = iface.encodeFunctionData('requestRevision', [
      encodeBytes32(planId),
      version,
      stage,
      formattedReasonHash,
    ]);

    return {
      to: this.getContractAddress(isLocal),
      data,
      functionName: 'requestRevision',
      chainId: this.getChainId(isLocal),
    };
  },

  /**
   * Encodes anchorExecution(bytes32,uint32,bytes32)
   */
  encodeAnchorExecutionEvidence(
    planId: string,
    version: number,
    executionEvidenceHash: string,
    isLocal: boolean = false
  ): PreparedTransaction {
    const formattedHash = executionEvidenceHash.startsWith('0x')
      ? executionEvidenceHash
      : `0x${executionEvidenceHash}`;

    const data = iface.encodeFunctionData('anchorExecution', [
      encodeBytes32(planId),
      version,
      formattedHash,
    ]);

    return {
      to: this.getContractAddress(isLocal),
      data,
      functionName: 'anchorExecution',
      chainId: this.getChainId(isLocal),
    };
  },

  /**
   * Helper to compute bytes32 keccak256 hash of a string (e.g. rejection or revision reason)
   */
  hashString(text: string): string {
    return ethers.keccak256(ethers.toUtf8Bytes(text.trim()));
  },
};
