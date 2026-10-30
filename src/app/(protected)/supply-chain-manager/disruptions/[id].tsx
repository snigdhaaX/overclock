import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  FileText,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
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
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import operationsService from '@/features/operations-analyst/services/operationsService';
import managerService from '@/features/supply-chain-manager/services/managerService';

export default function DisruptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'Overview' | 'Impact' | 'Affected Orders' | 'Timeline'>('Overview');

  const disruption = managerService.getDisruptionById(id || 'SHP-101') || managerService.getDisruptionById('SHP-101')!;
  
  const rawOrders = operationsService.getOrders({ disruptionId: disruption.id });
  const affectedOrders = rawOrders.length > 0 ? rawOrders : operationsService.getOrders().slice(0, 4);

  const tabs: Array<'Overview' | 'Impact' | 'Affected Orders' | 'Timeline'> = [
    'Overview',
    'Impact',
    'Affected Orders',
    'Timeline',
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title={disruption.id}
        subtitle="Executive incident assessment & recovery oversight"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Incident Status Banner */}
      <View style={styles.incidentBanner}>
        <View style={styles.bannerTop}>
          <View style={styles.bannerIdGroup}>
            <Text style={styles.bannerId}>{disruption.id}</Text>
            <SeverityBadge severity={disruption.severity} size="md" />
            <StatusBadge status={disruption.status as any} size="sm" />
          </View>
          <Text style={styles.bannerDelay}>{disruption.estimatedDelay} delay</Text>
        </View>

        <Text style={styles.bannerTitle}>{disruption.title}</Text>

        <View style={styles.bannerAnalystRow}>
          <User size={13} color="#0D9488" style={{ marginRight: 4 }} />
          <Text style={styles.analystLabel}>Investigating Analyst:</Text>
          <Text style={styles.analystName}>Anishwath (Operations Analyst)</Text>
        </View>
      </View>

      {/* 4 Tabs */}
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
        {activeTab === 'Overview' && (
          <View style={styles.tabContent}>
            {/* Shipment Telemetry */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Shipment & Logistics Telemetry</Text>

              <View style={styles.telemetryGrid}>
                <View style={styles.telemetryRow}>
                  <Text style={styles.metaLabel}>Carrier / Vessel</Text>
                  <Text style={styles.metaValue}>{disruption.carrier}</Text>
                </View>

                <View style={styles.telemetryRow}>
                  <Text style={styles.metaLabel}>Origin → Destination</Text>
                  <Text style={styles.metaValue}>{disruption.location}</Text>
                </View>

                <View style={styles.telemetryRow}>
                  <Text style={styles.metaLabel}>Original ETA</Text>
                  <Text style={styles.metaValue}>{disruption.originalEta}</Text>
                </View>

                <View style={styles.telemetryRow}>
                  <Text style={styles.metaLabel}>Revised Estimated ETA</Text>
                  <Text style={[styles.metaValue, { color: '#DC2626' }]}>
                    {disruption.revisedEta}
                  </Text>
                </View>

                <View style={styles.telemetryRow}>
                  <Text style={styles.metaLabel}>Supplier Reference</Text>
                  <Text style={styles.metaValue}>{disruption.supplier}</Text>
                </View>
              </View>
            </View>

            {/* Root Cause Narrative */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Root Cause & Telemetry Analysis</Text>
              <Text style={styles.reasonText}>{disruption.reason}</Text>

              <View style={styles.bulletBox}>
                <Text style={styles.bulletText}>
                  • Singapore Maritime Port Authority report confirmed Berth 4 transshipment backlog.
                </Text>
                <Text style={styles.bulletText}>
                  • Container release scheduled for 25 Oct, requiring immediate road expediting upon arrival.
                </Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Impact' && (
          <View style={styles.tabContent}>
            {/* Financial & Delivery Exposure */}
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Downstream Exposure Summary</Text>

              <View style={styles.exposureGrid}>
                <View style={styles.exposureCell}>
                  <Text style={styles.exposureLabel}>Total Revenue at Risk</Text>
                  <Text style={[styles.exposureVal, { color: '#DC2626' }]}>$211,200</Text>
                </View>

                <View style={styles.exposureCell}>
                  <Text style={styles.exposureLabel}>Commercial Orders</Text>
                  <Text style={styles.exposureVal}>4 Clients Impacted</Text>
                </View>

                <View style={styles.exposureCell}>
                  <Text style={styles.exposureLabel}>Total Units at Risk</Text>
                  <Text style={styles.exposureVal}>950 Units</Text>
                </View>

                <View style={styles.exposureCell}>
                  <Text style={styles.exposureLabel}>Warehouse Affected</Text>
                  <Text style={styles.exposureVal}>WH-MUM (Mumbai)</Text>
                </View>
              </View>

              <Pressable
                style={styles.impactDetailedBtn}
                onPress={() => router.push('/(protected)/supply-chain-manager/impact' as any)}
              >
                <Text style={styles.impactDetailedBtnText}>
                  Open Full Cascade Impact Analysis
                </Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        {activeTab === 'Affected Orders' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionCard}>
              <View style={styles.affectedHeaderRow}>
                <View>
                  <Text style={styles.cardHeaderTitle}>Commercial Client Consignments</Text>
                  <Text style={styles.sectionSubtitle}>
                    {affectedOrders.length} customer commitments vulnerable to disruption SLA penalties
                  </Text>
                </View>
                <View style={styles.orderCountBadge}>
                  <Package size={12} color="#0D9488" style={{ marginRight: 4 }} />
                  <Text style={styles.orderCountBadgeText}>{affectedOrders.length} Orders</Text>
                </View>
              </View>

              {affectedOrders.map((order) => (
                <View key={order.id} style={styles.orderCard}>
                  {/* Top Bar: Order ID, Risk Level, Disruption */}
                  <View style={styles.orderCardTop}>
                    <View style={styles.orderIdGroup}>
                      <Text style={styles.orderIdText}>{order.id}</Text>
                      <SeverityBadge severity={order.severity} size="sm" />
                    </View>
                    <View style={styles.disruptionTag}>
                      <AlertTriangle size={11} color="#DC2626" style={{ marginRight: 3 }} />
                      <Text style={styles.disruptionTagText}>
                        {order.associatedDisruptionId || disruption.id}
                      </Text>
                    </View>
                  </View>

                  {/* Customer & Destination */}
                  <View style={styles.orderDetailRow}>
                    <Building size={13} color="#64748B" style={{ marginTop: 2, marginRight: 6 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.customerName}>{order.customer}</Text>
                      <View style={styles.destinationRow}>
                        <MapPin size={11} color="#94A3B8" style={{ marginRight: 3 }} />
                        <Text style={styles.destinationText}>{order.destination}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Product Specification & Quantity */}
                  <View style={styles.orderMetaBox}>
                    <View style={styles.orderMetaItem}>
                      <Text style={styles.orderMetaLabel}>Product</Text>
                      <Text style={styles.orderMetaVal} numberOfLines={1}>
                        {order.product}
                      </Text>
                    </View>
                    <View style={styles.orderMetaDivider} />
                    <View style={styles.orderMetaItemSmall}>
                      <Text style={styles.orderMetaLabel}>Quantity</Text>
                      <Text style={styles.orderMetaVal}>{order.units} units</Text>
                    </View>
                  </View>

                  {/* Delivery Date & Value */}
                  <View style={styles.orderCardBottom}>
                    <View style={styles.dateGroup}>
                      <Calendar size={12} color="#64748B" style={{ marginRight: 4 }} />
                      <Text style={styles.dateLabel}>Delivery Date:</Text>
                      <Text style={styles.dateValue}>{order.deliveryCommitment}</Text>
                    </View>
                    <Pressable
                      style={styles.traceOrderBtn}
                      onPress={() => router.push('/(protected)/supply-chain-manager/network' as any)}
                    >
                      <Text style={styles.traceOrderBtnText}>Trace Route</Text>
                      <ArrowRight size={11} color="#2563EB" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {activeTab === 'Timeline' && (
          <View style={styles.tabContent}>
            <View style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Chronological Incident Audit</Text>
              <Text style={styles.sectionSubtitle}>
                Verified telemetry logs, satellite milestones & analyst activity
              </Text>

              {disruption.timeline.map((item, index) => (
                <View key={item.id} style={styles.timelineRow}>
                  <View style={styles.timelineLeft}>
                    <View style={styles.timelineDot} />
                    {index < disruption.timeline.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineRight}>
                    <Text style={styles.timelineTime}>{item.timestamp}</Text>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <Text style={styles.timelineDesc}>{item.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.primaryActionBtn}
          onPress={() => router.push('/(protected)/supply-chain-manager/approvals' as any)}
        >
          <ShieldCheck size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryActionBtnText}>Review Approval Queue (3)</Text>
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
  incidentBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  bannerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  bannerIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bannerId: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10234D',
  },
  bannerDelay: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  bannerAnalystRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  analystLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  analystName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
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
  },
  tabContent: {
    gap: 12,
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
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  telemetryGrid: {
    gap: 8,
  },
  telemetryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  metaLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  reasonText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 10,
  },
  bulletBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  bulletText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  exposureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  exposureCell: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    padding: 10,
    borderRadius: 10,
  },
  exposureLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
  },
  exposureVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  impactDetailedBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  impactDetailedBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  timelineRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D9488',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  timelineRight: {
    flex: 1,
    paddingLeft: 8,
  },
  timelineTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
    fontFamily: 'monospace',
  },
  timelineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 2,
  },
  timelineDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  affectedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D948815',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  disruptionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  disruptionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
  },
  orderDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  destinationText: {
    fontSize: 11,
    color: '#64748B',
  },
  orderMetaBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  orderMetaItem: {
    flex: 1,
  },
  orderMetaItemSmall: {
    width: 90,
    alignItems: 'flex-end',
  },
  orderMetaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  orderMetaVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  orderMetaDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  orderCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
    marginTop: 2,
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 10,
    color: '#64748B',
    marginRight: 4,
  },
  dateValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  traceOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  traceOrderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  primaryActionBtn: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
