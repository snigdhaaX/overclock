import { BrowserProvider, Contract, ethers } from "ethers";
import TrustChainGovernanceArtifact from "../contracts/TrustChainGovernance.json";

// Authoritative full ABI directly loaded from compiled Hardhat artifact
export const TRUSTCHAIN_GOVERNANCE_ABI = TrustChainGovernanceArtifact.abi;

// Network-specific verified deployments
export const CONTRACT_ADDRESSES: Record<number, string> = {
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  80002: "0x33D476cE98f8a374C73D3eDa5FDE65917bA3e24A",
};

export const encodeBytes32 = (str: string): string => {
  if (str.startsWith("0x") && str.length === 66) {
    return str;
  }
  return ethers.encodeBytes32String(str);
};

export const getContractWithSigner = async (
  contractAddress: string,
  provider: BrowserProvider
): Promise<Contract> => {
  const signer = await provider.getSigner();
  return new Contract(contractAddress, TRUSTCHAIN_GOVERNANCE_ABI, signer);
};

export const getReadOnlyContract = (
  contractAddress: string,
  provider: BrowserProvider | ethers.JsonRpcProvider
): Contract => {
  return new Contract(contractAddress, TRUSTCHAIN_GOVERNANCE_ABI, provider);
};
