import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import {
  Wallet,
  ShieldCheck,
  ShieldAlert,
  LogOut,
  ExternalLink,
  KeyRound,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react-native';
import { useBlockchainWallet } from '../../hooks/useBlockchainWallet';
import BlockchainNetworkBadge from './BlockchainNetworkBadge';

interface WalletConnectionCardProps {
  requiredRole?: 'operations-analyst' | 'supply-chain-manager';
  onWalletConnected?: (address: string) => void;
}

export default function WalletConnectionCard({
  requiredRole = 'operations-analyst',
  onWalletConnected,
}: WalletConnectionCardProps) {
  const {
    walletAddress,
    isConnected,
    isConnecting,
    chainId,
    networkName,
    onChainAuth,
    isAnalystAuthorized,
    isManagerAuthorized,
    pendingNonce,
    error,
    switchNetwork,
    requestNonce,
    verifySignature,
    connectInjected,
    openMetaMask,
    disconnect,
  } = useBlockchainWallet();

  const [inputAddress, setInputAddress] = useState('');
  const [inputSignature, setInputSignature] = useState('');
  const [showManualSign, setShowManualSign] = useState(false);
  const [signStep, setSignStep] = useState<'idle' | 'nonce_requested' | 'verifying'>('idle');

  const isCurrentRoleAuthorized =
    requiredRole === 'operations-analyst' ? isAnalystAuthorized : isManagerAuthorized;

  const handleStartConnect = async () => {
    // 1. If injected provider is available (e.g. Web or Web3 DApp browser)
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      try {
        await connectInjected();
        return;
      } catch (err: any) {
        console.warn('Injected connection failed, falling back to external signature:', err);
      }
    }

    // 2. Mobile external signing flow: request nonce
    try {
      setSignStep('nonce_requested');
      setShowManualSign(true);
      await requestNonce();
    } catch (err: any) {
      Alert.alert('Connection Error', err?.message || 'Could not request nonce.');
      setSignStep('idle');
    }
  };

  const handleOpenMetaMask = async () => {
    const opened = await openMetaMask();
    if (!opened) {
      Alert.alert(
        'MetaMask Required',
        'Please ensure MetaMask mobile is installed or open your DApp in MetaMask browser.'
      );
    }
  };

  const handleSubmitSignature = async () => {
    if (!inputAddress.trim()) {
      Alert.alert('Missing Address', 'Please provide your Ethereum wallet address.');
      return;
    }
    if (!inputSignature.trim()) {
      Alert.alert('Missing Signature', 'Please provide the EIP-191 signature hex from your wallet.');
      return;
    }
    if (!pendingNonce) {
      Alert.alert('Missing Nonce', 'Please request a fresh nonce first.');
      return;
    }

    try {
      setSignStep('verifying');
      await verifySignature(inputAddress.trim(), pendingNonce.nonce, inputSignature.trim());
      setSignStep('idle');
      setShowManualSign(false);
      if (onWalletConnected) {
        onWalletConnected(inputAddress.trim());
      }
      Alert.alert('Wallet Linked', 'Cryptographic wallet ownership successfully authenticated.');
    } catch (err: any) {
      setSignStep('nonce_requested');
      Alert.alert('Verification Failed', err?.message || 'Signature does not match nonce.');
    }
  };

  const handleCopyChallenge = () => {
    if (!pendingNonce) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(pendingNonce.message);
      Alert.alert('Copied', 'EIP-191 challenge copied to clipboard.');
    } else {
      Alert.alert('Challenge Message', pendingNonce.message);
    }
  };

  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
    : '';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topRowLeft}>
          <View style={[styles.iconBox, isConnected ? styles.iconBoxConnected : styles.iconBoxIdle]}>
            <Wallet size={16} color={isConnected ? '#16A34A' : '#2563EB'} />
          </View>
          <View>
            <Text style={styles.cardTitle}>
              {isConnected ? 'Governance Wallet Active' : 'External Wallet Connection'}
            </Text>
            <Text style={styles.cardSubtitle}>
              {isConnected
                ? isCurrentRoleAuthorized
                  ? `Authorized ${requiredRole === 'operations-analyst' ? 'Analyst' : 'Manager'}`
                  : 'Role Unauthorized On-Chain'
                : 'Polygon Amoy / Hardhat Web3 Verification'}
            </Text>
          </View>
        </View>

        <BlockchainNetworkBadge chainId={chainId} networkName={networkName} connected={isConnected} />
      </View>

      {/* Network Selector Row */}
      <View style={styles.networkSelectorRow}>
        <Text style={styles.networkSelectorLabel}>TARGET NETWORK:</Text>
        <View style={styles.networkPillsContainer}>
          <Pressable
            onPress={() => switchNetwork(31337)}
            style={[styles.networkPill, chainId === 31337 && styles.networkPillActive]}
          >
            <Text style={[styles.networkPillText, chainId === 31337 && styles.networkPillTextActive]}>
              Hardhat Local (31337)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchNetwork(80002)}
            style={[styles.networkPill, chainId === 80002 && styles.networkPillActive]}
          >
            <Text style={[styles.networkPillText, chainId === 80002 && styles.networkPillTextActive]}>
              Polygon Amoy (80002)
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Connected State */}
      {isConnected ? (
        <View style={styles.connectedContainer}>
          <View style={styles.walletDetailsRow}>
            <View>
              <Text style={styles.label}>SIGNING ADDRESS</Text>
              <Text style={styles.addressText} numberOfLines={1}>
                {truncatedAddress}
              </Text>
            </View>

            <View style={styles.roleBadges}>
              {isAnalystAuthorized && (
                <View style={[styles.pill, styles.pillAnalyst]}>
                  <Text style={styles.pillTextAnalyst}>Analyst</Text>
                </View>
              )}
              {isManagerAuthorized && (
                <View style={[styles.pill, styles.pillManager]}>
                  <Text style={styles.pillTextManager}>Manager</Text>
                </View>
              )}
            </View>
          </View>

          {!isCurrentRoleAuthorized && (
            <View style={styles.warningBox}>
              <ShieldAlert size={14} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.warningText}>
                This wallet does not have on-chain {requiredRole === 'operations-analyst' ? 'Analyst' : 'Manager'} authorization in the TrustChain contract.
              </Text>
            </View>
          )}

          <Pressable onPress={disconnect} style={styles.disconnectBtn}>
            <LogOut size={13} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.disconnectBtnText}>Disconnect & Revoke Session</Text>
          </Pressable>
        </View>
      ) : (
        /* Disconnected / Connect flow */
        <View style={styles.connectContainer}>
          <Text style={styles.noticeText}>
            Custody remains in your external wallet. Sign a single-use EIP-191 challenge to authenticate governance actions.
          </Text>

          <View style={styles.buttonRow}>
            <Pressable
              onPress={handleStartConnect}
              disabled={isConnecting}
              style={[styles.primaryConnectBtn, isConnecting && styles.btnDisabled]}
            >
              {isConnecting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <KeyRound size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryConnectBtnText}>Authenticate Wallet</Text>
                </>
              )}
            </Pressable>

            <Pressable onPress={handleOpenMetaMask} style={styles.secondaryMetaMaskBtn}>
              <ExternalLink size={14} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.secondaryMetaMaskBtnText}>MetaMask</Text>
            </Pressable>
          </View>

          {/* Manual EIP-191 Signing Modal/Form */}
          {showManualSign && (
            <View style={styles.manualSignBox}>
              <Text style={styles.manualSignTitle}>EIP-191 Nonce Challenge</Text>

              {pendingNonce && (
                <View style={styles.nonceDisplay}>
                  <Text style={styles.nonceLabel}>MESSAGE TO SIGN:</Text>
                  <Text style={styles.nonceText} selectable>
                    {pendingNonce.message}
                  </Text>
                  <Pressable onPress={handleCopyChallenge} style={styles.copyChallengeBtn}>
                    <Text style={styles.copyChallengeBtnText}>Copy Challenge Message</Text>
                  </Pressable>
                </View>
              )}

              {/* Local Hardhat Quick-Fill Helpers */}
              {chainId === 31337 && (
                <View style={styles.quickFillContainer}>
                  <Text style={styles.quickFillTitle}>Local Hardhat Test Identities:</Text>
                  <View style={styles.quickFillBtnRow}>
                    <Pressable
                      onPress={() => setInputAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8')}
                      style={styles.quickFillBtn}
                    >
                      <Text style={styles.quickFillBtnText}>Analyst (0x7099...)</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setInputAddress('0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC')}
                      style={styles.quickFillBtn}
                    >
                      <Text style={styles.quickFillBtnText}>Manager (0x3C44...)</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              <Text style={styles.inputLabel}>YOUR ETHEREUM ADDRESS:</Text>
              <TextInput
                style={styles.input}
                placeholder="0x..."
                placeholderTextColor="#94A3B8"
                value={inputAddress}
                onChangeText={setInputAddress}
                autoCapitalize="none"
              />

              <Text style={styles.inputLabel}>WALLET SIGNATURE (HEX):</Text>
              <TextInput
                style={styles.input}
                placeholder="0x..."
                placeholderTextColor="#94A3B8"
                value={inputSignature}
                onChangeText={setInputSignature}
                autoCapitalize="none"
              />

              <Pressable
                onPress={handleSubmitSignature}
                disabled={signStep === 'verifying'}
                style={[styles.verifyBtn, signStep === 'verifying' && styles.btnDisabled]}
              >
                {signStep === 'verifying' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.verifyBtnText}>Verify & Link Session</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      )}

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  topRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxConnected: {
    backgroundColor: '#F0FDF4',
  },
  iconBoxIdle: {
    backgroundColor: '#EFF6FF',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  connectedContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  walletDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#0F172A',
  },
  roleBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillAnalyst: {
    backgroundColor: '#EFF6FF',
  },
  pillTextAnalyst: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  pillManager: {
    backgroundColor: '#F0FDF4',
  },
  pillTextManager: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 11,
    color: '#B91C1C',
    flex: 1,
  },
  disconnectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 4,
  },
  disconnectBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  connectContainer: {
    marginTop: 4,
  },
  noticeText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryConnectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryConnectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryMetaMaskBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryMetaMaskBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  manualSignBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 12,
  },
  manualSignTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  nonceDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  nonceLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  nonceText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#334155',
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    color: '#0F172A',
  },
  verifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 12,
  },
  verifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  errorBanner: {
    backgroundColor: '#FEF2F2',
    padding: 8,
    borderRadius: 6,
    marginTop: 10,
  },
  errorBannerText: {
    fontSize: 11,
    color: '#B91C1C',
  },
  networkSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    marginBottom: 8,
  },
  networkSelectorLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  networkPillsContainer: {
    flexDirection: 'row',
    gap: 6,
  },
  networkPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  networkPillActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
  },
  networkPillText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  networkPillTextActive: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  copyChallengeBtn: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  copyChallengeBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  quickFillContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickFillTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  quickFillBtnRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickFillBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  quickFillBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#334155',
  },
});
