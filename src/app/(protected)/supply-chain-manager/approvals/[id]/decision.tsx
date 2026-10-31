import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Lock,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  Clock,
  ExternalLink,
} from 'lucide-react-native';
import React, { useState, useEffect } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import ChainProof from '@/features/supply-chain-manager/components/ChainProof';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { approvePlan, confirmExecution, isBackendOnline, rejectPlan, requestRevision, useSyncVersion } from '@/services/backendSync';
import { useBlockchainWallet } from '@/hooks/useBlockchainWallet';
import { blockchainApi } from '@/services/blockchainApi';
import { ContractEncoder } from '@/services/contractEncoder';
import {
  WalletConnectionCard,
  TransactionStatusCard,
} from '@/components/blockchain';
import { TrackedTransaction } from '@/types/blockchain';

export default function ApprovalDecisionScreen() {
  const router = useRouter();
  useSyncVersion();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();

  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | 'changes'>(
    (mode as any) || 'approve'
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [changeRequirements, setChangeRequirements] = useState('');
  const [approvalComments, setApprovalComments] = useState(
    ''
  );
  const [decisionCompleted, setDecisionCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTx, setActiveTx] = useState<TrackedTransaction | null>(null);
  const [showManualTx, setShowManualTx] = useState(false);
  const [manualTxHash, setManualTxHash] = useState('');

  const plan =
    managerService.getRecoveryPlanById(id || 'RP-001') ||
    managerService.getRecoveryPlanById('RP-001') ||
    managerService.getRecoveryPlans()[0];

  const [executing, setExecuting] = useState(false);
  const [executed, setExecuted] = useState(false);

  const handleConfirmExecution = async () => {
    setErrorMessage('');
    setExecuting(true);
    try {
      await confirmExecution(plan.id);
      setExecuted(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Execution could not start.');
    } finally {
      setExecuting(false);
    }
  };
  const {
    walletAddress,
    isConnected,
    isManagerAuthorized,
    chainId,
    sendPreparedTransaction,
    registerTransaction,
  } = useBlockchainWallet();

  // Polling transaction status
  useEffect(() => {
    if (!activeTx || activeTx.status === 'CONFIRMED' || activeTx.status === 'FAILED') return;

    const timer = setInterval(async () => {
      try {
        const updated = await blockchainApi.getTransactionStatus(activeTx.tx_hash);
        setActiveTx(updated);
        if (updated.status === 'CONFIRMED') {
          // Reconcile and commit local change
          try {
            await blockchainApi.reconcileTransaction(activeTx.tx_hash);
          } catch (e) {
            console.warn('Reconciliation notice:', e);
          }

          if (decisionMode === 'approve') {
            managerService.approvePlan({
              planId: plan.id,
              decision: 'approved',
              actor: walletAddress || 'Supply Chain Manager',
              role: 'Supply Chain Manager',
              comments: approvalComments,
            });
          } else if (decisionMode === 'reject') {
            managerService.rejectPlan({
              planId: plan.id,
              decision: 'rejected',
              actor: walletAddress || 'Supply Chain Manager',
              role: 'Supply Chain Manager',
              reason: rejectionReason,
              comments: rejectionComments,
            });
          } else if (decisionMode === 'changes') {
            managerService.requestPlanChanges({
              planId: plan.id,
              decision: 'changes_requested',
              actor: walletAddress || 'Supply Chain Manager',
              role: 'Supply Chain Manager',
              changeRequirements,
            });
          }

          setDecisionCompleted(true);
          clearInterval(timer);
        }
      } catch (err) {
        console.warn('Tx polling error:', err);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [
    activeTx,
    decisionMode,
    plan.id,
    approvalComments,
    rejectionReason,
    rejectionComments,
    changeRequirements,
    walletAddress,
  ]);

  const handleExecuteDecision = async () => {
    setErrorMessage('');

    // Normal path: the backend validates the decision. Wallet signing below is the offline fallback.
    if (isBackendOnline()) {
      if (decisionMode === 'reject' && !rejectionReason.trim()) {
        setErrorMessage('Please provide a mandatory reason for plan rejection.');
        return;
      }
      if (decisionMode === 'changes' && !changeRequirements.trim()) {
        setErrorMessage('Please specify required modifications before returning to analyst.');
        return;
      }
      setIsExecuting(true);
      try {
        if (decisionMode === 'approve') {
          await approvePlan(plan.id, approvalComments);
        } else if (decisionMode === 'reject') {
          await rejectPlan(plan.id, rejectionReason);
        } else {
          await requestRevision(plan.id, changeRequirements);
        }
        setDecisionCompleted(true);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to execute decision.');
      } finally {
        setIsExecuting(false);
      }
      return;
    }

    // 1. Enforce wallet connection & on-chain manager role
    if (!isConnected || !walletAddress) {
      setErrorMessage('Supply Chain Manager wallet must be authenticated to sign governance decisions.');
      return;
    }

    if (!isManagerAuthorized) {
      setErrorMessage(
        'Connected wallet does not possess on-chain Supply Chain Manager authorization (Category 0x02).'
      );
      return;
    }

    setIsExecuting(true);

    try {
      // 2. Fetch on-chain plan to verify existence and check self-approval rule
      let onChain = null;
      try {
        onChain = await blockchainApi.getOnChainPlan(plan.id, 1);
      } catch (e) {
        // If not anchored yet, alert honestly
        throw new Error(`Plan ${plan.id} V1 has not been anchored on-chain yet by the Operations Analyst.`);
      }

      // Role Governance Rule: Analyst cannot approve their own plan
      if (
        onChain.creator &&
        walletAddress.toLowerCase() === onChain.creator.toLowerCase()
      ) {
        throw new Error(
          'Role Governance Violation: The creator of the plan cannot approve their own plan. An independent manager wallet is required.'
        );
      }

      // 3. Prepare transaction based on decision mode
      let prepTx;
      let funcName = '';
      const isLocal = chainId === 31337;

      if (decisionMode === 'approve') {
        funcName = 'approvePlan';
        prepTx = ContractEncoder.encodeApprovePlan(plan.id, 1, 0x02, isLocal);
      } else if (decisionMode === 'reject') {
        if (!rejectionReason.trim()) {
          throw new Error('Please provide a mandatory reason for plan rejection.');
        }
        funcName = 'rejectPlan';
        const reasonHash = ContractEncoder.hashString(rejectionReason);
        prepTx = ContractEncoder.encodeRejectPlan(plan.id, 1, reasonHash, isLocal);
      } else if (decisionMode === 'changes') {
        if (!changeRequirements.trim()) {
          throw new Error('Please specify required modifications before returning to analyst.');
        }
        funcName = 'requestRevision';
        const reasonHash = ContractEncoder.hashString(changeRequirements);
        prepTx = ContractEncoder.encodeRequestRevision(plan.id, 1, reasonHash, isLocal);
      }

      if (!prepTx) {
        throw new Error('Invalid decision mode.');
      }

      // 4. Submit through external wallet
      const sendRes = await sendPreparedTransaction(prepTx, {
        planId: plan.id,
        planVersion: 1,
      });

      if (sendRes.txHash) {
        const txRecord = await blockchainApi.getTransactionStatus(sendRes.txHash);
        setActiveTx(txRecord);
      } else {
        setShowManualTx(true);
        Alert.alert(
          'Sign in External Wallet',
          'Transaction prepared. After confirming in MetaMask, paste the broadcasted transaction hash to register.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to execute governance transaction.');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRegisterManualTx = async () => {
    if (!manualTxHash.trim()) {
      Alert.alert('Missing Tx Hash', 'Please enter the transaction hash from MetaMask.');
      return;
    }

    try {
      const funcName =
        decisionMode === 'approve'
          ? 'approvePlan'
          : decisionMode === 'reject'
          ? 'rejectPlan'
          : 'requestRevision';

      const tx = await registerTransaction(manualTxHash.trim(), funcName, plan.id, 1);
      setActiveTx(tx);
      setShowManualTx(false);
      setManualTxHash('');
      Alert.alert('Tracking Active', 'Decision transaction registered with backend indexer.');
    } catch (err: any) {
      Alert.alert('Registration Error', err?.message || 'Invalid transaction hash.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Approval Decision"
        subtitle={`Governance sign-off for ${plan.id}`}
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Modal / Card State */}
        {decisionCompleted ? (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={40} color="#16A36A" />
            </View>

            <Text style={styles.successTitle}>
              {decisionMode === 'approve'
                ? 'Recovery Plan Formally Authorized'
                : decisionMode === 'reject'
                ? isBackendOnline() ? 'Recovery Plan Rejected' : 'Recovery Plan Rejected On-Chain'
                : isBackendOnline() ? 'Revision Requested' : 'Revision Requested On-Chain'}
            </Text>

            <Text style={styles.successDesc}>
              {isBackendOnline()
                ? decisionMode === 'approve'
                  ? `Plan ${plan.id} is approved. Confirm execution to run its recovery actions.`
                  : decisionMode === 'reject'
                  ? `Plan ${plan.id} has been rejected. The reason is recorded in the audit trail.`
                  : `Plan ${plan.id} has been returned to its author with your change requirements.`
                : decisionMode === 'approve'
                ? `Plan ${plan.id} has been authorized on the blockchain. Transaction hash: ${activeTx?.tx_hash?.slice(0, 16) ?? ''}`
                : decisionMode === 'reject'
                ? `Plan ${plan.id} rejection has been recorded on-chain with hashed rationale.`
                : `Plan ${plan.id} revision notice has been committed to the smart contract.`}
            </Text>

            {isBackendOnline() ? <ChainProof planId={plan.id} txHash={(plan as any).txHash} /> : null}

            {isBackendOnline() && decisionMode === 'approve' ? (
              <Pressable style={styles.successPrimaryBtn} onPress={handleConfirmExecution} disabled={executing || executed} accessibilityRole="button">
                <Text style={styles.successPrimaryBtnText}>
                  {executed ? 'Recovery actions completed (simulated)' : executing ? 'Running…' : 'Confirm execution'}
                </Text>
              </Pressable>
            ) : null}
            {decisionCompleted && errorMessage ? <Text style={{ color: '#DC2626', fontSize: 13, textAlign: 'center' }}>{errorMessage}</Text> : null}

            {activeTx && <TransactionStatusCard transaction={activeTx} />}

            <View style={styles.successButtonsRow}>
              <Pressable
                style={styles.successSecondaryBtn}
                onPress={() => router.replace('/(protected)/supply-chain-manager/approvals' as any)}
              >
                <Text style={styles.successSecondaryBtnText}>Approval Centre</Text>
              </Pressable>

              <Pressable
                style={styles.successPrimaryBtn}
                onPress={() => router.replace('/(protected)/supply-chain-manager/recovery' as any)}
              >
                <Text style={styles.successPrimaryBtnText}>Monitor Recovery</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* Wallet Authentication Card for Manager */}
            {!isBackendOnline() ? <WalletConnectionCard requiredRole="supply-chain-manager" /> : null}

            {/* Segmented Mode Selector */}
            <View style={styles.modeTabs}>
              <Pressable
                style={[styles.modeTab, decisionMode === 'approve' && styles.modeTabApprove]}
                onPress={() => setDecisionMode('approve')}
              >
                <ShieldCheck size={14} color={decisionMode === 'approve' ? '#FFFFFF' : '#0D9488'} />
                <Text style={[styles.modeTabText, decisionMode === 'approve' && styles.modeTabTextActive]}>
                  Authorize
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modeTab, decisionMode === 'changes' && styles.modeTabChanges]}
                onPress={() => setDecisionMode('changes')}
              >
                <RotateCcw size={14} color={decisionMode === 'changes' ? '#FFFFFF' : '#475569'} />
                <Text style={[styles.modeTabText, decisionMode === 'changes' && styles.modeTabTextActive]}>
                  Revise
                </Text>
              </Pressable>

              <Pressable
                style={[styles.modeTab, decisionMode === 'reject' && styles.modeTabReject]}
                onPress={() => setDecisionMode('reject')}
              >
                <XCircle size={14} color={decisionMode === 'reject' ? '#FFFFFF' : '#DC2626'} />
                <Text style={[styles.modeTabText, decisionMode === 'reject' && styles.modeTabTextActive]}>
                  Reject
                </Text>
              </Pressable>
            </View>

            {/* Error Message */}
            {errorMessage.length > 0 && (
              <View style={styles.errorBanner}>
                <AlertCircle size={16} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

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

            {/* Plan Baseline Review */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <View>
                  <Text style={styles.summaryPlanId}>{plan.id}</Text>
                  <Text style={styles.summaryPlanName}>{plan.planName}</Text>
                </View>
                <Text style={styles.summaryCost}>${plan.estimatedCost.toLocaleString()}</Text>
              </View>

              <View style={styles.summaryMetaRow}>
                <Text style={styles.summaryMetaText}>Disruption: {plan.relatedDisruptionId}</Text>
                <Text style={styles.summaryMetaText}>Feasibility: {plan.feasibilityScore}%</Text>
                <Text style={styles.summaryMetaText}>SLA: {plan.deliveryImpact}</Text>
              </View>
            </View>

            {/* Form Fields according to selected Mode */}
            {decisionMode === 'approve' && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Executive Authorization Notes</Text>
                <Text style={styles.formCardSubtitle}>
                  Provide authorizing remarks to be recorded in the audit trail.
                </Text>

                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={approvalComments}
                  onChangeText={setApprovalComments}
                  placeholder="Enter approval policy remarks..."
                  placeholderTextColor="#94A3B8"
                />

                <View style={styles.consequencesCard}>
                  <Text style={styles.consequencesTitle}>Operational Consequences of Approval:</Text>
                  <Text style={styles.consequenceItem}>
                    1. Records your approval against this exact plan version in the audit trail.
                  </Text>
                  <Text style={styles.consequenceItem}>
                    2. Anchors the decision on-chain when chain signing is configured.
                  </Text>
                  <Text style={styles.consequenceItem}>
                    3. Nothing runs until you confirm execution on the next step.
                  </Text>
                </View>
              </View>
            )}

            {decisionMode === 'reject' && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Mandatory Rejection Rationale *</Text>
                <Text style={styles.formCardSubtitle}>
                  Governance requires a documented reason for rejecting formulated recovery plans.
                </Text>

                <TextInput
                  style={[styles.input, { marginBottom: 12 }]}
                  value={rejectionReason}
                  onChangeText={setRejectionReason}
                  placeholder="e.g. Budget ceiling exceeded or alternate supplier preferred"
                  placeholderTextColor="#94A3B8"
                />

                <Text style={styles.formCardTitle}>Additional Analyst Guidance (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={3}
                  value={rejectionComments}
                  onChangeText={setRejectionComments}
                  placeholder="Provide recommendations for alternative recovery formulation..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}

            {decisionMode === 'changes' && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Required Plan Modifications *</Text>
                <Text style={styles.formCardSubtitle}>
                  Specify parameter changes required prior to formal governance authorization.
                </Text>

                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={changeRequirements}
                  onChangeText={setChangeRequirements}
                  placeholder="Specify required supplier changes, routing constraints or budget caps..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}

            {/* Execute Governance Decision Button */}
            <Pressable
              style={[
                styles.executeBtn,
                decisionMode === 'approve'
                  ? styles.executeBtnApprove
                  : decisionMode === 'reject'
                  ? styles.executeBtnReject
                  : styles.executeBtnChanges,
                isExecuting && { opacity: 0.7 },
              ]}
              onPress={handleExecuteDecision}
              disabled={isExecuting}
            >
              {isExecuting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Lock size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.executeBtnText}>
                    {decisionMode === 'approve'
                      ? isBackendOnline() ? 'Approve Plan' : 'Submit On-Chain Approval'
                      : decisionMode === 'reject'
                      ? isBackendOnline() ? 'Reject Plan' : 'Submit On-Chain Rejection'
                      : isBackendOnline() ? 'Return for Revision' : 'Submit On-Chain Revision Request'}
                  </Text>
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 9,
    gap: 5,
  },
  modeTabApprove: {
    backgroundColor: '#0D9488',
  },
  modeTabChanges: {
    backgroundColor: '#475569',
  },
  modeTabReject: {
    backgroundColor: '#DC2626',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 10,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    flex: 1,
    lineHeight: 16,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryPlanId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  summaryPlanName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  summaryCost: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  summaryMetaRow: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  summaryMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  formCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 4,
  },
  formCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 12,
    color: '#1E293B',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    fontSize: 12,
    color: '#1E293B',
    textAlignVertical: 'top',
    minHeight: 80,
  },
  consequencesCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  consequencesTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
    marginBottom: 6,
  },
  consequenceItem: {
    fontSize: 11,
    color: '#134E4A',
    lineHeight: 16,
    marginBottom: 4,
  },
  executeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  executeBtnApprove: {
    backgroundColor: '#0D9488',
  },
  executeBtnReject: {
    backgroundColor: '#DC2626',
  },
  executeBtnChanges: {
    backgroundColor: '#475569',
  },
  executeBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10234D',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 12,
  },
  successSecondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
  },
  successSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  successPrimaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
  },
  successPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  manualTxCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 10,
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
    backgroundColor: '#0D9488',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmTxBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
