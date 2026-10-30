import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { blockchainApi } from '../services/blockchainApi';
import { WalletStorage } from '../services/walletStorage';
import {
  LinkedWalletResponse,
  NonceResponse,
  OnChainWalletInfo,
  TrackedTransaction,
} from '../types/blockchain';
import { PreparedTransaction } from '../services/contractEncoder';
import { CONTRACT_ADDRESSES } from '../contracts/TrustChainGovernanceABI';

export interface WalletState {
  walletAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number;
  networkName: string;
  onChainAuth: OnChainWalletInfo | null;
  isAnalystAuthorized: boolean;
  isManagerAuthorized: boolean;
  sessionToken: string | null;
  error: string | null;
  pendingNonce: NonceResponse | null;
  activeTx: TrackedTransaction | null;
}

export function useBlockchainWallet() {
  const [state, setState] = useState<WalletState>({
    walletAddress: null,
    isConnected: false,
    isConnecting: false,
    chainId: CONTRACT_ADDRESSES.local.chainId, // Default to local Hardhat 31337
    networkName: 'Hardhat Local',
    onChainAuth: null,
    isAnalystAuthorized: false,
    isManagerAuthorized: false,
    sessionToken: null,
    error: null,
    pendingNonce: null,
    activeTx: null,
  });

  const evaluateRoles = (auth: OnChainWalletInfo | null) => {
    if (!auth || !auth.active) {
      return { isAnalystAuthorized: false, isManagerAuthorized: false };
    }
    const categories = auth.categories || 0;
    return {
      isAnalystAuthorized: (categories & 0x01) !== 0,
      isManagerAuthorized: (categories & 0x02) !== 0,
    };
  };

  /**
   * Refreshes the active wallet session from SecureStore and backend verification.
   */
  const refreshSession = useCallback(async () => {
    try {
      const stored = await WalletStorage.getSession();
      const resolvedChainId = stored.chainId || CONTRACT_ADDRESSES.local.chainId;
      const resolvedNetworkName =
        resolvedChainId === CONTRACT_ADDRESSES.local.chainId
          ? 'Hardhat Local'
          : resolvedChainId === CONTRACT_ADDRESSES.amoy.chainId
          ? 'Polygon Amoy'
          : `Chain ${resolvedChainId}`;

      // Check active tx persistence across restarts
      let restoredTx: TrackedTransaction | null = null;
      try {
        const activeTxHash = await WalletStorage.getActiveTxHash();
        if (activeTxHash) {
          restoredTx = await blockchainApi.getTransactionStatus(activeTxHash);
        }
      } catch (txErr) {
        console.warn('[useBlockchainWallet] Active tx restore warning:', txErr);
      }

      if (!stored.sessionToken || !stored.walletAddress) {
        setState((prev) => ({
          ...prev,
          isConnected: false,
          walletAddress: null,
          sessionToken: null,
          chainId: resolvedChainId,
          networkName: resolvedNetworkName,
          onChainAuth: null,
          isAnalystAuthorized: false,
          isManagerAuthorized: false,
          activeTx: restoredTx,
        }));
        return;
      }

      // Check linked wallet and on-chain authorization with backend
      const linked = await blockchainApi.getLinkedWallet();
      if (linked.linked && linked.wallet) {
        const { isAnalystAuthorized, isManagerAuthorized } = evaluateRoles(
          linked.on_chain_authorization
        );
        setState((prev) => ({
          ...prev,
          isConnected: true,
          walletAddress: linked.wallet?.wallet_address || stored.walletAddress,
          sessionToken: stored.sessionToken,
          chainId: resolvedChainId,
          networkName: resolvedNetworkName,
          onChainAuth: linked.on_chain_authorization,
          isAnalystAuthorized,
          isManagerAuthorized,
          activeTx: restoredTx,
          error: null,
        }));
      } else {
        // Session invalid on server
        await WalletStorage.clearSession();
        setState((prev) => ({
          ...prev,
          isConnected: false,
          walletAddress: null,
          sessionToken: null,
          chainId: resolvedChainId,
          networkName: resolvedNetworkName,
          onChainAuth: null,
          isAnalystAuthorized: false,
          isManagerAuthorized: false,
          activeTx: restoredTx,
        }));
      }
    } catch (err: any) {
      console.warn('[useBlockchainWallet] Error refreshing session:', err);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  /**
   * Switches the active network between Local Hardhat (31337) and Polygon Amoy (80002).
   */
  const switchNetwork = async (targetChainId: number) => {
    await WalletStorage.saveChainId(targetChainId);
    setState((prev) => ({
      ...prev,
      chainId: targetChainId,
      networkName:
        targetChainId === CONTRACT_ADDRESSES.local.chainId
          ? 'Hardhat Local'
          : targetChainId === CONTRACT_ADDRESSES.amoy.chainId
          ? 'Polygon Amoy'
          : `Chain ${targetChainId}`,
    }));
  };

  /**
   * Generates a new cryptographic nonce from the backend.
   */
  const requestNonce = async (): Promise<NonceResponse> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const nonceRes = await blockchainApi.requestNonce();
      setState((prev) => ({ ...prev, pendingNonce: nonceRes, isConnecting: false }));
      return nonceRes;
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err?.message || 'Failed to request nonce.',
      }));
      throw err;
    }
  };

  /**
   * Submits an EIP-191 signature to verify wallet ownership.
   */
  const verifySignature = async (
    walletAddress: string,
    nonce: string,
    signature: string
  ): Promise<void> => {
    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const verifyRes = await blockchainApi.verifySignature(walletAddress, nonce, signature);

      // Fetch on-chain authorization
      let onChain: OnChainWalletInfo | null = null;
      try {
        onChain = await blockchainApi.getWalletAuthorization(walletAddress);
      } catch (e) {
        console.warn('Could not read on-chain authorization:', e);
      }

      const { isAnalystAuthorized, isManagerAuthorized } = evaluateRoles(onChain);

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        walletAddress: verifyRes.wallet_address,
        sessionToken: verifyRes.session_token,
        onChainAuth: onChain,
        isAnalystAuthorized,
        isManagerAuthorized,
        pendingNonce: null,
        error: null,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err?.message || 'Signature verification failed.',
      }));
      throw err;
    }
  };

  /**
   * Connects via window.ethereum if injected (e.g. web or Web3 browser)
   */
  const connectInjected = async (): Promise<void> => {
    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;
    if (!ethereum) {
      throw new Error(
        'No injected Web3 wallet found. On mobile, please use external wallet signing via MetaMask.'
      );
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));
    try {
      const accounts: string[] = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts selected in wallet.');
      }
      const address = accounts[0];

      // Check Chain ID
      const chainIdHex: string = await ethereum.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(chainIdHex, 16);

      // Request Nonce
      const nonceRes = await blockchainApi.requestNonce();

      // Sign with EIP-191 personal_sign
      const signature: string = await ethereum.request({
        method: 'personal_sign',
        params: [nonceRes.message, address],
      });

      // Verify and Link
      await verifySignature(address, nonceRes.nonce, signature);

      setState((prev) => ({
        ...prev,
        chainId: currentChainId,
        networkName:
          currentChainId === 80002
            ? 'Polygon Amoy'
            : currentChainId === 31337
            ? 'Hardhat Local'
            : `Chain ${currentChainId}`,
      }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: err?.message || 'Failed to connect injected wallet.',
      }));
      throw err;
    }
  };

  /**
   * Opens MetaMask using deep-linking.
   */
  const openMetaMask = async (targetUrl?: string): Promise<boolean> => {
    try {
      const scheme = targetUrl
        ? `https://metamask.app.link/dapp/${targetUrl.replace(/^https?:\/\//, '')}`
        : 'metamask://';

      const canOpen = await Linking.canOpenURL(scheme);
      if (canOpen) {
        await Linking.openURL(scheme);
        return true;
      } else {
        // Fallback to universal link
        await Linking.openURL('https://metamask.io/download/');
        return false;
      }
    } catch (err) {
      console.warn('Could not launch MetaMask:', err);
      return false;
    }
  };

  /**
   * Disconnects the wallet and invalidates backend session.
   */
  const disconnect = async (): Promise<void> => {
    try {
      await blockchainApi.logoutWallet();
    } catch (err) {
      console.warn('Logout API warning:', err);
    } finally {
      await WalletStorage.clearSession();
      setState((prev) => ({
        ...prev,
        walletAddress: null,
        isConnected: false,
        isConnecting: false,
        onChainAuth: null,
        isAnalystAuthorized: false,
        isManagerAuthorized: false,
        sessionToken: null,
        error: null,
        pendingNonce: null,
        activeTx: null,
      }));
    }
  };

  /**
   * Registers an external transaction with the backend indexer.
   */
  const registerTransaction = async (
    txHash: string,
    functionName?: string,
    planId?: string,
    planVersion?: number
  ): Promise<TrackedTransaction> => {
    const cleanHash = txHash.trim();
    if (!/^0x[0-9a-fA-F]{64}$/.test(cleanHash)) {
      throw new Error('Invalid Ethereum transaction hash format (must be 0x followed by 64 hex characters).');
    }

    try {
      const tx = await blockchainApi.registerTransaction({
        tx_hash: cleanHash,
        chain_id: state.chainId || CONTRACT_ADDRESSES.local.chainId,
        function_name: functionName,
        plan_id: planId,
        plan_version: planVersion,
      });

      // Persist active transaction hash to allow recovery across app restarts
      await WalletStorage.saveActiveTxHash(cleanHash);

      setState((prev) => ({ ...prev, activeTx: tx }));
      return tx;
    } catch (err: any) {
      setState((prev) => ({ ...prev, error: err?.message || 'Transaction registration failed.' }));
      throw err;
    }
  };

  /**
   * Clears the active transaction from tracking and persistent storage.
   */
  const clearActiveTx = async () => {
    await WalletStorage.clearActiveTxHash();
    setState((prev) => ({ ...prev, activeTx: null }));
  };

  /**
   * Broadcasts transaction via injected provider if available, or prepares external signing.
   */
  const sendPreparedTransaction = async (
    prepared: PreparedTransaction,
    metadata?: { planId?: string; planVersion?: number }
  ): Promise<{ txHash?: string; deepLinkOpened?: boolean; requiresManualTxHash: boolean }> => {
    // Non-negotiable safety guard: Prevent any state-changing transactions on Polygon Amoy
    if (state.chainId === CONTRACT_ADDRESSES.amoy.chainId || state.chainId === 80002) {
      throw new Error(
        'Safety Guard: State-changing transactions on Polygon Amoy are strictly prohibited during testing. Please switch to Hardhat Local (Chain ID 31337).'
      );
    }

    const ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;

    if (ethereum && state.walletAddress) {
      try {
        const txHash: string = await ethereum.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: state.walletAddress,
              to: prepared.to,
              data: prepared.data,
            },
          ],
        });

        // Register with backend immediately
        await registerTransaction(
          txHash,
          prepared.functionName,
          metadata?.planId,
          metadata?.planVersion
        );

        return { txHash, requiresManualTxHash: false };
      } catch (err: any) {
        throw new Error(err?.message || 'Transaction was rejected in wallet.');
      }
    }

    // On native mobile without injected provider:
    // Prompt external wallet (MetaMask) via deep link
    const deepLink = `ethereum:${prepared.to}?data=${prepared.data}&chainId=${prepared.chainId}`;
    const opened = await openMetaMask();

    return {
      deepLinkOpened: opened,
      requiresManualTxHash: true,
    };
  };

  return {
    ...state,
    switchNetwork,
    requestNonce,
    verifySignature,
    connectInjected,
    openMetaMask,
    disconnect,
    registerTransaction,
    clearActiveTx,
    sendPreparedTransaction,
    refreshSession,
  };
}
