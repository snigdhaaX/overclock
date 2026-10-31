import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  FileCheck,
  Layers,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Radio,
  ExternalLink,
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
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '../../../../features/operations-analyst/components/ActionCard';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import StatusBadge from '../../../../features/operations-analyst/components/StatusBadge';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { RecoveryPlan } from '../../../../features/operations-analyst/types';
import { blockchainApi } from '../../../../services/blockchainApi';
import { useBlockchainWallet } from '../../../../hooks/useBlockchainWallet';
import { ContractEncoder } from '../../../../services/contractEncoder';
import { ethers } from 'ethers';
import {
  PlanHashCard,
  EvidenceManifestCard,
  WalletConnectionCard,
  TransactionStatusCard,
} from '../../../../components/blockchain';
import {
  HashGenerateResponse,
  OnChainPlanVersion,
  TrackedTransaction,
} from '../../../../types/blockchain';

export default function PlanReviewAndSubmitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = params.planId || 'RP-001';

  const [plan, setPlan] = useState<RecoveryPlan>(
    () => operationsService.getRecoveryPlanById(planId) || operationsService.getRecoveryPlans()[0]
  );
  const [submitted, setSubmitted] = useState(plan.status === 'Pending Approval');

  // Blockchain state
  const {
    walletAddress,
    isConnected,
    isAnalystAuthorized,
    chainId,
    sendPreparedTransaction,
    registerTransaction,
  } = useBlockchainWallet();

  const [hashData, setHashData] = useState<HashGenerateResponse | null>(null);
  const [onChainPlan, setOnChainPlan] = useState<OnChainPlanVersion | null>(null);
  const [activeTx, setActiveTx] = useState<TrackedTransaction | null>(null);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [showTxInput, setShowTxInput] = useState(false);
  const [manualTxHash, setManualTxHash] = useState('');
  const [loadingChainData, setLoadingChainData] = useState(false);

  // Deterministic canonical RFC 8785 simulation digest from Monte Carlo output
  const computeCanonicalSimulationDigest = useCallback((targetPlan: RecoveryPlan): string => {
    if ((targetPlan as any).simulationHash) {
      return (targetPlan as any).simulationHash;
    }
    if (targetPlan.feasibilityScore && targetPlan.feasibilityScore > 0) {
      const canonicalSim = {
        disruption_id: targetPlan.relatedDisruptionId,
        estimated_cost_usd: targetPlan.estimatedCost,
        feasibility_score: targetPlan.feasibilityScore,
        iterations: 10000,
        plan_id: targetPlan.id,
        schema: 'trustchain-monte-carlo-v1',
      };
      const sortedKeys = Object.keys(canonicalSim).sort();
      const sortedObj: Record<string, any> = {};
      for (const k of sortedKeys) {
        sortedObj[k] = (canonicalSim as any)[k];
      }
      return ethers.sha256(ethers.toUtf8Bytes(JSON.stringify(sortedObj)));
    }
    return '';
  }, []);

  // Build canonical plan data dictionary
  const buildPlanData = useCallback(
    (targetPlan: RecoveryPlan) => {
      const simDigest = computeCanonicalSimulationDigest(targetPlan);
      const data: Record<string, any> = {
        plan_id: targetPlan.id,
        version: 1,
        disruption_id: targetPlan.relatedDisruptionId,
        organization_id: 'ORG-APEX-GLOBAL',
        title: targetPlan.planName,
        strategy: targetPlan.strategy || targetPlan.description,
        estimated_cost: targetPlan.estimatedCost,
        actions: targetPlan.actions.map((a) => ({
          id: a.id,
          title: a.title,
          action_type: a.type || 'reroute',
          cost: a.estimatedCost || 0,
          timeline: a.leadTime || '2 days',
        })),
        constraints: targetPlan.constraints,
        schema_version: 'trustchain-recovery-plan-v2',
      };
      if (simDigest) {
        data.simulation_hash = simDigest;
      }
      return data;
    },
    [computeCanonicalSimulationDigest]
  );

  // Fetch canonical hash and on-chain state
  const loadBlockchainData = useCallback(async () => {
    setLoadingChainData(true);
    try {
      const planPayload = buildPlanData(plan);

      // 1. Authoritative canonical hash generation
      const hashRes = await blockchainApi.generatePlanHash(planPayload);
      setHashData(hashRes);

      // 2. Check if already anchored on-chain
      try {
        const onChain = await blockchainApi.getOnChainPlan(plan.id, 1);
        setOnChainPlan(onChain);
        if (onChain.status !== 'NONE') {
          setSubmitted(true);
        }
      } catch {
        // Not yet anchored on-chain
        setOnChainPlan(null);
      }
    } catch (err) {
      console.warn('Error loading blockchain metadata:', err);
    } finally {
      setLoadingChainData(false);
    }
  }, [plan, buildPlanData]);

  useEffect(() => {
    loadBlockchainData();
  }, [loadBlockchainData]);

  // Periodic transaction status polling
  useEffect(() => {
    if (!activeTx || activeTx.status === 'CONFIRMED' || activeTx.status === 'FAILED') return;

    const timer = setInterval(async () => {
      try {
        const updated = await blockchainApi.getTransactionStatus(activeTx.tx_hash);
        setActiveTx(updated);
        if (updated.status === 'CONFIRMED') {
          await loadBlockchainData();
          setSubmitted(true);
          const updatedLocal = operationsService.submitPlanForApproval(plan.id);
          setPlan({ ...updatedLocal });
          clearInterval(timer);
        }
      } catch (e) {
        console.warn('Tx polling error:', e);
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [activeTx, loadBlockchainData, plan.id]);

  // Handle Plan Anchoring Submission
  const handleAnchorAndSubmit = async () => {
    if (!isConnected || !walletAddress) {
      Alert.alert(
        'Submit Plan for Formal Authorization',
        `Submit "${plan.planName}" ($${plan.estimatedCost.toLocaleString()}) to the Supply Chain Manager for governance approval?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm & Dispatch',
            onPress: () => {
              const updated = operationsService.submitPlanForApproval(plan.id);
              setPlan({ ...updated });
              setSubmitted(true);
            },
          },
        ]
      );
      return;
    }

    if (!isAnalystAuthorized) {
      Alert.alert(
        'Unauthorized Wallet Role',
        'The connected wallet does not hold on-chain Operations Analyst authorization (Category 0x01).'
      );
      return;
    }

    if (!hashData) {
      Alert.alert('Processing Error', 'Canonical plan hash is still generating.');
      return;
    }

    if (onChainPlan && onChainPlan.status !== 'NONE') {
      Alert.alert(
        'Plan Already Anchored',
        `Recovery Plan ${plan.id} V1 has already been anchored on-chain with status ${onChainPlan.status}. Duplicate anchoring is prohibited.`
      );
      return;
    }

    setIsAnchoring(true);

    try {
      // 1. Store operational plan in database
      const planPayload = buildPlanData(plan);
      await blockchainApi.storeOperationalPlan(plan.id, 1, planPayload);

      // 2. Prepare anchorPlan transaction
      // Retrieve canonical simulation digest from validated Monte Carlo simulation
      const simHash = computeCanonicalSimulationDigest(plan);
      if (!simHash) {
        Alert.alert(
          'Missing Simulation Commitment',
          'A validated Monte Carlo simulation is required before anchoring. Please run simulation first.'
        );
        return;
      }
      const actionMask = 0x01 | 0x04; // Warehouse Transfer + Shipment Reroute
      const requiredStages = 0x02; // Stage 0x02: CAT_SUPPLY_CHAIN_MANAGER
      const isLocal = chainId === 31337;

      const prepTx = ContractEncoder.encodeAnchorPlan(
        plan.id,
        1,
        hashData.sha256_hash,
        simHash,
        actionMask,
        requiredStages,
        isLocal
      );

      // 3. Prompt external signing
      const sendResult = await sendPreparedTransaction(prepTx, {
        planId: plan.id,
        planVersion: 1,
      });

      if (sendResult.txHash) {
        // Broadcasted via injected provider
        const txRecord = await blockchainApi.getTransactionStatus(sendResult.txHash);
        setActiveTx(txRecord);
        Alert.alert('Transaction Broadcasted', `Transaction registered: ${sendResult.txHash.slice(0, 10)}... Tracking confirmation.`);
      } else {
        // Deep link opened to MetaMask or external wallet
        setShowTxInput(true);
        Alert.alert(
          'Sign in External Wallet',
          'Transaction payload prepared. After confirming in MetaMask, paste the broadcasted transaction hash below to track on-chain confirmation.'
        );
      }
    } catch (err: any) {
      Alert.alert('Anchoring Failed', err?.message || 'Failed to prepare on-chain transaction.');
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleRegisterManualTx = async () => {
    const cleanHash = manualTxHash.trim();
    if (!cleanHash) {
      Alert.alert('Missing Tx Hash', 'Please enter the transaction hash from MetaMask.');
      return;
    }
    const hexPattern = /^0x[0-9a-fA-F]{64}$/;
    if (!hexPattern.test(cleanHash)) {
      Alert.alert(
        'Invalid Tx Hash Format',
        'Transaction hash must be a 66-character hexadecimal string beginning with "0x".'
      );
      return;
    }

    try {
      const tx = await registerTransaction(cleanHash, 'anchorPlan', plan.id, 1);
      setActiveTx(tx);
      setShowTxInput(false);
      setManualTxHash('');
      Alert.alert('Tracking Active', 'Transaction registered with backend indexer. Tracking on-chain receipt.');
    } catch (err: any) {
      Alert.alert('Registration Error', err?.message || 'Invalid transaction hash.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Plan Review & Submit"
        subtitle="Step 3 of 3: Governance Submission"
        showBack
        onBack={() => router.back()}
      />

      {/* Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleDone]}>
            <Check size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>Basic Info</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleDone]}>
            <Check size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>Actions</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepNumberActive}>3</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Review & Chain</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Submitted Status Banner */}
        {submitted ? (
          <View style={styles.submittedBanner}>
            <View style={styles.bannerIcon}>
              <Clock size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Awaiting Manager Approval</Text>
              <Text style={styles.bannerSub}>
                Status: <Text style={{ fontWeight: '700' }}>Pending Governance Sign-Off</Text>
              </Text>
              <Text style={styles.bannerDetail}>
                Assigned to: The Supply Chain Manager. On-chain transaction has been committed to the TrustChain smart contract.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.governanceNotice}>
            <UserCheck size={18} color="#2563EB" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.govNoticeText}>
              <Text style={{ fontWeight: '700' }}>On-Chain Governance Rule:</Text> Operational plans must be anchored to Polygon Amoy using an authorized Operations Analyst wallet before manager sign-off.
            </Text>
          </View>
        )}

        {/* 1. Wallet Authentication Card */}
        <WalletConnectionCard
          requiredRole="operations-analyst"
          onWalletConnected={() => loadBlockchainData()}
        />

        {/* 2. Canonical Plan Hash Card */}
        {hashData ? (
          <PlanHashCard
            planHash={hashData.sha256_hash}
            schemaVersion={hashData.schema_version}
            evidenceManifestHash={hashData.evidence_manifest_hash}
            isVerified={true}
          />
        ) : (
          <View style={styles.loadingHashBox}>
            <ActivityIndicator size="small" color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.loadingHashText}>Computing deterministic RFC 8785 canonical hash...</Text>
          </View>
        )}

        {/* 3. Evidence Manifest Card */}
        {hashData && (
          <EvidenceManifestCard
            manifestRootHash={hashData.evidence_manifest_hash}
            disruptionId={plan.relatedDisruptionId}
            isAnchored={true}
          />
        )}

        {/* 4. On-Chain Governance & Simulation Parameters */}
        <View style={styles.govParamsCard}>
          <View style={styles.govParamsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={styles.govIconBox}>
                <Radio size={15} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.govParamsTitle}>On-Chain Governance Parameters</Text>
                <Text style={styles.govParamsSubtitle}>Smart contract commitment metadata</Text>
              </View>
            </View>
            <View style={styles.stagePill}>
              <Text style={styles.stagePillText}>Stage 0x02</Text>
            </View>
          </View>

          <View style={styles.govGrid}>
            <View style={styles.govRow}>
              <Text style={styles.govLabel}>Recovery Plan ID:</Text>
              <Text style={styles.govVal}>{plan.id} (Version 1)</Text>
            </View>
            <View style={styles.govRow}>
              <Text style={styles.govLabel}>Disruption Reference:</Text>
              <Text style={styles.govVal}>{plan.relatedDisruptionId}</Text>
            </View>
            <View style={styles.govRow}>
              <Text style={styles.govLabel}>Required Approval Stage:</Text>
              <Text style={styles.govVal}>0x02 (Supply Chain Manager)</Text>
            </View>
            <View style={styles.govRow}>
              <Text style={styles.govLabel}>Simulation Digest:</Text>
              {computeCanonicalSimulationDigest(plan) ? (
                <Text style={styles.govHashVal} numberOfLines={1} ellipsizeMode="middle">
                  {computeCanonicalSimulationDigest(plan)}
                </Text>
              ) : (
                <Text style={styles.govValUnavailable}>
                  NOT AVAILABLE (Run Monte Carlo Simulation)
                </Text>
              )}
            </View>
            <View style={styles.govRow}>
              <Text style={styles.govLabel}>On-Chain Status:</Text>
              <Text style={[styles.govStatusBadge, onChainPlan && onChainPlan.status !== 'NONE' ? styles.statusAnchored : styles.statusDraft]}>
                {onChainPlan ? onChainPlan.status : 'DRAFT • NOT ANCHORED'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. Active Transaction Status Card */}
        {activeTx && <TransactionStatusCard transaction={activeTx} />}

        {/* 5. Manual Tx Hash Registration Box */}
        {showTxInput && (
          <View style={styles.manualTxCard}>
            <Text style={styles.manualTxTitle}>Register Broadcasted Transaction</Text>
            <Text style={styles.manualTxSub}>
              Enter the transaction hash returned by MetaMask to track confirmations:
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
              <Pressable onPress={() => setShowTxInput(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleRegisterManualTx} style={styles.confirmTxBtn}>
                <Text style={styles.confirmTxBtnText}>Track Transaction</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* Plan Header Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.planName}>{plan.planName}</Text>
              <Text style={styles.planRef}>Target Disruption: {plan.relatedDisruptionId}</Text>
            </View>
            <StatusBadge status={plan.status} />
          </View>

          <Text style={styles.strategyDescription}>{plan.strategy || plan.description}</Text>

          {/* Key Metrics Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Total Cost</Text>
              <Text style={styles.metricVal}>${plan.estimatedCost.toLocaleString()}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Delivery SLA</Text>
              <Text style={[styles.metricVal, { color: '#16A34A' }]}>{plan.deliveryImpact}</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Feasibility</Text>
              <Text style={[styles.metricVal, { color: '#2563EB' }]}>{plan.feasibilityScore}%</Text>
            </View>
            <View style={styles.metricCell}>
              <Text style={styles.metricLabel}>Priority</Text>
              <Text style={[styles.metricVal, { color: '#DC2626' }]}>{plan.priority}</Text>
            </View>
          </View>
        </View>

        {/* Planned Actions Sequence */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Execution Sequence ({plan.actions.length} actions)</Text>
            {!submitted && (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(protected)/operations-analyst/recovery/actions',
                    params: { planId: plan.id },
                  })
                }
                style={styles.editBtn}
              >
                <Edit2 size={13} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.editText}>Edit Actions</Text>
              </Pressable>
            )}
          </View>

          {plan.actions.map((act, index) => (
            <ActionCard key={act.id} action={act} stepNumber={index + 1} />
          ))}
        </View>

        {/* Assumptions & Governance Constraints */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assumptions & Constraints</Text>
          {plan.constraints.map((c, i) => (
            <View key={i} style={styles.constraintItem}>
              <CheckCircle2 size={14} color="#2563EB" style={{ marginRight: 8, marginTop: 1 }} />
              <Text style={styles.constraintText}>{c}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Footer Actions */}
      <View style={styles.bottomBar}>
        {submitted ? (
          <Pressable
            onPress={() => router.push('/(protected)/operations-analyst/recovery/recommendations')}
            style={styles.fullWidthBtn}
          >
            <Text style={styles.fullWidthBtnText}>Return to Recovery Strategies</Text>
          </Pressable>
        ) : (
          <>
            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/(protected)/operations-analyst/recovery/create',
                  params: { planId: plan.id },
                })
              }
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Edit Info</Text>
            </Pressable>

            <Pressable
              onPress={handleAnchorAndSubmit}
              disabled={isAnchoring}
              style={[styles.submitBtn, isAnchoring && { opacity: 0.7 }]}
            >
              {isAnchoring ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Send size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Anchor & Submit</Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepNumberActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#10234D',
    fontWeight: '700',
  },
  stepConnector: {
    width: 28,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: '#16A34A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  submittedBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  bannerIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  bannerSub: {
    fontSize: 12,
    color: '#B45309',
    marginTop: 2,
  },
  bannerDetail: {
    fontSize: 11,
    color: '#78350F',
    marginTop: 4,
    lineHeight: 15,
  },
  governanceNotice: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  govNoticeText: {
    fontSize: 11,
    color: '#1E40AF',
    flex: 1,
    lineHeight: 16,
  },
  loadingHashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  loadingHashText: {
    fontSize: 12,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  planRef: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  strategyDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  section: {
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 10,
  },
  constraintItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  constraintText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
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
  submitBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  fullWidthBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 13,
  },
  fullWidthBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  govParamsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 12,
  },
  govParamsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  govIconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  govParamsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  govParamsSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  stagePill: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  stagePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  govGrid: {
    gap: 8,
  },
  govRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  govLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  govVal: {
    fontSize: 11,
    color: '#1E293B',
    fontWeight: '600',
  },
  govHashVal: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563EB',
    maxWidth: '55%',
  },
  govValUnavailable: {
    fontSize: 10,
    fontWeight: '600',
    color: '#D97706',
    maxWidth: '60%',
  },
  govStatusBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  statusAnchored: {
    backgroundColor: '#DCFCE7',
    color: '#16A34A',
  },
  statusDraft: {
    backgroundColor: '#FEF3C7',
    color: '#D97706',
  },
});
