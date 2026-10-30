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
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';

export default function RecoveryPlanReviewScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plan = managerService.getRecoveryPlanById(id || 'RP-001') || managerService.getRecoveryPlanById('RP-001')!;

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
    gap: 8,
    marginBottom: 12,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiBoxLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  kpiBoxVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  kpiBoxSub: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 2,
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
    fontWeight: '600',
    color: '#0D9488',
  },
  scopeGrid: {
    gap: 8,
  },
  scopeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
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
    color: '#10234D',
  },
  actionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  stepNumCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10234D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  actionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748B',
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
    fontSize: 11,
    fontWeight: '800',
    color: '#10234D',
  },
  governanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 10,
  },
  governanceNoticeText: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    flex: 1,
  },
  bottomDecisionBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  requestChangesBtn: {
    flex: 1.2,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestChangesBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  approveBtn: {
    flex: 1.5,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
