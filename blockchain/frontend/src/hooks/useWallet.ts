import { useState, useEffect, useCallback } from "react";
import {
  isMetaMaskInstalled,
  getBrowserProvider,
  requestAccounts,
  switchToAmoyNetwork,
  signPersonalMessage,
} from "../services/wallet";
import { api } from "../services/api";
import { LinkedWalletResponse, OnChainWalletInfo } from "../types/blockchain";

export const useWallet = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isLinking, setIsLinking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedInfo, setLinkedInfo] = useState<LinkedWalletResponse | null>(null);
  const [onChainAuth, setOnChainAuth] = useState<OnChainWalletInfo | null>(null);

  const checkInstalled = useCallback(() => {
    const installed = isMetaMaskInstalled();
    setIsInstalled(installed);
    return installed;
  }, []);

  const refreshLinkedStatus = useCallback(async () => {
    try {
      const data = await api.getLinkedWallet();
      setLinkedInfo(data);
      if (data.on_chain_authorization) {
        setOnChainAuth(data.on_chain_authorization);
      }
    } catch {
      // Backend may be offline or unauthenticated in dev
    }
  }, []);

  const refreshOnChainAuth = useCallback(async (walletAddress: string) => {
    try {
      const auth = await api.getWalletAuthorization(walletAddress);
      setOnChainAuth(auth);
    } catch {
      setOnChainAuth(null);
    }
  }, []);

  const connect = async () => {
    setError(null);
    if (!checkInstalled()) {
      setError("MetaMask is not installed. Please install MetaMask to interact with the blockchain.");
      return;
    }
    setIsConnecting(true);
    try {
      const accounts = await requestAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
        const provider = getBrowserProvider();
        if (provider) {
          const network = await provider.getNetwork();
          setChainId(Number(network.chainId));
        }
        await refreshOnChainAuth(accounts[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to MetaMask.");
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    setAccount(null);
    setOnChainAuth(null);
  };

  const linkWalletWithNonce = async () => {
    if (!account) {
      setError("Please connect your wallet first.");
      return;
    }
    setError(null);
    setIsLinking(true);
    try {
      // 1. Get nonce from backend
      const nonceData = await api.requestWalletNonce();

      // 2. Request user signature in MetaMask
      const signature = await signPersonalMessage(nonceData.message);

      // 3. Submit signature to backend
      const res = await api.verifyWalletSignature(account, nonceData.nonce, signature);

      // 4. Update state
      await refreshLinkedStatus();
      if (res.on_chain_status) {
        setOnChainAuth(res.on_chain_status);
      }
      return res;
    } catch (err: any) {
      setError(err.message || "Wallet linking verification failed.");
      throw err;
    } finally {
      setIsLinking(false);
    }
  };

  const unlink = async () => {
    if (!account) return;
    try {
      await api.unlinkWallet(account);
      await refreshLinkedStatus();
    } catch (err: any) {
      setError(err.message || "Failed to unlink wallet.");
    }
  };

  const switchNetwork = async () => {
    try {
      await switchToAmoyNetwork();
    } catch (err: any) {
      setError(err.message || "Failed to switch to Polygon Amoy network.");
    }
  };

  // MetaMask event listeners
  useEffect(() => {
    checkInstalled();
    refreshLinkedStatus();

    const ethereum = (window as any).ethereum;
    if (ethereum && ethereum.on) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setAccount(null);
          setOnChainAuth(null);
        } else {
          setAccount(accounts[0]);
          refreshOnChainAuth(accounts[0]);
        }
      };

      const handleChainChanged = (chainIdHex: string) => {
        setChainId(parseInt(chainIdHex, 16));
      };

      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);

      // Initial check if already connected
      ethereum
        .request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            refreshOnChainAuth(accounts[0]);
          }
        })
        .catch(() => {});

      ethereum
        .request({ method: "eth_chainId" })
        .then((hex: string) => {
          setChainId(parseInt(hex, 16));
        })
        .catch(() => {});

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener("accountsChanged", handleAccountsChanged);
          ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, [checkInstalled, refreshLinkedStatus, refreshOnChainAuth]);

  return {
    account,
    chainId,
    isAmoy: chainId === 80002,
    isInstalled,
    isMetaMaskInstalled: isInstalled,
    isConnecting,
    isLinking,
    isSigning: isLinking,
    error,
    setError,
    linkedInfo,
    walletStatus: linkedInfo,
    onChainAuth,
    connect,
    disconnect,
    linkWalletWithNonce,
    signAndVerifyNonce: async (userId?: string, orgId?: string) => {
      if (userId) localStorage.setItem("trustchain_user_id", userId);
      if (orgId) localStorage.setItem("trustchain_org_id", orgId);
      return linkWalletWithNonce();
    },
    unlink,
    unlinkCurrentWallet: unlink,
    switchNetwork,
    refreshLinkedStatus,
    refreshWalletStatus: refreshLinkedStatus,
    refreshOnChainAuth,
  };
};
