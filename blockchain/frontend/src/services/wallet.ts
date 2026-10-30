import { BrowserProvider, ethers } from "ethers";

export const POLYGON_AMOY_CONFIG = {
  chainId: "0x13882", // 80002
  chainName: "Polygon Amoy Testnet",
  nativeCurrency: {
    name: "POL",
    symbol: "POL",
    decimals: 18,
  },
  rpcUrls: [
    "https://polygon-amoy-bor-rpc.publicnode.com",
    "https://rpc-amoy.polygon.technology/",
  ],
  blockExplorerUrls: ["https://amoy.polygonscan.com/"],
};

export const isMetaMaskInstalled = (): boolean => {
  return typeof window !== "undefined" && Boolean((window as any).ethereum);
};

export const getBrowserProvider = (): BrowserProvider | null => {
  if (!isMetaMaskInstalled()) return null;
  return new BrowserProvider((window as any).ethereum);
};

export const requestAccounts = async (): Promise<string[]> => {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed.");
  const provider = (window as any).ethereum;
  return await provider.request({ method: "eth_requestAccounts" });
};

export const switchToAmoyNetwork = async (): Promise<void> => {
  if (!isMetaMaskInstalled()) throw new Error("MetaMask is not installed.");
  const ethereum = (window as any).ethereum;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_AMOY_CONFIG.chainId }],
    });
  } catch (switchError: any) {
    // 4902 error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      await ethereum.request({
        method: "wallet_addEthereumChain",
        params: [POLYGON_AMOY_CONFIG],
      });
    } else {
      throw switchError;
    }
  }
};

export const signPersonalMessage = async (message: string): Promise<string> => {
  const provider = getBrowserProvider();
  if (!provider) throw new Error("No Web3 provider available.");
  const signer = await provider.getSigner();
  return await signer.signMessage(message);
};

export const getExplorerTxUrl = (chainId: number, txHash: string): string | null => {
  if (chainId === 80002) {
    return `https://amoy.polygonscan.com/tx/${txHash}`;
  }
  return null;
};

export const getExplorerAddressUrl = (chainId: number, address: string): string | null => {
  if (chainId === 80002) {
    return `https://amoy.polygonscan.com/address/${address}`;
  }
  return null;
};
