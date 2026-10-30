import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  MapPin,
  Package,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  Warehouse,
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
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';

export default function RiskBusinessImpactScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Orders at Risk' | 'Financial Impact' | 'Supply Risk'>('Orders at Risk');

  const tabs: Array<'Orders at Risk' | 'Financial Impact' | 'Supply Risk'> = [
    'Orders at Risk',
    'Financial Impact',
    'Supply Risk',
  ];

  // Demo Orders Data based on mock dataset
  const ordersAtRisk = [
    {
      id: 'ORD-445',
      customer: 'EduTech Pvt Ltd',
      destination: 'Bangalore Plant B',
      product: 'PRD-012 Industrial Microcontrollers',
      units: 280,
      riskScore: 92,
      severity: 'Critical' as const,
      revenue: '$68,500',
      disruption: 'SHP-101',
    },
    {
      id: 'ORD-446',
      customer: 'CampusMart Retail',
      destination: 'Hyderabad Assembly Hub',
      product: 'PRD-012 Industrial Microcontrollers',
      units: 190,
      riskScore: 85,
      severity: 'High' as const,
      revenue: '$46,200',
      disruption: 'SHP-101',
    },
    {
      id: 'ORD-447',
      customer: 'LearnHub Systems',
      destination: 'Pune Tech Park',
      product: 'PRD-012 Industrial Microcontrollers',
      units: 370,
      riskScore: 78,
      severity: 'High' as const,
      revenue: '$70,300',
      disruption: 'SHP-101',
    },
    {
      id: 'ORD-448',
      customer: 'Apex Automation Corp',
      destination: 'Chennai Robotics Lab',
      product: 'PRD-012 Industrial Microcontrollers',
      units: 110,
      riskScore: 64,
      severity: 'Medium' as const,
      revenue: '$26,400',
      disruption: 'SHP-101',
    },
    {
      id: 'ORD-449',
      customer: 'NextGen Robotics Ltd',
      destination: 'Delhi NCR Logistics Park',
      product: 'PRD-034 RAM Modules',
      units: 420,
      riskScore: 58,
      severity: 'Medium' as const,
      revenue: '$38,000',
      disruption: 'SHP-102',
    },
  ];

  // Financial Breakdown Data
  const financialData = {
    totalRevenueAtRisk: '$249,400',
    estimatedRecoveryCost: '$34,200',
    netExposure: '$215,200',
    disruptions: [
      {
        id: 'SHP-101',
        title: 'Port of Singapore Berth Congestion',
        revenueExposure: '$142,000',
        recoveryCost: '$14,200',
        ordersCount: 4,
        pct: 57,
      },
      {
        id: 'SHP-102',
        title: 'Gujarat Semiconductor Facility Fire',
        revenueExposure: '$75,400',
        recoveryCost: '$12,000',
        ordersCount: 2,
        pct: 30,
      },
      {
        id: 'SHP-103',
        title: 'Air Freight Customs Clearance Hold',
        revenueExposure: '$32,000',
        recoveryCost: '$8,000',
        ordersCount: 2,
        pct: 13,
      },
    ],
    corridors: [
      {
        corridor: 'Chennai SEZ → Mumbai WH (Global Silicon Fab)',
        exposure: '$142,000',
        pct: 57,
        status: 'Critical Bottleneck',
      },
      {
        corridor: 'Ahmedabad Fab → Delhi NCR (Precision Components)',
        exposure: '$75,400',
        pct: 30,
        status: 'Severe Risk',
      },
      {
        corridor: 'Kolkata Assembly → Pune Tech Park (Eastern Elec)',
        exposure: '$32,000',
        pct: 13,
        status: 'Moderate Risk',
      },
    ],
  };

  // Supply Risk Categorization
  const supplyRisks = [
    {
      category: 'Supplier Risk',
      icon: Building,
      score: 82,
      level: 'High Risk',
      color: '#DC2626',
      bgColor: '#FEF2F2',
      details: 'Single-source dependency on Global Silicon Fab Ltd for microcontrollers. Port transshipment delays directly idle tier-2 assembly lines.',
      mitigation: 'Qualify secondary source (Continental Fab, Sanand).',
    },
    {
      category: 'Shipment Risk',
      icon: Truck,
      score: 88,
      level: 'Critical Risk',
      color: '#DC2626',
      bgColor: '#FEF2F2',
      details: 'Singapore port backlog causes 4-day dwell time. 950 critical units delayed in maritime transit.',
      mitigation: 'Authorise expedited road freight upon arrival at Nhava Sheva.',
    },
    {
      category: 'Inventory Risk',
      icon: Package,
      score: 74,
      level: 'Elevated Risk',
      color: '#D97706',
      bgColor: '#FFFBEB',
      details: 'Mumbai Distribution Hub safety stock dropped to 18% of reorder baseline, below the 25% safety buffer threshold.',
      mitigation: 'Emergency inter-warehouse stock transfer from Bangalore Hub.',
    },
    {
      category: 'Warehouse Risk',
      icon: Warehouse,
      score: 61,
      level: 'Moderate Risk',
      color: '#2563EB',
      bgColor: '#EFF6FF',
      details: 'WH-BLR operating at 82% capacity utilisation; cross-docking bays strained by emergency transfers.',
      mitigation: 'Rebalance outbound delivery schedules to Pune assembly.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Risk & Business Impact"
        subtitle="Multi-Echelon Vulnerability & Financial Exposure"
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
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
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
        {/* TAB 1: ORDERS AT RISK */}
        {/* ========================================================= */}
        {activeTab === 'Orders at Risk' && (
          <View style={styles.tabContent}>
            {/* Summary KPI Cards */}
            <View style={styles.kpiRow}>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Total Orders</Text>
                <Text style={styles.kpiVal}>8 Orders</Text>
                <Text style={styles.kpiSub}>Across 5 hubs</Text>
              </View>
              <View style={[styles.kpiCard, { borderColor: '#FECACA' }]}>
                <Text style={styles.kpiLabel}>Critical / High</Text>
                <Text style={[styles.kpiVal, { color: '#DC2626' }]}>3 Orders</Text>
                <Text style={styles.kpiSub}>Immediate SLA risk</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Medium Risk</Text>
                <Text style={[styles.kpiVal, { color: '#D97706' }]}>3 Orders</Text>
                <Text style={styles.kpiSub}>Buffer absorbing</Text>
              </View>
              <View style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>Low Risk</Text>
                <Text style={[styles.kpiVal, { color: '#16A36A' }]}>2 Orders</Text>
                <Text style={styles.kpiSub}>On-schedule SLA</Text>
              </View>
            </View>

            {/* Visual Risk Distribution Chart */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Order Risk Severity Distribution</Text>
              <Text style={styles.sectionSubtitle}>
                Breakdown of active commercial order book by calculated vulnerability index
              </Text>

              {/* Stacked Proportional Bar */}
              <View style={styles.stackedBarContainer}>
                <View style={[styles.stackedSegment, { flex: 38, backgroundColor: '#DC2626' }]} />
                <View style={[styles.stackedSegment, { flex: 37, backgroundColor: '#D97706' }]} />
                <View style={[styles.stackedSegment, { flex: 25, backgroundColor: '#16A36A' }]} />
              </View>

              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                  <Text style={styles.legendText}>High / Critical: 38% (3)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
                  <Text style={styles.legendText}>Medium: 37% (3)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#16A36A' }]} />
                  <Text style={styles.legendText}>Low: 25% (2)</Text>
                </View>
              </View>
            </View>

            {/* Highest-Risk Order Records */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>Highest-Risk Order Records</Text>
                <Text style={styles.orderCountLabel}>Ranked by Risk Score</Text>
              </View>

              {ordersAtRisk.map((order) => (
                <View key={order.id} style={styles.orderItemCard}>
                  <View style={styles.orderItemTop}>
                    <View style={styles.orderIdGroup}>
                      <Text style={styles.orderId}>{order.id}</Text>
                      <SeverityBadge severity={order.severity} size="sm" />
                    </View>
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreLabel}>Risk Score:</Text>
                      <Text
                        style={[
                          styles.scoreVal,
                          {
                            color:
                              order.riskScore >= 80
                                ? '#DC2626'
                                : order.riskScore >= 60
                                ? '#D97706'
                                : '#16A36A',
                          },
                        ]}
                      >
                        {order.riskScore}/100
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.orderCustomer}>{order.customer}</Text>

                  <View style={styles.orderLocationRow}>
                    <MapPin size={11} color="#64748B" style={{ marginRight: 3 }} />
                    <Text style={styles.orderLocationText}>Destination: {order.destination}</Text>
                  </View>

                  <View style={styles.orderFooterRow}>
                    <Text style={styles.orderProduct} numberOfLines={1}>
                      {order.product} ({order.units} units)
                    </Text>
                    <Text style={styles.orderRevenue}>{order.revenue}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Affected Customer Destinations */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Affected Customer Destinations</Text>
              <Text style={styles.sectionSubtitle}>
                Regional distribution points vulnerable to downstream assembly pauses
              </Text>

              <View style={styles.destList}>
                <View style={styles.destItem}>
                  <MapPin size={13} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.destName}>Bangalore Plant B</Text>
                  <Text style={styles.destMeta}>280 units · Critical (ORD-445)</Text>
                </View>
                <View style={styles.destItem}>
                  <MapPin size={13} color="#DC2626" style={{ marginRight: 6 }} />
                  <Text style={styles.destName}>Hyderabad Assembly Hub</Text>
                  <Text style={styles.destMeta}>190 units · High Risk (ORD-446)</Text>
                </View>
                <View style={styles.destItem}>
                  <MapPin size={13} color="#D97706" style={{ marginRight: 6 }} />
                  <Text style={styles.destName}>Pune Tech Park</Text>
                  <Text style={styles.destMeta}>370 units · High Risk (ORD-447)</Text>
                </View>
                <View style={styles.destItem}>
                  <MapPin size={13} color="#2563EB" style={{ marginRight: 6 }} />
                  <Text style={styles.destName}>Chennai Robotics Lab</Text>
                  <Text style={styles.destMeta}>110 units · Medium Risk (ORD-448)</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: FINANCIAL IMPACT */}
        {/* ========================================================= */}
        {activeTab === 'Financial Impact' && (
          <View style={styles.tabContent}>
            {/* Top Financial Exposure Banner */}
            <View style={styles.financialBanner}>
              <Text style={styles.financialBannerLabel}>Total Revenue at Immediate Risk</Text>
              <Text style={styles.financialBannerVal}>{financialData.totalRevenueAtRisk}</Text>
              <View style={styles.financialBannerRow}>
                <View style={styles.finStat}>
                  <Text style={styles.finStatLabel}>Estimated Recovery Cost</Text>
                  <Text style={styles.finStatVal}>{financialData.estimatedRecoveryCost}</Text>
                </View>
                <View style={styles.finDivider} />
                <View style={styles.finStat}>
                  <Text style={styles.finStatLabel}>Net Exposure Buffer</Text>
                  <Text style={[styles.finStatVal, { color: '#0D9488' }]}>
                    {financialData.netExposure}
                  </Text>
                </View>
              </View>
            </View>

            {/* Financial Impact by Disruption Incident */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Cost Breakdown by Disruption</Text>
              <Text style={styles.sectionSubtitle}>
                Direct revenue exposure vs allocated recovery mitigation costs
              </Text>

              {financialData.disruptions.map((item) => (
                <View key={item.id} style={styles.disruptionFinCard}>
                  <View style={styles.disruptionFinHeader}>
                    <View style={styles.disruptionIdWrap}>
                      <Text style={styles.disruptionIdText}>{item.id}</Text>
                    </View>
                    <Text style={styles.disruptionFinTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </View>

                  <View style={styles.disruptionFinStats}>
                    <View style={styles.finItem}>
                      <Text style={styles.finItemLabel}>Revenue at Risk</Text>
                      <Text style={[styles.finItemVal, { color: '#DC2626' }]}>
                        {item.revenueExposure}
                      </Text>
                    </View>
                    <View style={styles.finItem}>
                      <Text style={styles.finItemLabel}>Mitigation Budget</Text>
                      <Text style={styles.finItemVal}>{item.recoveryCost}</Text>
                    </View>
                    <View style={styles.finItem}>
                      <Text style={styles.finItemLabel}>Affected Orders</Text>
                      <Text style={styles.finItemVal}>{item.ordersCount} Orders</Text>
                    </View>
                  </View>

                  {/* Visual Proportion Bar */}
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${item.pct}%`,
                          backgroundColor: item.pct > 50 ? '#DC2626' : '#2563EB',
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.pctLabel}>{item.pct}% of total supply chain revenue exposure</Text>
                </View>
              ))}
            </View>

            {/* Financial Impact by Logistics Corridor / Supplier */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Financial Exposure by Route / Supplier</Text>

              {financialData.corridors.map((corr, idx) => (
                <View key={idx} style={styles.corridorRow}>
                  <View style={styles.corridorLeft}>
                    <Text style={styles.corridorTitle}>{corr.corridor}</Text>
                    <Text style={styles.corridorStatus}>{corr.status}</Text>
                  </View>
                  <View style={styles.corridorRight}>
                    <Text style={styles.corridorExposure}>{corr.exposure}</Text>
                    <Text style={styles.corridorPct}>{corr.pct}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: SUPPLY RISK */}
        {/* ========================================================= */}
        {activeTab === 'Supply Risk' && (
          <View style={styles.tabContent}>
            {/* 4 Pillars of Supply Chain Risk */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Echelon Risk Assessment</Text>
              <Text style={styles.sectionSubtitle}>
                Continuous algorithmic scoring across suppliers, inventory, warehouses, and freight
              </Text>

              {supplyRisks.map((risk) => {
                const IconComponent = risk.icon;
                return (
                  <View key={risk.category} style={styles.supplyRiskCard}>
                    <View style={styles.supplyRiskHeader}>
                      <View style={[styles.supplyRiskIconWrap, { backgroundColor: risk.bgColor }]}>
                        <IconComponent size={18} color={risk.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.supplyRiskCategory}>{risk.category}</Text>
                        <Text style={[styles.supplyRiskLevel, { color: risk.color }]}>
                          {risk.level} · Score {risk.score}/100
                        </Text>
                      </View>
                      <View style={styles.riskMeterWrap}>
                        <Text style={[styles.riskMeterVal, { color: risk.color }]}>
                          {risk.score}%
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.supplyRiskDetails}>{risk.details}</Text>

                    <View style={styles.mitigationRow}>
                      <ShieldCheck size={12} color="#0D9488" style={{ marginRight: 4, marginTop: 2 }} />
                      <Text style={styles.mitigationText}>
                        <Text style={{ fontWeight: '700' }}>Active Countermeasure: </Text>
                        {risk.mitigation}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.reviewMitigationsBtn}
          onPress={() => router.push('/(protected)/supply-chain-manager/approvals' as any)}
        >
          <ShieldAlert size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.reviewMitigationsBtnText}>Review Approval Queue (3)</Text>
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
    fontSize: 13,
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
    fontSize: 14,
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
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  orderCountLabel: {
    fontSize: 11,
    color: '#0D9488',
    fontWeight: '700',
  },
  stackedBarContainer: {
    height: 12,
    borderRadius: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 10,
  },
  stackedSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  orderItemCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scoreLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  scoreVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  orderCustomer: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  orderLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderLocationText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingTop: 6,
  },
  orderProduct: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
    marginRight: 8,
  },
  orderRevenue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  destList: {
    gap: 8,
  },
  destItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  destName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    flex: 1,
  },
  destMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  financialBanner: {
    backgroundColor: '#10234D',
    borderRadius: 16,
    padding: 18,
  },
  financialBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  financialBannerVal: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  financialBannerRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#1E3A8A',
    paddingTop: 10,
  },
  finStat: {
    flex: 1,
  },
  finStatLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  finStatVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  finDivider: {
    width: 1,
    backgroundColor: '#1E3A8A',
    marginHorizontal: 12,
  },
  disruptionFinCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disruptionFinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  disruptionIdWrap: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  disruptionIdText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  disruptionFinTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    flex: 1,
  },
  disruptionFinStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  finItem: {
    flex: 1,
  },
  finItemLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  finItemVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  pctLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  corridorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  corridorLeft: {
    flex: 1,
  },
  corridorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  corridorStatus: {
    fontSize: 10,
    color: '#DC2626',
    marginTop: 2,
  },
  corridorRight: {
    alignItems: 'flex-end',
  },
  corridorExposure: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  corridorPct: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  supplyRiskCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  supplyRiskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  supplyRiskIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  supplyRiskCategory: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  supplyRiskLevel: {
    fontSize: 11,
    fontWeight: '700',
  },
  riskMeterWrap: {
    alignItems: 'flex-end',
  },
  riskMeterVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  supplyRiskDetails: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  mitigationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  mitigationText: {
    fontSize: 10,
    color: '#0F766E',
    flex: 1,
    lineHeight: 14,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  reviewMitigationsBtn: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewMitigationsBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
