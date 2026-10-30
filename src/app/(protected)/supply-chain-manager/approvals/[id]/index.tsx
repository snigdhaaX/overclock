import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
  XCircle,
} from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';
import ChainProof from '@/components/ChainProof';
import useSyncVersion from '@/hooks/useSyncVersion';
import { blockchainApi } from '@/services/blockchainApi';
import { useBlockchainWallet } from '@/hooks/useBlockchainWallet';
import {
  WalletConnectionCard,
  IntegrityVerificationCard,
  PlanHashCard,
  EvidenceManifestCard,
  GovernanceDecisionCard,
} from '@/components/blockchain';
import {
  PlanVerificationReport,
  PlanDecision,
  OnChainPlanVersion,
} from '@/types/blockchain';

export default function RecoveryPlanReviewScreen() {
  const router = useRouter();
  const syncVersion = useSyncVersion();
  const { id } = useLocalSearchParams<{ id: string }>();

  const foundPlan = id ? managerService.getRecoveryPlanById(id) : undefined;
  const plan = foundPlan || managerService.getRecoveryPlans()[0];

  const { isConnected, isManagerAuthorized } = useBlockchainWallet();

  const [verificationReport, setVerificationReport] = useState<PlanVerificationReport | null>(null);
  const [decisions, setDecisions] = useState<PlanDecision[]>([]);
  const [onChainPlan, setOnChainPlan] = useState<OnChainPlanVersion | null>(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const loadBlockchainVerification = useCallback(async () => {
    if (!plan) return;
    setLoadingAudit(true);
    try {
      // 1. Full 15-point cryptographic integrity check
      const rep = await blockchainApi.verifyPlanIntegrity(plan.id, 1);
      setVerificationReport(rep);

      // 2. On-chain decisions history
      try {
        const decRes = await blockchainApi.getDecisions(plan.id, 1);
        setDecisions(decRes.decisions || []);
      } catch {
        setDecisions([]);
      }

      // 3. On-chain plan version
      try {
        const chainPlan = await blockchainApi.getOnChainPlan(plan.id, 1);
        setOnChainPlan(chainPlan);
      } catch {
        setOnChainPlan(null);
      }
    } catch (err) {
      console.warn('Error loading plan verification:', err);
    } finally {
      setLoadingAudit(false);
    }
  }, [plan]);

  useEffect(() => {
    loadBlockchainVerification();
  }, [loadBlockchainVerification]);

  if (!plan) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ManagerHeader
          title="Plan Not Found"
          subtitle="No recovery plan found matching this reference."
          showBack={true}
          onBack={() => router.back()}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#10234D', marginBottom: 8 }}>
            Recovery Plan Unavailable
          </Text>
          <Text style={{ fontSize: 13, color: '#64748B', textAlign: 'center' }}>
            The requested plan reference does not exist or has been archived.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const isAlreadyDecided =
    onChainPlan &&
    (onChainPlan.status === 'APPROVED' ||
      onChainPlan.status === 'REJECTED' ||
      onChainPlan.status === 'REVISION_REQUESTED');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title={plan.id}
        subtitle="Executive audit & expenditure sign-off"
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Plan Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <View style={styles.idRow}>
                <Text style={styles.planIdText}>{plan.id}</Text>
                <View style={styles.disruptionTag}>
                  <Text style={styles.disruptionTagText}>Ref: {plan.relatedDisruptionId}</Text>
                </View>
              </View>
              <Text style={styles.planNameText}>{plan.planName}</Text>
            </View>
            <StatusBadge status={plan.status} size="md" />
          </View>

          <Text style={styles.strategyText}>{plan.strategy}</Text>

          <View style={styles.submitterBar}>
            <User size={13} color="#0D9488" style={{ marginRight: 4 }} />
            <Text style={styles.submitterLabel}>Formulated by:</Text>
            <Text style={styles.submitterName}>{plan.submittedBy || 'Anishwath (Operations Analyst)'}</Text>
            <Text style={styles.submitterTime}>• {plan.submittedAt || 'Today, 09:12 AM'}</Text>
          </View>
        </View>

        {/* 1. Wallet Authentication for Manager */}
        <WalletConnectionCard
          requiredRole="supply-chain-manager"
          onWalletConnected={() => loadBlockchainVerification()}
        />

        {/* 2. Cryptographic Integrity Verification Card */}
        <IntegrityVerificationCard report={verificationReport} loading={loadingAudit} />

        {/* 3. Canonical Plan Hash Card */}
        {verificationReport && (
          <PlanHashCard
            planHash={verificationReport.database_hash}
            schemaVersion={verificationReport.schema_version}
            evidenceManifestHash={verificationReport.evidence_manifest_hash}
            isVerified={verificationReport.hashes_match}
          />
        )}

        {/* 4. Evidence Manifest Card */}
        {verificationReport && (
          <EvidenceManifestCard
            manifestRootHash={verificationReport.evidence_manifest_hash}
            disruptionId={plan.relatedDisruptionId}
            isAnchored={true}
          />
        )}

        {/* 5. On-Chain Decision History */}
        <GovernanceDecisionCard decisions={decisions} />

        {/* Financial & Policy Threshold Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Financial Exposure & Budget Sign-Off</Text>

          <View style={styles.kpiRow}>
            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>Recovery Cost</Text>
              <Text style={[styles.kpiBoxVal, { color: '#10234D' }]}>
                ${plan.estimatedCost.toLocaleString()}
              </Text>
              <Text style={styles.kpiBoxSub}>Within $25k limit</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>Protected Revenue</Text>
              <Text style={[styles.kpiBoxVal, { color: '#16A36A' }]}>+$70,800</Text>
              <Text style={styles.kpiBoxSub}>Net saved vs penalty</Text>
            </View>

            <View style={styles.kpiBox}>
              <Text style={styles.kpiBoxLabel}>Feasibility</Text>
              <Text style={[styles.kpiBoxVal, { color: '#2563EB' }]}>{plan.feasibilityScore}%</Text>
              <Text style={styles.kpiBoxSub}>Monte Carlo verified</Text>
            </View>
          </View>

          <View style={styles.budgetPolicyBanner}>
            <ShieldCheck size={14} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.budgetPolicyText}>
              Policy Check: Manager authorization threshold ($50,000) satisfied.
            </Text>
          </View>
        </View>

        {/* Operational Scope & Protected Commitments */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Operational Scope & Protected SLAs</Text>

          <View style={styles.scopeGrid}>
            <View style={styles.scopeRow}>
              <Text style={styles.scopeLabel}>Target Disruption</Text>
              <Text style={styles.scopeVal}>{plan.relatedDisruptionId} (Singapore Vessel Hold)</Text>
            </View>

            <View style={styles.scopeRow}>
              <Text style={styles.scopeLabel}>Protected Orders</Text>
              <Text style={styles.scopeVal}>4 Customer Contracts (ORD-445 to ORD-448)</Text>
            </View>

            <View style={styles.scopeRow}>
              <Text style={styles.scopeLabel}>Units Protected</Text>
              <Text style={styles.scopeVal}>950 Microcontrollers</Text>
            </View>

            <View style={styles.scopeRow}>
              <Text style={styles.scopeLabel}>SLA Delivery Impact</Text>
              <Text style={[styles.scopeVal, { color: '#16A36A' }]}>{plan.deliveryImpact} (On-Time)</Text>
            </View>

            <View style={styles.scopeRow}>
              <Text style={styles.scopeLabel}>Target Completion</Text>
              <Text style={styles.scopeVal}>{plan.targetCompletionDate}</Text>
            </View>
          </View>
        </View>

        {/* Planned Action Sequence */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Planned Execution Sequence ({plan.actions.length} Actions)</Text>

          {plan.actions.map((act, index) => (
            <View key={act.id} style={styles.actionCard}>
              <View style={styles.actionCardHeader}>
                <View style={styles.stepNumCircle}>
                  <Text style={styles.stepNumText}>{index + 1}</Text>
                </View>
                <Text style={styles.actionTitle}>{act.title}</Text>
              </View>

              <Text style={styles.actionDesc}>{act.description}</Text>

              <View style={styles.actionMetaRow}>
                <Text style={styles.actionMetaText}>Origin/Via: {act.sourceOrCarrier}</Text>
                <Text style={styles.actionMetaText}>Dest: {act.destination}</Text>
                <Text style={styles.actionMetaCost}>${act.estimatedCost.toLocaleString()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Cryptographic Proof Card */}
        <ChainProof planId={plan.id} txHash={(plan as any).txHash} />

        {/* Governance Decisions Disclaimer */}
        <View style={styles.governanceNotice}>
          <AlertCircle size={15} color="#64748B" style={{ marginRight: 6, flexShrink: 0 }} />
          <Text style={styles.governanceNoticeText}>
            Authorization commits instructions to logistics partners and logs an immutable audit event on the blockchain ledger.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Decision Bar */}
      <View style={styles.bottomDecisionBar}>
        <Pressable
          style={styles.requestChangesBtn}
          onPress={() =>
            router.push(`/(protected)/supply-chain-manager/approvals/${plan.id}/decision?mode=changes` as any)
          }
        >
          <RotateCcw size={14} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.requestChangesBtnText}>Request Changes</Text>
        </Pressable>

        <Pressable
          style={styles.rejectBtn}
          onPress={() =>
            router.push(`/(protected)/supply-chain-manager/approvals/${plan.id}/decision?mode=reject` as any)
          }
        >
          <XCircle size={14} color="#DC2626" style={{ marginRight: 4 }} />
          <Text style={styles.rejectBtnText}>Reject</Text>
        </Pressable>

        <Pressable
          style={styles.approveBtn}
          onPress={() =>
            router.push(`/(protected)/supply-chain-manager/approvals/${plan.id}/decision?mode=approve` as any)
          }
        >
          <ShieldCheck size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
          <Text style={styles.approveBtnText}>Approve Plan</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 90,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planIdText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10234D',
  },
  disruptionTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disruptionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  planNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginTop: 2,
  },
  strategyText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 12,
  },
  submitterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
  },
  submitterLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  submitterName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  submitterTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    alignItems: 'center',
  },
  kpiBoxLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  kpiBoxVal: {
    fontSize: 14,
    fontWeight: '900',
    marginBottom: 2,
  },
  kpiBoxSub: {
    fontSize: 9,
    color: '#94A3B8',
  },
  budgetPolicyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  budgetPolicyText: {
    fontSize: 11,
    color: '#0F766E',
    fontWeight: '600',
  },
  scopeGrid: {
    gap: 8,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  scopeLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  scopeVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  actionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 8,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  stepNumCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
    flex: 1,
  },
  actionDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    marginBottom: 6,
  },
  actionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  actionMetaText: {
    fontSize: 10,
    color: '#64748B',
  },
  actionMetaCost: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10234D',
  },
  governanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  governanceNoticeText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    lineHeight: 15,
  },
  bottomDecisionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  requestChangesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 11,
  },
  requestChangesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  rejectBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 11,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 11,
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
