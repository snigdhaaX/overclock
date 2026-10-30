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
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';

export default function ApprovalDecisionScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();

  const [decisionMode, setDecisionMode] = useState<'approve' | 'reject' | 'changes'>(
    (mode as any) || 'approve'
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionComments, setRejectionComments] = useState('');
  const [changeRequirements, setChangeRequirements] = useState('');
  const [approvalComments, setApprovalComments] = useState(
    'Authorized under Manager Operational Recovery Policy RP-POL-04. Budget allocation approved.'
  );
  const [decisionCompleted, setDecisionCompleted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const plan =
    managerService.getRecoveryPlanById(id || 'RP-001') ||
    managerService.getRecoveryPlanById('RP-001')!;

  const handleExecuteDecision = () => {
    setErrorMessage('');

    try {
      if (decisionMode === 'approve') {
        managerService.approvePlan({
          planId: plan.id,
          decision: 'approved',
          actor: 'David Vance (Supply Chain Manager)',
          role: 'Supply Chain Manager',
          comments: approvalComments,
        });
        setDecisionCompleted(true);
      } else if (decisionMode === 'reject') {
        if (!rejectionReason.trim()) {
          setErrorMessage('Please provide a mandatory reason for plan rejection.');
          return;
        }
        managerService.rejectPlan({
          planId: plan.id,
          decision: 'rejected',
          actor: 'David Vance (Supply Chain Manager)',
          role: 'Supply Chain Manager',
          reason: rejectionReason,
          comments: rejectionComments,
        });
        setDecisionCompleted(true);
      } else if (decisionMode === 'changes') {
        if (!changeRequirements.trim()) {
          setErrorMessage('Please specify required modifications before returning to analyst.');
          return;
        }
        managerService.requestPlanChanges({
          planId: plan.id,
          decision: 'changes_requested',
          actor: 'David Vance (Supply Chain Manager)',
          role: 'Supply Chain Manager',
          changeRequirements,
        });
        setDecisionCompleted(true);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to execute decision.');
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
                ? 'Recovery Plan Rejected'
                : 'Revision Notice Sent to Analyst'}
            </Text>

            <Text style={styles.successDesc}>
              {decisionMode === 'approve'
                ? `Plan ${plan.id} has been authorized and dispatched to Carlos Mendez (WH-BLR) and BlueDart Logistics. Audit transaction logged.`
                : decisionMode === 'reject'
                ? `Plan ${plan.id} has been rejected. Mandatory reason recorded on audit trail.`
                : `Plan ${plan.id} has been returned to Anishwath with your change requirements.`}
            </Text>

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
                  Provide authorizing remarks to be recorded in the cryptographically verified ledger.
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
                    1. Dispatches formal pick-and-pack order to Carlos Mendez (WH-BLR) for 280 units of PRD-012.
                  </Text>
                  <Text style={styles.consequenceItem}>
                    2. Enlists BlueDart Priority Courier for road transit corridor (Lead time: 14 hours).
                  </Text>
                  <Text style={styles.consequenceItem}>
                    3. Commits immutable transaction on blockchain ledger under actor David Vance.
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

                <Text style={styles.inputLabel}>Supporting Executive Comments (Optional)</Text>
                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={3}
                  value={rejectionComments}
                  onChangeText={setRejectionComments}
                  placeholder="Add additional guidance for the operations team..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}

            {decisionMode === 'changes' && (
              <View style={styles.formCard}>
                <Text style={styles.formCardTitle}>Specific Modification Requirements *</Text>
                <Text style={styles.formCardSubtitle}>
                  Document the revisions the Operations Analyst must incorporate before resubmission.
                </Text>

                <TextInput
                  style={styles.textArea}
                  multiline
                  numberOfLines={4}
                  value={changeRequirements}
                  onChangeText={setChangeRequirements}
                  placeholder="e.g. Re-evaluate using WH-HYD instead of WH-BLR to reduce road freight cost by 25%..."
                  placeholderTextColor="#94A3B8"
                />
              </View>
            )}

            {/* Execute Button */}
            <Pressable
              style={[
                styles.executeBtn,
                decisionMode === 'approve'
                  ? styles.executeBtnApprove
                  : decisionMode === 'reject'
                  ? styles.executeBtnReject
                  : styles.executeBtnChanges,
              ]}
              onPress={handleExecuteDecision}
            >
              <Text style={styles.executeBtnText}>
                {decisionMode === 'approve'
                  ? 'Confirm Formal Plan Authorization'
                  : decisionMode === 'reject'
                  ? 'Confirm Plan Rejection'
                  : 'Return to Analyst for Revision'}
              </Text>
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
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    gap: 4,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
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
    color: '#64748B',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  summaryPlanName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  summaryCost: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10234D',
  },
  summaryMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  formCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  formCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
    lineHeight: 15,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#10234D',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#10234D',
    textAlignVertical: 'top',
    minHeight: 80,
    marginBottom: 12,
  },
  consequencesCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    gap: 6,
  },
  consequencesTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    marginBottom: 2,
  },
  consequenceItem: {
    fontSize: 11,
    color: '#0F766E',
    lineHeight: 15,
  },
  executeBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
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
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginTop: 20,
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#DCFCE7',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    textAlign: 'center',
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 24,
  },
  successButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  successSecondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  successSecondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  successPrimaryBtn: {
    flex: 1.2,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  successPrimaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
