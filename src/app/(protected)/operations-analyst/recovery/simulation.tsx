import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Gauge,
  Layers,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import OrderCard from '../../../../features/operations-analyst/components/OrderCard';
import StatusBadge from '../../../../features/operations-analyst/components/StatusBadge';
import { useOrderRisk } from '../../../../features/operations-analyst/hooks/useOrderRisk';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { LiveChainCard } from '../../../../components/blockchain/LiveChainCard';
import { isBackendOnline, submitPlan, syncNow, useSyncVersion } from '../../../../services/backendSync';

export default function SimulationResultsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const [activeTab, setActiveTab] = useState<'summary' | 'cost' | 'orders' | 'timeline'>('summary');
  const [isSimulating, setIsSimulating] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);

  useSyncVersion();
  const planId = params.planId || 'RP-001';
  const plan = operationsService.getRecoveryPlanById(planId) || operationsService.getRecoveryPlans()[0];
  const { orders: affectedOrders } = useOrderRisk(operationsService.getOrders({ disruptionId: plan.relatedDisruptionId }));
  const disruption = operationsService.getDisruptionById(plan.relatedDisruptionId);
  const valueAtRisk = affectedOrders.reduce((sum, o) => sum + (o.revenue ?? 0), 0);
  const protectedCounts = /(\d+) of (\d+)/.exec(plan.deliveryImpact);
  const isSubmitted = plan.status !== 'Simulation Complete' && plan.status !== 'Draft';

  // The backend rebuilds every option from current stock, capacity and deadlines on each sync.
  const handleReRunSimulation = async () => {
    setIsSimulating(true);
    await syncNow();
    setIsSimulating(false);
  };

  const handleSubmitForApproval = () => {
    Alert.alert(
      'Submit for Manager Approval',
      `Are you sure you want to dispatch "${plan.planName}" to Supply Chain Manager David Vance for formal authorization?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm & Submit',
          onPress: async () => {
            try {
              if (isBackendOnline()) await submitPlan(plan.id);
              else operationsService.submitPlanForApproval(plan.id);
              setSubmissionSuccess(true);
            } catch (err: any) {
              Alert.alert('Plan not submitted', err?.message ?? 'Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Simulation Results"
        subtitle={plan.planName}
        showBack
        onBack={() => router.back()}
        rightAction={
          <Pressable
            onPress={handleReRunSimulation}
            style={styles.reRunBtn}
          >
            <Gauge size={14} color="#2563EB" style={{ marginRight: 4 }} />
            <Text style={styles.reRunText}>Re-Simulate</Text>
          </Pressable>
        }
      />

      {/* Top Feasibility Banner */}
      <View style={styles.topStatusBanner}>
        <View style={styles.statusLeft}>
          <View style={styles.checkIcon}>
            <CheckCircle2 size={20} color="#16A34A" />
          </View>
          <View>
            <Text style={styles.statusTitle}>Feasible Strategy (Score: {plan.feasibilityScore}/100)</Text>
            <Text style={styles.statusSub}>
              Rule-checked against live stock, capacity and deadlines
            </Text>
          </View>
        </View>
        <StatusBadge status={plan.status} size="sm" />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('summary')}
          style={[styles.tabBtn, activeTab === 'summary' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
            Summary
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('cost')}
          style={[styles.tabBtn, activeTab === 'cost' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'cost' && styles.tabTextActive]}>
            Cost Matrix
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('orders')}
          style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Orders ({affectedOrders.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('timeline')}
          style={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            Timeline
          </Text>
        </Pressable>
      </View>

      {isSimulating ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Re-checking this plan against live data...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Submission feedback banner */}
          {submissionSuccess && (
            <View style={styles.successNotice}>
              <CheckCircle2 size={20} color="#16A34A" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.successNoticeTitle}>Submitted to Manager</Text>
                <Text style={styles.successNoticeSub}>
                  Saved on the server and waiting for the Supply Chain Manager&apos;s decision.
                </Text>
              </View>
            </View>
          )}

          {isSubmitted && (
            <LiveChainCard anchorTx={plan.anchorTx} anchorStatus={plan.anchorStatus} anchorBlock={plan.anchorBlock} planHash={plan.planHash} />
          )}

          {/* 4 Summary Cards */}
          <View style={styles.kpiGrid}>
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <DollarSign size={18} color="#2563EB" />
                <Text style={styles.kpiValue}>${plan.estimatedCost.toLocaleString()}</Text>
                <Text style={styles.kpiLabel}>Total Cost</Text>
              </View>

              <View style={styles.kpiCard}>
                <ShieldCheck size={18} color="#16A34A" />
                <Text style={[styles.kpiValue, { color: '#16A34A' }]}>
                  {protectedCounts ? `${protectedCounts[1]} of ${protectedCounts[2]}` : '—'}
                </Text>
                <Text style={styles.kpiLabel}>Orders Protected</Text>
              </View>
            </View>

            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Clock size={18} color="#059669" />
                <Text style={[styles.kpiValue, { color: '#059669' }]}>{disruption?.estimatedDelay ?? '—'}</Text>
                <Text style={styles.kpiLabel}>Reported Delay</Text>
              </View>

              <View style={styles.kpiCard}>
                <Gauge size={18} color="#2563EB" />
                <Text style={styles.kpiValue}>{plan.feasibilityScore}%</Text>
                <Text style={styles.kpiLabel}>Feasibility Score</Text>
              </View>
            </View>
          </View>

          {activeTab === 'summary' && (
            <>
              {/* Baseline vs Simulated Recovery Comparison */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>No Action vs. This Plan</Text>
                <View style={styles.comparisonTable}>
                  <View style={styles.compRowHeader}>
                    <Text style={styles.compColHead}>Metric</Text>
                    <Text style={styles.compColHead}>No Action</Text>
                    <Text style={[styles.compColHead, { color: '#16A34A' }]}>This Plan</Text>
                  </View>
                  <View style={styles.compRow}>
                    <Text style={styles.compLabel}>Orders Needing Action</Text>
                    <Text style={[styles.compVal, { color: '#DC2626' }]}>{protectedCounts ? `${protectedCounts[2]} exposed` : '—'}</Text>
                    <Text style={[styles.compVal, { color: '#16A34A' }]}>{protectedCounts ? `${protectedCounts[1]} protected` : '—'}</Text>
                  </View>
                  <View style={styles.compRow}>
                    <Text style={styles.compLabel}>Short Units Covered</Text>
                    <Text style={[styles.compVal, { color: '#DC2626' }]}>0%</Text>
                    <Text style={[styles.compVal, { color: '#16A34A' }]}>{plan.feasibilityScore}%</Text>
                  </View>
                  <View style={styles.compRow}>
                    <Text style={styles.compLabel}>Affected Order Value</Text>
                    <Text style={styles.compVal}>${valueAtRisk.toLocaleString()}</Text>
                    <Text style={styles.compVal}>${valueAtRisk.toLocaleString()}</Text>
                  </View>
                  <View style={[styles.compRow, { borderBottomWidth: 0 }]}>
                    <Text style={styles.compLabel}>Recovery Cost</Text>
                    <Text style={styles.compVal}>$0</Text>
                    <Text style={styles.compVal}>${plan.estimatedCost.toLocaleString()}</Text>
                  </View>
                </View>
              </View>

              {/* Operational Constraints & Risk */}
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Constraints & Prerequisites</Text>
                <View style={styles.constraintsList}>
                  {plan.constraints.map((c, i) => (
                    <View key={i} style={styles.constraintRow}>
                      <AlertTriangle size={14} color="#D97706" style={{ marginRight: 8, marginTop: 1 }} />
                      <Text style={styles.constraintText}>{c}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}

          {activeTab === 'cost' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Detailed Cost Breakdown</Text>
              {plan.actions.map((action) => (
                <View key={action.id} style={styles.costItemRow}>
                  <Text style={styles.costItemName}>{action.title}</Text>
                  <Text style={styles.costItemVal}>${(action.estimatedCost ?? 0).toLocaleString()}</Text>
                </View>
              ))}
              <View style={[styles.costItemRow, styles.costTotalRow]}>
                <Text style={styles.costTotalText}>Total Estimated Cost</Text>
                <Text style={styles.costTotalVal}>${plan.estimatedCost.toLocaleString()}</Text>
              </View>
            </View>
          )}

          {activeTab === 'orders' && (
            <View>
              <Text style={styles.cardTitle}>Affected Client Orders ({affectedOrders.length})</Text>
              {affectedOrders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </View>
          )}

          {activeTab === 'timeline' && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Recovery Actions, In Order</Text>
              <View style={styles.timelineItem}>
                <View style={styles.timeDot} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.timeTitle}>Manager decision</Text>
                  <Text style={styles.timeSub}>Nothing runs until a manager approves and confirms execution</Text>
                </View>
              </View>
              {plan.actions.map((action) => (
                <View key={action.id} style={styles.timelineItem}>
                  <View style={[styles.timeDot, { backgroundColor: '#2563EB' }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.timeTitle}>{action.title}</Text>
                    <Text style={styles.timeSub}>{action.leadTime} · {action.unitsOrScope}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.push({
            pathname: '/(protected)/operations-analyst/recovery/actions',
            params: { planId: plan.id },
          })}
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.secondaryBtnText}>Configure Actions</Text>
        </Pressable>

        <Pressable
          onPress={handleSubmitForApproval}
          disabled={isSubmitted || submissionSuccess}
          style={({ pressed }) => [
            styles.primaryBtn,
            (isSubmitted || submissionSuccess) && styles.primaryBtnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Send size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>
            {isSubmitted ? plan.status : submissionSuccess ? 'Pending Approval' : 'Submit for Approval'}
          </Text>
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
  reRunBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reRunText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  topStatusBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  checkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  statusSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  successNotice: {
    flexDirection: 'row',
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  successNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#065F46',
  },
  successNoticeSub: {
    fontSize: 11,
    color: '#047857',
    marginTop: 2,
    lineHeight: 15,
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 6,
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 12,
  },
  comparisonTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    overflow: 'hidden',
  },
  compRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  compColHead: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  compRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  compLabel: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
  },
  compVal: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#10234D',
  },
  constraintsList: {
    gap: 8,
  },
  constraintRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  constraintText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
    lineHeight: 17,
  },
  costItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  costItemName: {
    fontSize: 13,
    color: '#64748B',
  },
  costItemVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  costTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#E2E8F0',
    marginTop: 8,
    paddingTop: 10,
  },
  costTotalText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  costTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2563EB',
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  timeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#D97706',
    marginRight: 10,
    marginTop: 4,
  },
  timeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  timeSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
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
  primaryBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryBtnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
  },
});
