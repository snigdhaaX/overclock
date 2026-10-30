import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const SESSION_TOKEN_KEY = 'trustchain_wallet_session_token';
const WALLET_ADDRESS_KEY = 'trustchain_wallet_address';
const USER_ID_KEY = 'trustchain_wallet_user_id';
const ORG_ID_KEY = 'trustchain_wallet_org_id';
const CHAIN_ID_KEY = 'trustchain_wallet_chain_id';
const ACTIVE_TX_KEY = 'trustchain_wallet_active_tx';

export interface StoredWalletSession {
  sessionToken: string | null;
  walletAddress: string | null;
  userId: string | null;
  organizationId: string | null;
  chainId: number | null;
}

export const WalletStorage = {
  async saveSession(session: {
    sessionToken: string;
    walletAddress: string;
    userId: string;
    organizationId: string;
    chainId?: number;
  }): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(SESSION_TOKEN_KEY, session.sessionToken);
        localStorage.setItem(WALLET_ADDRESS_KEY, session.walletAddress);
        localStorage.setItem(USER_ID_KEY, session.userId);
        localStorage.setItem(ORG_ID_KEY, session.organizationId);
        if (session.chainId) {
          localStorage.setItem(CHAIN_ID_KEY, session.chainId.toString());
        }
      } catch (e) {
        console.warn('LocalStorage error saving wallet session:', e);
      }
    } else {
      await SecureStore.setItemAsync(SESSION_TOKEN_KEY, session.sessionToken);
      await SecureStore.setItemAsync(WALLET_ADDRESS_KEY, session.walletAddress);
      await SecureStore.setItemAsync(USER_ID_KEY, session.userId);
      await SecureStore.setItemAsync(ORG_ID_KEY, session.organizationId);
      if (session.chainId) {
        await SecureStore.setItemAsync(CHAIN_ID_KEY, session.chainId.toString());
      }
    }
  },

  async saveChainId(chainId: number): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(CHAIN_ID_KEY, chainId.toString());
      } catch (e) {
        console.warn('LocalStorage error saving chain ID:', e);
      }
    } else {
      await SecureStore.setItemAsync(CHAIN_ID_KEY, chainId.toString());
    }
  },

  async getSession(): Promise<StoredWalletSession> {
    try {
      if (Platform.OS === 'web') {
        const sessionToken = localStorage.getItem(SESSION_TOKEN_KEY);
        const walletAddress = localStorage.getItem(WALLET_ADDRESS_KEY);
        const userId = localStorage.getItem(USER_ID_KEY);
        const organizationId = localStorage.getItem(ORG_ID_KEY);
        const chainIdStr = localStorage.getItem(CHAIN_ID_KEY);
        return {
          sessionToken,
          walletAddress,
          userId,
          organizationId,
          chainId: chainIdStr ? parseInt(chainIdStr, 10) : null,
        };
      } else {
        const sessionToken = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
        const walletAddress = await SecureStore.getItemAsync(WALLET_ADDRESS_KEY);
        const userId = await SecureStore.getItemAsync(USER_ID_KEY);
        const organizationId = await SecureStore.getItemAsync(ORG_ID_KEY);
        const chainIdStr = await SecureStore.getItemAsync(CHAIN_ID_KEY);
        return {
          sessionToken,
          walletAddress,
          userId,
          organizationId,
          chainId: chainIdStr ? parseInt(chainIdStr, 10) : null,
        };
      }
    } catch {
      return {
        sessionToken: null,
        walletAddress: null,
        userId: null,
        organizationId: null,
        chainId: null,
      };
    }
  },

  async saveActiveTxHash(txHash: string): Promise<void> {
    if (Platform.OS === 'web') {
      try {
        localStorage.setItem(ACTIVE_TX_KEY, txHash);
      } catch {}
    } else {
      await SecureStore.setItemAsync(ACTIVE_TX_KEY, txHash);
    }
  },

  async getActiveTxHash(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(ACTIVE_TX_KEY);
      } else {
        return await SecureStore.getItemAsync(ACTIVE_TX_KEY);
      }
    } catch {
      return null;
    }
  },

  async clearActiveTxHash(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(ACTIVE_TX_KEY);
      } else {
        await SecureStore.deleteItemAsync(ACTIVE_TX_KEY);
      }
    } catch {}
  },

  async clearSession(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(SESSION_TOKEN_KEY);
        localStorage.removeItem(WALLET_ADDRESS_KEY);
        localStorage.removeItem(USER_ID_KEY);
        localStorage.removeItem(ORG_ID_KEY);
        localStorage.removeItem(CHAIN_ID_KEY);
      } else {
        await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
        await SecureStore.deleteItemAsync(WALLET_ADDRESS_KEY);
        await SecureStore.deleteItemAsync(USER_ID_KEY);
        await SecureStore.deleteItemAsync(ORG_ID_KEY);
        await SecureStore.deleteItemAsync(CHAIN_ID_KEY);
      }
    } catch (e) {
      console.warn('Error clearing wallet session:', e);
    }
  },
};
