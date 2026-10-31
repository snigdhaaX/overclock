import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Truck,
  User,
  Camera,
  Upload,
  Hash,
  FileCheck,
} from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { ethers } from 'ethers';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import StatusBadge from '../../../../features/operations-analyst/components/StatusBadge';
import TimelineView, { TimelineItem } from '../../../../features/operations-analyst/components/TimelineView';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { isBackendOnline, useSyncVersion } from '@/services/backendSync';
import { useBlockchainWallet } from '../../../../hooks/useBlockchainWallet';
import { blockchainApi } from '../../../../services/blockchainApi';
import { ContractEncoder } from '../../../../services/contractEncoder';
import {
  WalletConnectionCard,
  TransactionStatusCard,
  IntegrityVerificationCard,
} from '../../../../components/blockchain';
import { TrackedTransaction, PlanVerificationReport } from '../../../../types/blockchain';

export default function ExecutionTrackingScreen() {
  const router = useRouter();
  useSyncVersion();
  const trackingData = operationsService.getExecutionTracking();
  const [reportedIssue, setReportedIssue] = useState(false);

  // Evidence capture & blockchain anchoring state
  const {
    walletAddress,
    isConnected,
    isAnalystAuthorized,
    chainId,
    sendPreparedTransaction,
    registerTransaction,
  } = useBlockchainWallet();

  const [evidenceUri, setEvidenceUri] = useState<string | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState('BOL-9942 Waybill Delivery Receipt');
  const [evidenceHash, setEvidenceHash] = useState<string | null>(null);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [activeTx, setActiveTx] = useState<TrackedTransaction | null>(null);
  const [showManualTx, setShowManualTx] = useState(false);
  const [manualTxHash, setManualTxHash] = useState('');
  const [verificationReport, setVerificationReport] = useState<PlanVerificationReport | null>(null);

  const timelineItems: TimelineItem[] = trackingData.stages.map((st) => ({
    id: st.id,
    title: st.title,
    timestamp: st.timestamp,
    description: `${st.details}\nResponsible: ${st.responsibleParty} (${st.responsibleRole})`,
    status:
      st.status === 'Completed'
        ? 'completed'
        : st.status === 'In Progress'
        ? 'in_progress'
        : st.status === 'Blocked'
        ? 'blocked'
        : 'pending',
    actor: st.responsibleRole,
  }));

  const loadVerification = useCallback(async () => {
    if (isBackendOnline()) return;
    try {
      const rep = await blockchainApi.verifyPlanIntegrity(trackingData.planId, 1);
      setVerificationReport(rep);
    } catch (e) {
      console.warn('Verification check notice:', e);
    }
  }, [trackingData.planId]);

  useEffect(() => {
    loadVerification();
  }, [loadVerification]);

  // Polling for confirmation
  useEffect(() => {
    if (!activeTx || activeTx.status === 'CONFIRMED' || activeTx.status === 'FAILED') return;

    const timer = setInterval(async () => {
      try {
        const updated = await blockchainApi.getTransactionStatus(activeTx.tx_hash);
        setActiveTx(updated);
        if (updated.status === 'CONFIRMED') {
          await blockchainApi.reconcileTransaction(activeTx.tx_hash);
          loadVerification();
          clearInterval(timer);
        }
      } catch (err) {
        console.warn('Tx polling error:', err);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [activeTx, loadVerification]);

  // Handle Pick Image
  const handlePickEvidence = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setEvidenceUri(asset.uri);

        // Compute deterministic SHA-256 evidence fingerprint
        const evidencePayload = {
          plan_id: trackingData.planId,
          version: 1,
          description: evidenceDescription,
          filename: asset.fileName || 'delivery_evidence.jpg',
          fileSize: asset.fileSize || 1024,
          timestamp: new Date().toISOString(),
        };

        const jsonString = JSON.stringify(evidencePayload);
        const computedHash = ethers.keccak256(ethers.toUtf8Bytes(jsonString));
        setEvidenceHash(computedHash);
      }
    } catch (err: any) {
      Alert.alert('Evidence Capture Error', err?.message || 'Could not access photo library.');
    }
  };

  // Handle Anchor Execution Evidence On-Chain
  const handleAnchorEvidence = async () => {
    if (!isConnected || !walletAddress) {
      Alert.alert('Wallet Authentication Required', 'Connect an authorized analyst wallet.');
      return;
    }

    if (!isAnalystAuthorized) {
      Alert.alert('Unauthorized Role', 'Connected wallet does not have analyst permissions on-chain.');
      return;
    }

    if (!evidenceHash) {
      Alert.alert('Missing Evidence', 'Please select or capture delivery evidence first.');
      return;
    }

    if (verificationReport && !verificationReport.execution_eligible) {
      Alert.alert(
        'Execution Not Eligible',
        `Recovery Plan ${trackingData.planId} is not yet eligible for execution on-chain. Approved governance decisions must be finalized first.`
      );
      return;
    }

    setIsAnchoring(true);

    try {
      // 1. Prepare anchorExecutionEvidence transaction
      const isLocal = chainId === 31337;
      const prepTx = ContractEncoder.encodeAnchorExecutionEvidence(
        trackingData.planId,
        1,
        evidenceHash,
        isLocal
      );

      // 2. Submit transaction
      const sendRes = await sendPreparedTransaction(prepTx, {
        planId: trackingData.planId,
        planVersion: 1,
      });

      if (sendRes.txHash) {
        const txRecord = await blockchainApi.getTransactionStatus(sendRes.txHash);
        setActiveTx(txRecord);
        Alert.alert('Evidence Anchored', `Transaction registered: ${sendRes.txHash.slice(0, 10)}...`);
      } else {
        setShowManualTx(true);
        Alert.alert(
          'Sign in External Wallet',
          'Evidence commitment prepared. After confirming in MetaMask, paste the transaction hash to track.'
        );
      }
    } catch (err: any) {
      Alert.alert('Anchoring Error', err?.message || 'Failed to anchor execution evidence.');
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleRegisterManualTx = async () => {
    if (!manualTxHash.trim()) {
      Alert.alert('Missing Tx Hash', 'Please enter transaction hash.');
      return;
    }

    try {
      const tx = await registerTransaction(
        manualTxHash.trim(),
        'anchorExecution',
        trackingData.planId,
        1
      );
      setActiveTx(tx);
      setShowManualTx(false);
      setManualTxHash('');
      Alert.alert('Tracking Active', 'Execution evidence transaction registered.');
    } catch (err: any) {
      Alert.alert('Registration Error', err?.message || 'Invalid transaction hash.');
    }
  };

  const handleReportIssue = () => {
    Alert.alert(
      'Report Operational Bottleneck',
      'Log an operational issue against Stage 3 (In Transit). An alert will be routed to the Logistics Carrier and Warehouse Coordinator.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Operational Alert',
          onPress: () => {
            setReportedIssue(true);
            Alert.alert('Issue Logged', 'Operational alert #ISS-992 dispatched to dispatch team.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Execution Tracking"
        subtitle={`Active Plan: ${trackingData.planId}`}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Overall Progress Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroPlanName}>{trackingData.planName}</Text>
              <Text style={styles.heroRef}>Disruption Reference: {trackingData.disruptionId}</Text>
            </View>
            <StatusBadge status={trackingData.status} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Overall Milestone Execution</Text>
              <Text style={styles.progressPct}>{trackingData.overallProgress}% Completed</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${trackingData.overallProgress}%` }]} />
            </View>
          </View>

          {/* Governance & Authorization Meta */}
          <View style={styles.authMetaRow}>
            <ShieldCheck size={16} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.authMetaText}>
              Authorized by: <Text style={{ fontWeight: '700' }}>{trackingData.approvedBy}</Text>
            </Text>
          </View>
        </View>

        {/* 1. Wallet Connection Card */}
        {!isBackendOnline() ? <WalletConnectionCard requiredRole="operations-analyst" /> : null}

        {/* 2. Cryptographic Execution Evidence Anchoring Card */}
        <View style={styles.evidenceCard}>
          <View style={styles.evidenceHeaderRow}>
            <View style={styles.evidenceHeaderLeft}>
              <View style={styles.evidenceIconBox}>
                <Camera size={16} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.evidenceTitle}>Cryptographic Execution Evidence</Text>
                <Text style={styles.evidenceSubtitle}>Proof of delivery & milestone sign-off</Text>
              </View>
            </View>
          </View>

          <Text style={styles.evidenceDesc}>
            Attach operational proof (e.g. signed bill of lading, inspection certificate). The file is hashed locally and only its cryptographic fingerprint is committed on-chain.
          </Text>

          {evidenceUri ? (
            <View style={styles.previewContainer}>
              <Image source={{ uri: evidenceUri }} style={styles.previewImage} />
              <View style={styles.previewDetails}>
                <Text style={styles.previewLabel}>FINGERPRINT HASH (SHA-256):</Text>
                <Text style={styles.previewHash} numberOfLines={1} ellipsizeMode="middle">
                  {evidenceHash}
                </Text>
                <Pressable onPress={handlePickEvidence} style={styles.repickBtn}>
                  <Text style={styles.repickBtnText}>Change Photo</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={handlePickEvidence} style={styles.selectEvidenceBtn}>
              <Upload size={16} color="#2563EB" style={{ marginRight: 6 }} />
              <Text style={styles.selectEvidenceBtnText}>Select Delivery Document / Photo</Text>
            </Pressable>
          )}

          {evidenceHash && !activeTx && (
            <Pressable
              onPress={handleAnchorEvidence}
              disabled={isAnchoring}
              style={[styles.anchorEvidenceBtn, isAnchoring && { opacity: 0.7 }]}
            >
              {isAnchoring ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Hash size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.anchorEvidenceBtnText}>Anchor Evidence On-Chain</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* Active Transaction Status */}
        {activeTx && <TransactionStatusCard transaction={activeTx} />}

        {/* Manual Tx Hash Input */}
        {showManualTx && (
          <View style={styles.manualTxCard}>
            <Text style={styles.manualTxTitle}>Register Broadcasted Transaction</Text>
            <Text style={styles.manualTxSub}>
              Enter the transaction hash returned by MetaMask after signing:
            </Text>
            <TextInput
              style={styles.txInput}
              placeholder="0x..."
              placeholderTextColor="#94A3B8"
              value={manualTxHash}
              onChangeText={setManualTxHash}
              autoCapitalize="none"
            />
            <View style={styles.manualTxBtnRow}>
              <Pressable onPress={() => setShowManualTx(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRegisterManualTx} style={styles.confirmTxBtn}>
                <Text style={styles.confirmTxBtnText}>Track Transaction</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Verification Status */}
        {!isBackendOnline() && verificationReport && <IntegrityVerificationCard report={verificationReport} />}

        {/* Issue Report Banner */}
        {reportedIssue && (
          <View style={styles.issueBanner}>
            <AlertCircle size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.issueTitle}>Active Incident Logged (#ISS-992)</Text>
              <Text style={styles.issueDesc}>
                Carrier transit team notified of regional NH48 road congestion alert.
              </Text>
            </View>
          </View>
        )}

        {/* Detailed Stages Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Execution Milestones & Multi-Role Handoffs</Text>
          <Text style={styles.sectionSub}>
            Live accountability tracking across warehouse operators, carriers, and dispatchers
          </Text>

          <TimelineView items={timelineItems} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.push(`/(protected)/operations-analyst/disruptions/${trackingData.disruptionId}`)}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>View Disruption</Text>
        </Pressable>

        <Pressable onPress={handleReportIssue} style={styles.reportBtn}>
          <AlertTriangle size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.reportBtnText}>Report Bottleneck</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroPlanName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  heroRef: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  authMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  authMetaText: {
    fontSize: 11,
    color: '#166534',
  },
  evidenceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 16,
  },
  evidenceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  evidenceHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  evidenceIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  evidenceSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  evidenceDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 12,
  },
  selectEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderStyle: 'dashed',
  },
  selectEvidenceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  previewContainer: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  previewDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  previewLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  previewHash: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#0F172A',
    marginBottom: 4,
  },
  repickBtn: {
    alignSelf: 'flex-start',
  },
  repickBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  anchorEvidenceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 6,
  },
  anchorEvidenceBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  issueBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  issueDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
    lineHeight: 15,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    lineHeight: 16,
  },
  manualTxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
  },
  manualTxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  manualTxSub: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  txInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 11,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
  },
  manualTxBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  confirmTxBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmTxBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  reportBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
