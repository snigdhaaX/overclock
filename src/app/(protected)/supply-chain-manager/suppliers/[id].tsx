import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Building,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  Layers,
  MapPin,
  Package,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  User,
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

export default function SupplierDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Products' | 'Performance'>('Overview');

  const supplier = managerService.getSupplierById(id || 'SUP-01') || managerService.getSupplierById('SUP-01');

  if (!supplier) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <ShieldAlert size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Supplier Not Found</Text>
          <Text style={styles.errorSubtitle}>Vendor profile "{id}" could not be located in registry.</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Return to Suppliers</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = () => {
    switch (supplier.status) {
      case 'Critical':
        return '#DC2626';
      case 'At Risk':
        return '#D97706';
      case 'Under Review':
        return '#2563EB';
      default:
        return '#16A34A';
    }
  };

  const tabs: Array<'Overview' | 'Products' | 'Performance'> = ['Overview', 'Products', 'Performance'];

  // Enriched demonstration products matching dataset
  const productList = [
    {
      name: supplier.productsSupplied[0] || 'PRD-012 Industrial Microcontrollers',
      sku: 'SKU-MIC-012-IND',
      category: supplier.category,
      availableQty: '500 units',
      capacity: '1,200 units / month',
      moq: '500 units',
      unitPrice: '₹2,200',
    },
    {
      name: supplier.productsSupplied[1] || 'PRD-014 High-Efficiency Regulators',
      sku: 'SKU-PWR-014-REG',
      category: 'Power Management',
      availableQty: '1,450 units',
      capacity: '3,500 units / month',
      moq: '250 units',
      unitPrice: '₹850',
    },
    {
      name: 'PRD-022 Embedded Logic Modules',
      sku: 'SKU-LOG-022-EMB',
      category: 'Semiconductor Logic',
      availableQty: '320 units',
      capacity: '800 units / month',
      moq: '150 units',
      unitPrice: '₹3,400',
    },
  ];

  // Delivery performance history
  const deliveryHistory = [
    {
      batchId: 'BATCH-9021',
      date: '10 Oct 2026',
      units: '1,200 units',
      status: 'On Time',
      qaScore: '100% Pass',
    },
    {
      batchId: 'BATCH-8814',
      date: '24 Sep 2026',
      units: '850 units',
      status: 'On Time',
      qaScore: '99.2% Pass',
    },
    {
      batchId: 'BATCH-8602',
      date: '08 Sep 2026',
      units: '900 units',
      status: 'Delayed (1 day)',
      qaScore: '98.5% Pass',
    },
    {
      batchId: 'BATCH-8419',
      date: '19 Aug 2026',
      units: '1,400 units',
      status: 'On Time',
      qaScore: '99.8% Pass',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable
          style={styles.backIconButton}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={20} color="#10234D" />
        </Pressable>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.headerTitle}>Supplier Dossier</Text>
          <Text style={styles.headerSubtitle}>{supplier.id} · Tier {supplier.tier} Supplier</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>{supplier.status}</Text>
        </View>
      </View>

      {/* Supplier Identity Summary Banner */}
      <View style={styles.identityBanner}>
        <View style={styles.vendorHeaderRow}>
          <View style={styles.iconCircle}>
            <Building size={22} color="#0D9488" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.vendorName}>{supplier.name}</Text>
            <Text style={styles.vendorCategory}>{supplier.category}</Text>
          </View>
        </View>

        {/* 3 Tabs Bar */}
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
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'Overview' && (
          <View style={styles.tabContent}>
            {/* Overview Specifications Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Supplier Operational Profile</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier Location</Text>
                <View style={styles.detailValRow}>
                  <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
                  <Text style={styles.detailVal}>{supplier.location}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Qualification Status</Text>
                <View style={styles.qualPillApproved}>
                  <CheckCircle2 size={11} color="#16A36A" style={{ marginRight: 4 }} />
                  <Text style={styles.qualPillText}>Approved (ISO-9001 / IATF-16949)</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Risk Status & Score</Text>
                <View style={styles.detailValRow}>
                  <Text
                    style={[
                      styles.detailValBold,
                      { color: supplier.riskScore >= 80 ? '#DC2626' : '#16A36A' },
                    ]}
                  >
                    {supplier.status} ({supplier.riskScore}/100)
                  </Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Baseline Lead Time</Text>
                <Text style={styles.detailVal}>14 days (Port of Singapore transshipment corridor)</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Current Disruptions</Text>
                <Text
                  style={[
                    styles.detailValBold,
                    { color: supplier.activeDisruptions > 0 ? '#DC2626' : '#16A36A' },
                  ]}
                >
                  {supplier.activeDisruptions > 0
                    ? `${supplier.activeDisruptions} Active Bottleneck (SHP-101)`
                    : 'None active (Normal operations)'}
                </Text>
              </View>
            </View>

            {/* Active Disruption Link Card */}
            {supplier.activeDisruptions > 0 && (
              <View style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <AlertTriangle size={18} color="#DC2626" />
                  <Text style={styles.alertTitle}>Active Disruption: SHP-101</Text>
                </View>
                <Text style={styles.alertDesc}>
                  Port of Singapore Berth 4 transshipment congestion is causing a 4-day delivery delay on incoming consignments.
                </Text>
                <Pressable
                  style={styles.alertBtn}
                  onPress={() => router.push('/(protected)/supply-chain-manager/disruptions/SHP-101' as any)}
                >
                  <Text style={styles.alertBtnText}>Inspect Incident Details</Text>
                  <ChevronRight size={14} color="#DC2626" />
                </Pressable>
              </View>
            )}

            {/* Quick Link to Alternative Comparison */}
            <View style={styles.compareBannerCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.compareBannerTitle}>Disruption Sourcing Evaluation</Text>
                <Text style={styles.compareBannerSubtitle}>
                  Compare this vendor against pre-qualified alternative suppliers.
                </Text>
              </View>
              <Pressable
                style={styles.compareNavBtn}
                onPress={() => router.push('/(protected)/supply-chain-manager/suppliers/compare' as any)}
              >
                <Scale size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.compareNavBtnText}>Compare</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PRODUCTS */}
        {/* ========================================================= */}
        {activeTab === 'Products' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Supplied BOM Component Portfolio</Text>
                  <Text style={styles.sectionSubtitle}>
                    Contracted components with production capacities and minimum order quantities
                  </Text>
                </View>
              </View>

              {productList.map((prod, idx) => (
                <View key={idx} style={styles.productDossierCard}>
                  <View style={styles.prodHeaderRow}>
                    <View style={styles.prodIconCircle}>
                      <Package size={16} color="#0D9488" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prodName}>{prod.name}</Text>
                      <Text style={styles.prodSku}>SKU: {prod.sku}</Text>
                    </View>
                    <View style={styles.prodCatBadge}>
                      <Text style={styles.prodCatBadgeText}>{prod.category}</Text>
                    </View>
                  </View>

                  <View style={styles.prodMetricsGrid}>
                    <View style={styles.prodMetricCell}>
                      <Text style={styles.prodMetricLabel}>Available Qty</Text>
                      <Text style={styles.prodMetricVal}>{prod.availableQty}</Text>
                    </View>
                    <View style={styles.prodMetricCell}>
                      <Text style={styles.prodMetricLabel}>Prod Capacity</Text>
                      <Text style={styles.prodMetricVal}>{prod.capacity}</Text>
                    </View>
                    <View style={styles.prodMetricCell}>
                      <Text style={styles.prodMetricLabel}>MOQ</Text>
                      <Text style={styles.prodMetricVal}>{prod.moq}</Text>
                    </View>
                    <View style={styles.prodMetricCell}>
                      <Text style={styles.prodMetricLabel}>Contract Price</Text>
                      <Text style={[styles.prodMetricVal, { color: '#2563EB' }]}>
                        {prod.unitPrice}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PERFORMANCE */}
        {/* ========================================================= */}
        {activeTab === 'Performance' && (
          <View style={styles.tabContent}>
            {/* KPI Performance Highlights */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>SLA & Performance Metrics</Text>

              <View style={styles.kpiRow}>
                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>On-Time Delivery</Text>
                  <Text style={[styles.kpiVal, { color: supplier.deliveryPerformance >= 90 ? '#16A36A' : '#D97706' }]}>
                    {supplier.deliveryPerformance}%
                  </Text>
                  <Text style={styles.kpiSub}>Target: 95.0%</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>Quality Rating</Text>
                  <Text style={[styles.kpiVal, { color: '#0D9488' }]}>
                    {supplier.qualityScore}% (4.2/5)
                  </Text>
                  <Text style={styles.kpiSub}>Zero-defect QA</Text>
                </View>

                <View style={styles.kpiBox}>
                  <Text style={styles.kpiLabel}>Average Lead Time</Text>
                  <Text style={styles.kpiVal}>14 Days</Text>
                  <Text style={styles.kpiSub}>Variance: ±1.8d</Text>
                </View>
              </View>
            </View>

            {/* Delivery History */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Consignment Delivery History</Text>
              <Text style={styles.sectionSubtitle}>Last 4 production batches delivered to regional hubs</Text>

              {deliveryHistory.map((hist, idx) => (
                <View key={hist.batchId} style={styles.histRow}>
                  <View style={styles.histLeft}>
                    <Text style={styles.histBatch}>{hist.batchId}</Text>
                    <Text style={styles.histDate}>{hist.date} · {hist.units}</Text>
                  </View>
                  <View style={styles.histRight}>
                    <Text
                      style={[
                        styles.histStatus,
                        hist.status.includes('Delayed') ? { color: '#DC2626' } : { color: '#16A36A' },
                      ]}
                    >
                      {hist.status}
                    </Text>
                    <Text style={styles.histQa}>{hist.qaScore}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Recent Disruptions Log */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Recent Disruption Incident History</Text>

              <View style={styles.incidentItem}>
                <View style={styles.incidentDotCritical} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.incidentTitle}>SHP-101: Singapore Port Transshipment Delay</Text>
                  <Text style={styles.incidentDate}>23 Oct 2026 — Ongoing (4 days delay)</Text>
                  <Text style={styles.incidentDesc}>
                    Berth congestion at Singapore Berth 4 impacting 950 microcontrollers for Mumbai WH.
                  </Text>
                </View>
              </View>

              <View style={styles.incidentItem}>
                <View style={styles.incidentDotResolved} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.incidentTitle}>SHP-089: Customs Documentation Hold</Text>
                  <Text style={styles.incidentDate}>15 Aug 2026 — Resolved (2 days delay)</Text>
                  <Text style={styles.incidentDesc}>
                    Electronic manifest clearance held at Chennai air freight terminal. Cleared with zero penalty.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Comparison Button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.compareAlternativeBtn}
          onPress={() => router.push('/(protected)/supply-chain-manager/suppliers/compare' as any)}
        >
          <Scale size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.compareAlternativeBtnText}>Compare with Alternative Suppliers</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  backIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitleGroup: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  identityBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  vendorHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0D948815',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vendorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  vendorCategory: {
    fontSize: 12,
    color: '#64748B',
  },
  tabsContainer: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
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
    gap: 12,
  },
  tabContent: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 3,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  detailValRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailVal: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '600',
  },
  detailValBold: {
    fontSize: 13,
    fontWeight: '800',
  },
  qualPillApproved: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  qualPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
  alertCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 14,
    padding: 14,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  alertDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    marginBottom: 10,
  },
  alertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  alertBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  compareBannerCard: {
    backgroundColor: '#F0FDFA',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 2,
  },
  compareBannerSubtitle: {
    fontSize: 11,
    color: '#115E59',
  },
  compareNavBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareNavBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productDossierCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prodHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  prodIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0D948815',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  prodName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  prodSku: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: 'monospace',
  },
  prodCatBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  prodCatBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#2563EB',
  },
  prodMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prodMetricCell: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prodMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  prodMetricVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
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
    fontSize: 9,
    color: '#94A3B8',
  },
  histRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  histLeft: {
    flex: 1,
  },
  histBatch: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  histDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  histRight: {
    alignItems: 'flex-end',
  },
  histStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  histQa: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  incidentItem: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  incidentDotCritical: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
    marginTop: 5,
    marginRight: 8,
  },
  incidentDotResolved: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A36A',
    marginTop: 5,
    marginRight: 8,
  },
  incidentTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  incidentDate: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  incidentDesc: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
    lineHeight: 15,
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  compareAlternativeBtn: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  compareAlternativeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#10234D',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
