import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  Building,
  CheckCircle2,
  Clock,
  FileCheck,
  FileText,
  ShieldAlert,
  Users,
  Zap,
} from 'lucide-react-native';
import {
  ProcurementKpis,
  ProcurementRequest,
  PurchaseOrder,
  SupplierProfile,
} from '../../../features/procurement-approver/types';
import { procurementService } from '../../../features/procurement-approver/services/procurementService';
import ProcurementHeader from '../../../features/procurement-approver/components/ProcurementHeader';
import ProcurementBottomNav from '../../../features/procurement-approver/components/ProcurementBottomNav';
import ProcurementMetricCard from '../../../features/procurement-approver/components/ProcurementMetricCard';
import ProcurementRequestCard from '../../../features/procurement-approver/components/ProcurementRequestCard';

export default function ProcurementHomeScreen() {
  const [kpis, setKpis] = useState<ProcurementKpis>(() => procurementService.getKpis());
  const [recentRequests, setRecentRequests] = useState<ProcurementRequest[]>(() =>
    procurementService.getRequests().slice(0, 3)
  );
  const [highPriorityReq, setHighPriorityReq] = useState<ProcurementRequest | null>(() => {
    const allReqs = procurementService.getRequests();
    return allReqs.find((r) => r.priority === 'Urgent' && r.status === 'pending') || allReqs[0] || null;
  });
  const [highRiskSuppliers, setHighRiskSuppliers] = useState<SupplierProfile[]>(() =>
    procurementService
      .getSuppliers()
      .filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Critical')
      .slice(0, 2)
  );
  const [recentPOs, setRecentPOs] = useState<PurchaseOrder[]>(() =>
    procurementService.getPurchaseOrders().slice(0, 2)
  );
  const [refreshing, setRefreshing] = useState(false);

  const loadData = () => {
    setKpis(procurementService.getKpis());
    const allReqs = procurementService.getRequests();
    setRecentRequests(allReqs.slice(0, 3));

    const urgent = allReqs.find((r) => r.priority === 'Urgent' && r.status === 'pending');
    setHighPriorityReq(urgent || allReqs[0] || null);

    const suppliers = procurementService.getSuppliers();
    setHighRiskSuppliers(
      suppliers.filter((s) => s.riskLevel === 'High' || s.riskLevel === 'Critical').slice(0, 2)
    );

    const pos = procurementService.getPurchaseOrders();
    setRecentPOs(pos.slice(0, 2));
  };

  useEffect(() => {
    return procurementService.subscribe(loadData);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 500);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Procurement Control"
        subtitle="Enterprise Purchasing Governance & Sourcing Oversight"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Approver Authority & Shift Card */}
        <View style={styles.authorityCard}>
          <View style={styles.authorityTop}>
            <View style={styles.officerAvatar}>
              <Text style={styles.officerAvatarText}>PS</Text>
            </View>
            <View style={styles.officerDetails}>
              <Text style={styles.officerName}>Priya Sharma</Text>
              <Text style={styles.officerRole}>Senior Procurement Approver · L4 Delegation</Text>
            </View>
            <View style={styles.statusPill}>
              <View style={styles.statusDot} />
              <Text style={styles.statusPillText}>Authorized</Text>
            </View>
          </View>

          <View style={styles.authorityLimits}>
            <View style={styles.limitCol}>
              <Text style={styles.limitLabel}>Individual Threshold</Text>
              <Text style={styles.limitVal}>₹2,500,000 / PO</Text>
            </View>
            <View style={styles.limitDivider} />
            <View style={styles.limitCol}>
              <Text style={styles.limitLabel}>Pending Under Review</Text>
              <Text style={styles.limitValHighlight}>{kpis.totalUnderReviewAmount}</Text>
            </View>
          </View>
        </View>

        {/* Urgent Disruption Procurement Banner */}
        {highPriorityReq && (
          <View style={styles.urgentBanner}>
            <View style={styles.urgentHeader}>
              <View style={styles.urgentTag}>
                <Zap size={13} color="#FFFFFF" />
                <Text style={styles.urgentTagText}>DISRUPTION SOURCING ALERT</Text>
              </View>
              <Text style={styles.slaBadge}>Need by {highPriorityReq.requiredDate}</Text>
            </View>

            <Text style={styles.urgentTitle}>{highPriorityReq.productName}</Text>
            <Text style={styles.urgentDesc} numberOfLines={2}>
              {highPriorityReq.businessJustification}
            </Text>

            <View style={styles.urgentFooter}>
              <View>
                <Text style={styles.urgentCostLabel}>Estimated Commitment</Text>
                <Text style={styles.urgentCostVal}>
                  {highPriorityReq.currency}
                  {highPriorityReq.estimatedCost.toLocaleString('en-IN')} (
                  {highPriorityReq.requestedQuantity} units)
                </Text>
              </View>

              <Pressable
                style={styles.reviewBtn}
                onPress={() =>
                  router.push(`/(protected)/procurement-approver/requests/${highPriorityReq.id}` as any)
                }
              >
                <Text style={styles.reviewBtnText}>Review &amp; Decide</Text>
                <ArrowRight size={14} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        )}

        {/* 4 Core KPIs Grid */}
        <View style={styles.kpiSection}>
          <Text style={styles.sectionTitle}>Procurement Telemetry</Text>
          <View style={styles.kpiGrid}>
            <ProcurementMetricCard
              label="Pending Requests"
              value={kpis.pendingRequestsCount}
              subtext="Awaiting Approver Action"
              variant="purple"
              icon={<Clock size={16} color="#8B5CF6" />}
            />
            <ProcurementMetricCard
              label="Approved Today"
              value={kpis.approvedTodayCount}
              subtext="PO Generation Ready"
              variant="green"
              icon={<CheckCircle2 size={16} color="#16A36A" />}
            />
            <ProcurementMetricCard
              label="Active Suppliers"
              value={kpis.activeSuppliersCount}
              subtext="Qualified Vendors"
              variant="blue"
              icon={<Users size={16} color="#2563EB" />}
            />
            <ProcurementMetricCard
              label="High-Risk Suppliers"
              value={kpis.highRiskSuppliersCount}
              subtext="Active Disruption Exposure"
              variant="red"
              icon={<AlertTriangle size={16} color="#DC2626" />}
            />
          </View>
        </View>

        {/* Quick Operations Actions Grid */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Procurement Stations</Text>
          <View style={styles.actionGrid}>
            <Pressable
              style={styles.actionTile}
              onPress={() => router.push('/(protected)/procurement-approver/requests')}
            >
              <View style={[styles.tileIcon, { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' }]}>
                <FileCheck size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.tileTitle}>Review Requests</Text>
              <Text style={styles.tileSub}>Approve / Reject</Text>
            </Pressable>

            <Pressable
              style={styles.actionTile}
              onPress={() => router.push('/(protected)/procurement-approver/suppliers/compare')}
            >
              <View style={[styles.tileIcon, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                <ArrowRightLeft size={20} color="#16A36A" />
              </View>
              <Text style={styles.tileTitle}>Compare Suppliers</Text>
              <Text style={styles.tileSub}>Cost &amp; SLA Matrix</Text>
            </Pressable>

            <Pressable
              style={styles.actionTile}
              onPress={() => router.push('/(protected)/procurement-approver/purchase-orders')}
            >
              <View style={[styles.tileIcon, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                <FileText size={20} color="#2563EB" />
              </View>
              <Text style={styles.tileTitle}>Purchase Orders</Text>
              <Text style={styles.tileSub}>Issuance Ledger</Text>
            </Pressable>

            <Pressable
              style={styles.actionTile}
              onPress={() => router.push('/(protected)/procurement-approver/suppliers')}
            >
              <View style={[styles.tileIcon, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Building size={20} color="#D97706" />
              </View>
              <Text style={styles.tileTitle}>Supplier Directory</Text>
              <Text style={styles.tileSub}>Performance Roster</Text>
            </Pressable>
          </View>
        </View>

        {/* Recent Procurement Requests */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Sourcing Requests</Text>
            <Pressable
              onPress={() => router.push('/(protected)/procurement-approver/requests')}
              hitSlop={6}
            >
              <Text style={styles.seeAllText}>View All ({kpis.pendingRequestsCount})</Text>
            </Pressable>
          </View>

          {recentRequests.map((req) => (
            <ProcurementRequestCard
              key={req.id}
              request={req}
              onPress={() =>
                router.push(`/(protected)/procurement-approver/requests/${req.id}` as any)
              }
            />
          ))}
        </View>

        {/* Supplier Risk Alerts */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Supplier Risk Exposure</Text>
            <Pressable
              onPress={() => router.push('/(protected)/procurement-approver/risk-analysis')}
              hitSlop={6}
            >
              <Text style={styles.seeAllText}>Risk Analytics</Text>
            </Pressable>
          </View>

          {highRiskSuppliers.map((supp) => (
            <View key={supp.id} style={styles.riskAlertCard}>
              <View style={styles.riskTop}>
                <View style={styles.riskNameRow}>
                  <ShieldAlert size={16} color="#DC2626" />
                  <Text style={styles.riskSuppName}>{supp.name}</Text>
                </View>
                <View style={styles.riskScoreBadge}>
                  <Text style={styles.riskScoreText}>Score {supp.riskScore}/100</Text>
                </View>
              </View>
              <Text style={styles.riskLocation}>{supp.location}</Text>
              {supp.recentDisruptions && supp.recentDisruptions[0] && (
                <Text style={styles.riskReason}>{supp.recentDisruptions[0]}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Bottom space for nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      <ProcurementBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  authorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  authorityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  officerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FAF5FF',
    borderWidth: 1.5,
    borderColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  officerAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  officerDetails: {
    flex: 1,
  },
  officerName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  officerRole: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A36A',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
  },
  authorityLimits: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  limitCol: {
    flex: 1,
    alignItems: 'center',
  },
  limitDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  limitLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  limitVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  limitValHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  urgentBanner: {
    backgroundColor: '#10234D',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#10234D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  urgentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  urgentTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  urgentTagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  slaBadge: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  urgentTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  urgentDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  urgentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  urgentCostLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  urgentCostVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  reviewBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  kpiSection: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionsSection: {
    marginBottom: 18,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  tileIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tileTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  tileSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  listSection: {
    marginBottom: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  riskAlertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
  },
  riskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  riskNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  riskSuppName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  riskScoreBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  riskScoreText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },
  riskLocation: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  riskReason: {
    fontSize: 11,
    color: '#991B1B',
    backgroundColor: '#FEF2F2',
    padding: 6,
    borderRadius: 6,
    marginTop: 2,
    lineHeight: 15,
  },
});
