import { useRouter } from 'expo-router';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Building,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Globe2,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  Scale,
  Shield,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import ManagerMetricCard from '@/features/supply-chain-manager/components/ManagerMetricCard';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { useSyncVersion } from '@/services/backendSync';

export default function ManagerHomeScreen() {
  const router = useRouter();
  useSyncVersion();
  const [refreshing, setRefreshing] = useState(false);

  const health = managerService.getHealthMetrics();
  const criticalDisruption = managerService.getDisruptionById('SHP-101') ?? managerService.getDisruptions()[0];
  const pendingPlans = managerService.getRecoveryPlans('pending');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        greeting="Good morning, David"
        title="Command Centre"
        subtitle="Network-wide logistics intelligence & executive decision hub"
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
      >
        {/* Health Index Hero Card */}
        <View style={styles.healthHeroCard}>
          <View style={styles.healthHeroTop}>
            <View>
              <Text style={styles.healthHeroTag}>NETWORK HEALTH INDEX</Text>
              <View style={styles.healthScoreRow}>
                <Text style={styles.healthScoreValue}>{health.activeDisruptions > 0 ? 'At risk' : 'Stable'}</Text>
                <View style={styles.healthStatusPill}>
                  <TrendingUp size={12} color="#16A36A" style={{ marginRight: 3 }} />
                  <Text style={styles.healthStatusText}>{health.ordersAtRisk} orders at risk</Text>
                </View>
              </View>
            </View>

            <View style={styles.healthShieldCircle}>
              <ShieldCheck size={28} color="#0D9488" />
            </View>
          </View>

          <Text style={styles.healthSyncText}>{health.lastUpdated}</Text>
        </View>

        {/* 4 Executive KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <ManagerMetricCard
              title="Active Disruptions"
              value={health.activeDisruptions}
              subtitle="2 high impact"
              icon={<AlertTriangle size={14} color="#DC2626" />}
              accentColor="#DC2626"
            />
            <ManagerMetricCard
              title="Critical Shipments"
              value={health.criticalShipments}
              subtitle="In transit hold"
              icon={<Truck size={14} color="#D97706" />}
              accentColor="#D97706"
            />
          </View>

          <View style={styles.kpiRow}>
            <ManagerMetricCard
              title="Orders at Risk"
              value={health.ordersAtRisk}
              subtitle={`${health.activeDisruptions} active disruptions`}
              icon={<Package size={14} color="#2563EB" />}
              accentColor="#2563EB"
            />
            <ManagerMetricCard
              title="Pending Approvals"
              value={health.pendingApprovals}
              subtitle="Require authorization"
              icon={<CheckCircle2 size={14} color="#0D9488" />}
              accentColor="#0D9488"
            />
          </View>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Command Shortcuts</Text>
        </View>

        <View style={styles.shortcutsRow}>
          <Pressable
            style={styles.shortcutCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/network' as any)}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#F0FDFA' }]}>
              <Globe2 size={18} color="#0D9488" />
            </View>
            <Text style={styles.shortcutTitle}>Network Map</Text>
            <Text style={styles.shortcutSub}>Real highway routes</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/approvals' as any)}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#EFF6FF' }]}>
              <CheckCircle2 size={18} color="#2563EB" />
            </View>
            <Text style={styles.shortcutTitle}>Approvals</Text>
            <Text style={styles.shortcutSub}>Review submitted plans</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/disruptions' as any)}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={18} color="#DC2626" />
            </View>
            <Text style={styles.shortcutTitle}>Disruptions</Text>
            <Text style={styles.shortcutSub}>Active telemetry</Text>
          </Pressable>

          <Pressable
            style={styles.shortcutCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/recovery' as any)}
          >
            <View style={[styles.shortcutIcon, { backgroundColor: '#FDF4FF' }]}>
              <RotateCcw size={18} color="#A855F7" />
            </View>
            <Text style={styles.shortcutTitle}>Monitoring</Text>
            <Text style={styles.shortcutSub}>Active execution</Text>
          </Pressable>
        </View>

        {/* Critical Attention Spotlight Card */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <AlertOctagon size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Critical Executive Attention</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(protected)/supply-chain-manager/disruptions' as any)}
          >
            <Text style={styles.seeAllText}>View All (4)</Text>
          </Pressable>
        </View>

        {criticalDisruption && (
          <Pressable
            style={styles.spotlightCard}
            onPress={() =>
              router.push(`/(protected)/supply-chain-manager/disruptions/${criticalDisruption.id}` as any)
            }
          >
            <View style={styles.spotlightTop}>
              <View style={styles.spotlightIdGroup}>
                <Text style={styles.spotlightId}>{criticalDisruption.id}</Text>
                <SeverityBadge severity={criticalDisruption.severity} size="sm" />
              </View>
              <Text style={styles.spotlightDelay}>{criticalDisruption.estimatedDelay} delay</Text>
            </View>

            <Text style={styles.spotlightTitle}>{criticalDisruption.title}</Text>
            <Text style={styles.spotlightReason} numberOfLines={2}>
              {criticalDisruption.reason}
            </Text>

            <View style={styles.spotlightMetaGrid}>
              <View style={styles.spotlightMetaItem}>
                <Text style={styles.spotlightMetaLabel}>Carrier / Vessel</Text>
                <Text style={styles.spotlightMetaValue}>{criticalDisruption.carrier}</Text>
              </View>

              <View style={styles.spotlightMetaItem}>
                <Text style={styles.spotlightMetaLabel}>Exposure</Text>
                <Text style={[styles.spotlightMetaValue, { color: '#DC2626' }]}>$211,200</Text>
              </View>

              <View style={styles.spotlightMetaItem}>
                <Text style={styles.spotlightMetaLabel}>Orders Affected</Text>
                <Text style={styles.spotlightMetaValue}>
                  {criticalDisruption.affectedOrdersCount} Orders
                </Text>
              </View>
            </View>

            <View style={styles.spotlightActionRow}>
              <Text style={styles.spotlightActionText}>Inspect Disruption Impact Analysis</Text>
              <ArrowRight size={14} color="#0D9488" />
            </View>
          </Pressable>
        )}

        {/* Pending Decisions Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleGroup}>
            <CheckCircle2 size={16} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Decisions Awaiting Your Sign-Off</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(protected)/supply-chain-manager/approvals' as any)}
          >
            <Text style={styles.seeAllText}>Review (3)</Text>
          </Pressable>
        </View>

        {pendingPlans.slice(0, 1).map((plan) => (
          <View key={plan.id} style={styles.decisionCard}>
            <View style={styles.decisionTop}>
              <View>
                <Text style={styles.decisionPlanId}>{plan.id}</Text>
                <Text style={styles.decisionPlanName}>{plan.planName}</Text>
              </View>
              <StatusBadge status={plan.status} size="sm" />
            </View>

            <Text style={styles.decisionSubmitter}>
              Formulated & submitted by Anishwath (Operations Analyst)
            </Text>

            <View style={styles.decisionStatsRow}>
              <View style={styles.decisionStat}>
                <Text style={styles.decisionStatLabel}>Cost</Text>
                <Text style={styles.decisionStatVal}>${plan.estimatedCost.toLocaleString()}</Text>
              </View>
              <View style={styles.decisionStat}>
                <Text style={styles.decisionStatLabel}>SLA Recipient</Text>
                <Text style={[styles.decisionStatVal, { color: '#16A36A' }]}>
                  {plan.deliveryImpact}
                </Text>
              </View>
              <View style={styles.decisionStat}>
                <Text style={styles.decisionStatLabel}>Feasibility</Text>
                <Text style={[styles.decisionStatVal, { color: '#2563EB' }]}>
                  {plan.feasibilityScore}%
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.decisionActionBtn}
              onPress={() =>
                router.push(`/(protected)/supply-chain-manager/approvals/${plan.id}` as any)
              }
            >
              <Text style={styles.decisionActionBtnText}>Review & Authorize Plan</Text>
            </Pressable>
          </View>
        ))}

        {/* Network Infrastructure Summary */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Network Infrastructure Summary</Text>
        </View>

        <View style={styles.networkOverviewCard}>
          <Pressable
            style={styles.networkCol}
            onPress={() => router.push('/(protected)/supply-chain-manager/suppliers' as any)}
          >
            <Building size={16} color="#0D9488" />
            <Text style={styles.networkCount}>5</Text>
            <Text style={styles.networkLabel}>Suppliers</Text>
          </Pressable>

          <View style={styles.networkDivider} />

          <Pressable
            style={styles.networkCol}
            onPress={() => router.push('/(protected)/supply-chain-manager/network' as any)}
          >
            <Truck size={16} color="#2563EB" />
            <Text style={styles.networkCount}>4</Text>
            <Text style={styles.networkLabel}>Corridors</Text>
          </Pressable>

          <View style={styles.networkDivider} />

          <Pressable
            style={styles.networkCol}
            onPress={() => router.push('/(protected)/supply-chain-manager/warehouses' as any)}
          >
            <Warehouse size={16} color="#D97706" />
            <Text style={styles.networkCount}>4</Text>
            <Text style={styles.networkLabel}>Warehouses</Text>
          </Pressable>

          <View style={styles.networkDivider} />

          <Pressable
            style={styles.networkCol}
            onPress={() => router.push('/(protected)/supply-chain-manager/network' as any)}
          >
            <Package size={16} color="#7C3AED" />
            <Text style={styles.networkCount}>8</Text>
            <Text style={styles.networkLabel}>Destinations</Text>
          </Pressable>
        </View>

        {/* Executive Intelligence & Sourcing Decisions */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Executive Intelligence & Strategy</Text>
        </View>

        <View style={styles.strategyGrid}>
          <Pressable
            style={styles.strategyCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/risk-analysis' as any)}
          >
            <View style={[styles.strategyIconWrap, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={18} color="#DC2626" />
            </View>
            <Text style={styles.strategyCardTitle}>Risk & Business Impact</Text>
            <Text style={styles.strategyCardSub}>Orders at risk & financial exposure</Text>
          </Pressable>

          <Pressable
            style={styles.strategyCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/analytics' as any)}
          >
            <View style={[styles.strategyIconWrap, { backgroundColor: '#EFF6FF' }]}>
              <BarChart2 size={18} color="#2563EB" />
            </View>
            <Text style={styles.strategyCardTitle}>Reports & Analytics</Text>
            <Text style={styles.strategyCardSub}>OTD delivery trends & recovery</Text>
          </Pressable>

          <Pressable
            style={styles.strategyCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/warehouse-supplier' as any)}
          >
            <View style={[styles.strategyIconWrap, { backgroundColor: '#F0FDFA' }]}>
              <Warehouse size={18} color="#0D9488" />
            </View>
            <Text style={styles.strategyCardTitle}>Warehouse & Supplier Hub</Text>
            <Text style={styles.strategyCardSub}>Multi-echelon network inventory</Text>
          </Pressable>

          <Pressable
            style={styles.strategyCard}
            onPress={() => router.push('/(protected)/supply-chain-manager/suppliers/compare' as any)}
          >
            <View style={[styles.strategyIconWrap, { backgroundColor: '#FFFBEB' }]}>
              <Scale size={18} color="#D97706" />
            </View>
            <Text style={styles.strategyCardTitle}>Supplier Comparison</Text>
            <Text style={styles.strategyCardSub}>Disruption sourcing decisions</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ManagerBottomNav activeTab="overview" />
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
    paddingBottom: 110,
  },
  healthHeroCard: {
    backgroundColor: '#10234D',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  healthHeroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  healthHeroTag: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  healthScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  healthScoreValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  healthStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(22, 163, 106, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 106, 0.3)',
  },
  healthStatusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4ADE80',
  },
  healthShieldCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(13, 148, 136, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0D9488',
  },
  healthSyncText: {
    fontSize: 11,
    color: '#64748B',
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 18,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  shortcutCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  shortcutIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10234D',
    textAlign: 'center',
  },
  shortcutSub: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 1,
  },
  spotlightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  spotlightTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  spotlightIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  spotlightId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  spotlightDelay: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  spotlightTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  spotlightReason: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 12,
  },
  spotlightMetaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  spotlightMetaItem: {
    flex: 1,
  },
  spotlightMetaLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  spotlightMetaValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  spotlightActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  spotlightActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  decisionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  decisionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  decisionPlanId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  decisionPlanName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 1,
  },
  decisionSubmitter: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  decisionStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  decisionStat: {
    flex: 1,
  },
  decisionStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  decisionStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  decisionActionBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  networkOverviewCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
  },
  networkCol: {
    flex: 1,
    alignItems: 'center',
  },
  networkCount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 4,
  },
  networkLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  networkDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#F1F5F9',
  },
  strategyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  strategyCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  strategyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  strategyCardTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 3,
  },
  strategyCardSub: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
});
