import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  BarChart2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  LineChart,
  Percent,
  PieChart,
  RotateCcw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
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
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';

export default function ReportsAnalyticsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    'On-Time Delivery Performance' | 'Disruption Trends' | 'Recovery Performance'
  >('On-Time Delivery Performance');

  const tabs: Array<'On-Time Delivery Performance' | 'Disruption Trends' | 'Recovery Performance'> = [
    'On-Time Delivery Performance',
    'Disruption Trends',
    'Recovery Performance',
  ];

  // Monthly OTD Delivery Data
  const monthlyOtd = [
    { month: 'May', rate: 88.5 },
    { month: 'Jun', rate: 89.8 },
    { month: 'Jul', rate: 91.2 },
    { month: 'Aug', rate: 90.6 },
    { month: 'Sep', rate: 93.8 },
    { month: 'Oct', rate: 92.4 },
  ];

  // Quarterly Delivery Trend
  const quarterlyTrends = [
    { quarter: 'Q1 2026', rate: '87.2%', diff: 'Baseline', status: 'normal' },
    { quarter: 'Q2 2026', rate: '89.2%', diff: '+2.0%', status: 'up' },
    { quarter: 'Q3 2026', rate: '92.8%', diff: '+3.6%', status: 'up' },
    { quarter: 'Q4 2026 (YTD)', rate: '92.4%', diff: '-0.4%', status: 'steady' },
  ];

  // Disruption breakdown by type
  const disruptionTypes = [
    {
      type: 'Shipment Delays & Port Congestion',
      count: 6,
      pct: 43,
      color: '#2563EB',
      example: 'Singapore Berth 4 backlog, Air customs hold',
    },
    {
      type: 'Supplier Issues & Bottlenecks',
      count: 5,
      pct: 36,
      color: '#DC2626',
      example: 'Sanand cleanroom fire, IC wafer shortage',
    },
    {
      type: 'Inventory Shortages & Imbalances',
      count: 3,
      pct: 21,
      color: '#D97706',
      example: 'WH-MUM buffer dip below 25% target',
    },
  ];

  // Monthly Disruption Count
  const monthlyDisruptions = [
    { month: 'Jul', count: 3, transit: 2, supplier: 1, inventory: 0 },
    { month: 'Aug', count: 4, transit: 1, supplier: 2, inventory: 1 },
    { month: 'Sep', count: 3, transit: 1, supplier: 1, inventory: 1 },
    { month: 'Oct', count: 4, transit: 2, supplier: 1, inventory: 1 },
  ];

  // Recovery Strategy Performance
  const recoveryStrategies = [
    {
      name: 'Inter-Warehouse Stock Transfer',
      count: 8,
      successRate: '100%',
      avgDuration: '1.8 Days',
      color: '#16A36A',
    },
    {
      name: 'Expedited Dedicated Road Freight',
      count: 5,
      successRate: '100%',
      avgDuration: '2.1 Days',
      color: '#0D9488',
    },
    {
      name: 'Alternative Supplier Substitution',
      count: 3,
      successRate: '67%',
      avgDuration: '4.2 Days',
      color: '#2563EB',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Reports & Analytics"
        subtitle="Executive Performance & Disruption Benchmarking"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Tabs Selector */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
              numberOfLines={1}
            >
              {tab === 'On-Time Delivery Performance'
                ? 'On-Time Delivery'
                : tab === 'Disruption Trends'
                ? 'Disruptions'
                : 'Recovery'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ========================================================= */}
        {/* TAB 1: ON-TIME DELIVERY PERFORMANCE */}
        {/* ========================================================= */}
        {activeTab === 'On-Time Delivery Performance' && (
          <View style={styles.tabContent}>
            {/* KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderTopColor: '#16A36A', borderTopWidth: 3 }]}>
                <Text style={styles.kpiLabel}>On-Time Delivery</Text>
                <Text style={[styles.kpiVal, { color: '#16A36A' }]}>92.4%</Text>
                <Text style={styles.kpiSub}>Target: 95.0%</Text>
              </View>

              <View style={[styles.kpiCard, { borderTopColor: '#DC2626', borderTopWidth: 3 }]}>
                <Text style={styles.kpiLabel}>Delayed Shipments</Text>
                <Text style={[styles.kpiVal, { color: '#DC2626' }]}>7.6%</Text>
                <Text style={styles.kpiSub}>4 consignments</Text>
              </View>

              <View style={[styles.kpiCard, { borderTopColor: '#2563EB', borderTopWidth: 3 }]}>
                <Text style={styles.kpiLabel}>Avg Lead Time</Text>
                <Text style={styles.kpiVal}>4.2 Days</Text>
                <Text style={styles.kpiSub}>Variance ±0.6d</Text>
              </View>
            </View>

            {/* Monthly Delivery Trend Bar Chart */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>Monthly Delivery Trend (6-Month)</Text>
                <View style={styles.targetLegend}>
                  <View style={styles.targetDash} />
                  <Text style={styles.targetLegendText}>Target 95%</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtitle}>
                Consistently improving trajectory towards enterprise SLA threshold
              </Text>

              {/* Bar Chart Visual */}
              <View style={styles.chartContainer}>
                {monthlyOtd.map((item) => {
                  const heightPct = Math.max(20, (item.rate - 75) * 4.5);
                  const isCurrent = item.month === 'Oct';
                  return (
                    <View key={item.month} style={styles.chartCol}>
                      <Text style={styles.colValText}>{item.rate}%</Text>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            {
                              height: `${heightPct}%`,
                              backgroundColor: isCurrent ? '#0D9488' : '#2563EB',
                            },
                          ]}
                        />
                      </View>
                      <Text
                        style={[
                          styles.colLabelText,
                          isCurrent && { fontWeight: '800', color: '#0D9488' },
                        ]}
                      >
                        {item.month}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Comparison Over Time */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quarterly Performance Comparison</Text>
              <Text style={styles.sectionSubtitle}>Progressive quarterly delivery reliability</Text>

              {quarterlyTrends.map((q) => (
                <View key={q.quarter} style={styles.quarterRow}>
                  <View style={styles.quarterLeft}>
                    <Text style={styles.quarterName}>{q.quarter}</Text>
                  </View>
                  <View style={styles.quarterMiddle}>
                    <Text style={styles.quarterRate}>{q.rate}</Text>
                  </View>
                  <View style={styles.quarterRight}>
                    <Text
                      style={[
                        styles.quarterDiff,
                        q.diff.startsWith('+')
                          ? { color: '#16A36A' }
                          : q.diff.startsWith('-')
                          ? { color: '#DC2626' }
                          : { color: '#64748B' },
                      ]}
                    >
                      {q.diff}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: DISRUPTION TRENDS */}
        {/* ========================================================= */}
        {activeTab === 'Disruption Trends' && (
          <View style={styles.tabContent}>
            {/* Disruption Summary KPI Header */}
            <View style={styles.disruptionSummaryBanner}>
              <View style={styles.disruptStat}>
                <Text style={styles.disruptStatLabel}>Total Incidents (90d)</Text>
                <Text style={styles.disruptStatVal}>14 Events</Text>
              </View>
              <View style={styles.disruptDivider} />
              <View style={styles.disruptStat}>
                <Text style={styles.disruptStatLabel}>Active Incidents</Text>
                <Text style={[styles.disruptStatVal, { color: '#DC2626' }]}>3 Live</Text>
              </View>
              <View style={styles.disruptDivider} />
              <View style={styles.disruptStat}>
                <Text style={styles.disruptStatLabel}>Resolved</Text>
                <Text style={[styles.disruptStatVal, { color: '#16A36A' }]}>11 Closed</Text>
              </View>
            </View>

            {/* Disruptions by Type */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Disruptions by Category</Text>
              <Text style={styles.sectionSubtitle}>
                Proportion of supply chain disruptions logged across 90-day window
              </Text>

              {/* Visual Proportion Bar */}
              <View style={styles.stackedBarContainer}>
                {disruptionTypes.map((t) => (
                  <View
                    key={t.type}
                    style={{ flex: t.pct, backgroundColor: t.color, height: '100%' }}
                  />
                ))}
              </View>

              {/* Categorical Breakdown Cards */}
              {disruptionTypes.map((item) => (
                <View key={item.type} style={styles.disruptTypeRow}>
                  <View style={[styles.disruptTypeDot, { backgroundColor: item.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.disruptTypeName}>{item.type}</Text>
                    <Text style={styles.disruptTypeExample}>{item.example}</Text>
                  </View>
                  <View style={styles.disruptTypeStats}>
                    <Text style={[styles.disruptTypeCount, { color: item.color }]}>
                      {item.count} events
                    </Text>
                    <Text style={styles.disruptTypePct}>{item.pct}%</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Monthly Disruption Volume */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Monthly Disruption Incident Volume</Text>
              <Text style={styles.sectionSubtitle}>
                Frequency of operational anomalies detected by satellite telemetry & ERP monitors
              </Text>

              <View style={styles.monthlyDisruptList}>
                {monthlyDisruptions.map((m) => (
                  <View key={m.month} style={styles.monthDisruptRow}>
                    <Text style={styles.monthDisruptName}>{m.month} 2026</Text>
                    <View style={styles.monthPillRow}>
                      <View style={styles.tagTransit}>
                        <Text style={styles.tagTransitText}>{m.transit} Freight</Text>
                      </View>
                      <View style={styles.tagSupplier}>
                        <Text style={styles.tagSupplierText}>{m.supplier} Supplier</Text>
                      </View>
                      <View style={styles.tagInventory}>
                        <Text style={styles.tagInventoryText}>{m.inventory} Inventory</Text>
                      </View>
                    </View>
                    <Text style={styles.monthTotalCount}>{m.count} Total</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: RECOVERY PERFORMANCE */}
        {/* ========================================================= */}
        {activeTab === 'Recovery Performance' && (
          <View style={styles.tabContent}>
            {/* Recovery KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={[styles.kpiCard, { borderTopColor: '#0D9488', borderTopWidth: 3 }]}>
                <Text style={styles.kpiLabel}>Recovery Rate</Text>
                <Text style={[styles.kpiVal, { color: '#0D9488' }]}>94.2%</Text>
                <Text style={styles.kpiSub}>Target: &gt;90%</Text>
              </View>

              <View style={[styles.kpiCard, { borderTopColor: '#16A36A', borderTopWidth: 3 }]}>
                <Text style={styles.kpiLabel}>Recovered Plans</Text>
                <Text style={[styles.kpiVal, { color: '#16A36A' }]}>16 / 17</Text>
                <Text style={styles.kpiSub}>Formulated plans</Text>
              </View>

              <View style={[styles.kpiCard, { borderTopColor: '#2563EB', borderTopWidth: 3 }]}>
                <Text style={styles.kpiLabel}>Avg Duration</Text>
                <Text style={styles.kpiVal}>2.4 Days</Text>
                <Text style={styles.kpiSub}>Time to restore SLA</Text>
              </View>
            </View>

            {/* Pending & Blocked Status Card */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Governance & Approval Status</Text>

              <View style={styles.statusBoxRow}>
                <View style={styles.statusBox}>
                  <Text style={styles.statusBoxLabel}>Pending Approvals</Text>
                  <Text style={[styles.statusBoxVal, { color: '#D97706' }]}>2 Plans</Text>
                  <Text style={styles.statusBoxSub}>RP-001, RP-002 awaiting sign-off</Text>
                </View>

                <View style={styles.statusBox}>
                  <Text style={styles.statusBoxLabel}>Blocked / Rejected</Text>
                  <Text style={[styles.statusBoxVal, { color: '#16A36A' }]}>0 Blocked</Text>
                  <Text style={styles.statusBoxSub}>Zero operational deadlocks</Text>
                </View>
              </View>
            </View>

            {/* Strategy Success Breakdown */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Mitigation Strategy Effectiveness</Text>
              <Text style={styles.sectionSubtitle}>
                Efficiency benchmarks across different recovery action protocols
              </Text>

              {recoveryStrategies.map((strat) => (
                <View key={strat.name} style={styles.stratCard}>
                  <View style={styles.stratHeader}>
                    <Text style={styles.stratName}>{strat.name}</Text>
                    <View style={styles.stratBadge}>
                      <Text style={[styles.stratBadgeText, { color: strat.color }]}>
                        {strat.successRate} Success
                      </Text>
                    </View>
                  </View>

                  <View style={styles.stratMetaRow}>
                    <Text style={styles.stratMeta}>Executed: {strat.count} plans</Text>
                    <Text style={styles.stratMeta}>Avg Duration: {strat.avgDuration}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Live Navigation CTA */}
            <View style={styles.ctaRow}>
              <Pressable
                style={styles.ctaBtn}
                onPress={() => router.push('/(protected)/supply-chain-manager/recovery' as any)}
              >
                <RotateCcw size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.ctaBtnText}>Live Recovery Monitor</Text>
              </Pressable>

              <Pressable
                style={styles.ctaBtnSecondary}
                onPress={() => router.push('/(protected)/supply-chain-manager/audit' as any)}
              >
                <ShieldCheck size={14} color="#10234D" style={{ marginRight: 6 }} />
                <Text style={styles.ctaBtnSecondaryText}>View Audit Trail</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.bottomActionBtn}
          onPress={() => router.push('/(protected)/supply-chain-manager/risk-analysis' as any)}
        >
          <BarChart2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.bottomActionBtnText}>Inspect Risk & Business Impact</Text>
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0D9488',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0D9488',
    fontWeight: '800',
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
  tabContent: {
    gap: 12,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10234D',
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 8,
    color: '#94A3B8',
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 12,
  },
  targetLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  targetDash: {
    width: 12,
    height: 2,
    backgroundColor: '#16A36A',
  },
  targetLegendText: {
    fontSize: 10,
    color: '#16A36A',
    fontWeight: '700',
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 140,
    paddingTop: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 6,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  colValText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
  },
  barTrack: {
    width: 20,
    height: '75%',
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
  },
  colLabelText: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 6,
  },
  quarterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quarterLeft: {
    flex: 1,
  },
  quarterName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  quarterMiddle: {
    width: 80,
    alignItems: 'center',
  },
  quarterRate: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  quarterRight: {
    width: 70,
    alignItems: 'flex-end',
  },
  quarterDiff: {
    fontSize: 11,
    fontWeight: '800',
  },
  disruptionSummaryBanner: {
    backgroundColor: '#10234D',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
  },
  disruptStat: {
    flex: 1,
    alignItems: 'center',
  },
  disruptStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 4,
    textAlign: 'center',
  },
  disruptStatVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  disruptDivider: {
    width: 1,
    backgroundColor: '#1E3A8A',
    marginHorizontal: 8,
  },
  stackedBarContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 14,
  },
  disruptTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  disruptTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  disruptTypeName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  disruptTypeExample: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  disruptTypeStats: {
    alignItems: 'flex-end',
  },
  disruptTypeCount: {
    fontSize: 11,
    fontWeight: '800',
  },
  disruptTypePct: {
    fontSize: 10,
    color: '#64748B',
  },
  monthlyDisruptList: {
    gap: 8,
  },
  monthDisruptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  monthDisruptName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    width: 70,
  },
  monthPillRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
  },
  tagTransit: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagTransitText: {
    fontSize: 9,
    color: '#2563EB',
    fontWeight: '700',
  },
  tagSupplier: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagSupplierText: {
    fontSize: 9,
    color: '#DC2626',
    fontWeight: '700',
  },
  tagInventory: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagInventoryText: {
    fontSize: 9,
    color: '#D97706',
    fontWeight: '700',
  },
  monthTotalCount: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10234D',
    width: 50,
    textAlign: 'right',
  },
  statusBoxRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statusBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statusBoxLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  statusBoxVal: {
    fontSize: 15,
    fontWeight: '900',
    marginBottom: 2,
  },
  statusBoxSub: {
    fontSize: 10,
    color: '#94A3B8',
  },
  stratCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stratHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  stratName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    flex: 1,
  },
  stratBadge: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stratBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stratMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stratMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  ctaBtn: {
    flex: 1,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  ctaBtnSecondary: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnSecondaryText: {
    color: '#10234D',
    fontSize: 12,
    fontWeight: '700',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  bottomActionBtn: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
