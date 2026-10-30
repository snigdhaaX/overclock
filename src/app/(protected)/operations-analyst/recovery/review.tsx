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
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '../../../../features/operations-analyst/components/ActionCard';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import StatusBadge from '../../../../features/operations-analyst/components/StatusBadge';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { RecoveryPlan } from '../../../../features/operations-analyst/types';

export default function PlanReviewAndSubmitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = params.planId || 'RP-001';

  const [plan, setPlan] = useState<RecoveryPlan>(
    () => operationsService.getRecoveryPlanById(planId) || operationsService.getRecoveryPlans()[0]
  );
  const [submitted, setSubmitted] = useState(plan.status === 'Pending Approval');

  const handleSubmit = () => {
    Alert.alert(
      'Submit Plan for Formal Authorization',
      `Submit "${plan.planName}" ($${plan.estimatedCost.toLocaleString()}) to Supply Chain Manager David Vance for governance approval?`,
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
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Review</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Submitted Status Banner */}
        {submitted ? (
          <View style={styles.submittedBanner}>
            <View style={styles.bannerIcon}>
              <Clock size={24} color="#D97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Awaiting Manager Approval</Text>
              <Text style={styles.bannerSub}>
                Status: <Text style={{ fontWeight: '700' }}>Pending Approval</Text> • Submitted today at {plan.submittedAt || '11:45 AM'}
              </Text>
              <Text style={styles.bannerDetail}>
                Assigned to: Supply Chain Manager (David Vance). An automated notification and blockchain audit hash have been generated.
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.governanceNotice}>
            <UserCheck size={18} color="#2563EB" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.govNoticeText}>
              <Text style={{ fontWeight: '700' }}>Role Governance Rule:</Text> Operations Analysts formulate strategies and run simulations. Formal deployment requires authorization by the authorized Supply Chain Manager.
            </Text>
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
                onPress={() => router.push({
                  pathname: '/(protected)/operations-analyst/recovery/actions',
                  params: { planId: plan.id },
                })}
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
              onPress={() => router.push({
                pathname: '/(protected)/operations-analyst/recovery/create',
                params: { planId: plan.id },
              })}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>Edit Plan Info</Text>
            </Pressable>

            <Pressable onPress={handleSubmit} style={styles.submitBtn}>
              <Send size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.submitBtnText}>Submit for Approval</Text>
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
});
