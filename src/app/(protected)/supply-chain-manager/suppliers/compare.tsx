import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Info,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  Scale,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';

export default function AlternativeSupplierComparisonScreen() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [decisionConfirmed, setDecisionConfirmed] = useState(false);

  // Demonstration Data specified by requirements
  const comparisonData = {
    current: {
      id: 'SUP-01',
      name: 'Global Silicon Fab Ltd',
      location: 'Chennai SEZ, Tamil Nadu',
      qualification: 'Approved',
      qualificationSub: 'Full ISO-9001 certified',
      leadTime: '14 days',
      pricePerUnit: '₹2,200',
      capacity: '500 units',
      moq: '500 units',
      onTimeDelivery: '78%',
      qualityRating: '4.2/5',
      activeRisk: 'Critical Risk',
      riskColor: '#DC2626',
    },
    alternative: {
      id: 'SUP-02',
      name: 'Continental Semiconductor Fab',
      location: 'Sanand Industrial Estate, Gujarat',
      qualification: 'Pending',
      qualificationSub: 'Phase 2 audit required',
      leadTime: '10 days',
      pricePerUnit: '₹2,000',
      capacity: '800 units',
      moq: '200 units',
      onTimeDelivery: '87%',
      qualityRating: '4.6/5',
      activeRisk: 'Low Risk',
      riskColor: '#16A34A',
    },
  };

  const metrics = [
    {
      label: 'Lead Time',
      current: comparisonData.current.leadTime,
      alt: comparisonData.alternative.leadTime,
      advantage: 'alt',
      diff: '-4 days faster',
    },
    {
      label: 'Price per Unit',
      current: comparisonData.current.pricePerUnit,
      alt: comparisonData.alternative.pricePerUnit,
      advantage: 'alt',
      diff: '₹200 lower (-9.1%)',
    },
    {
      label: 'Available Capacity',
      current: comparisonData.current.capacity,
      alt: comparisonData.alternative.capacity,
      advantage: 'alt',
      diff: '+300 units buffer',
    },
    {
      label: 'Minimum Order (MOQ)',
      current: comparisonData.current.moq,
      alt: comparisonData.alternative.moq,
      advantage: 'alt',
      diff: '200 vs 500 (flexible)',
    },
    {
      label: 'Qualification Status',
      current: comparisonData.current.qualification,
      alt: comparisonData.alternative.qualification,
      advantage: 'current',
      diff: 'Alt status: Pending audit',
    },
    {
      label: 'On-Time Delivery',
      current: comparisonData.current.onTimeDelivery,
      alt: comparisonData.alternative.onTimeDelivery,
      advantage: 'alt',
      diff: '+9.0% SLA reliability',
    },
    {
      label: 'Quality Rating',
      current: comparisonData.current.qualityRating,
      alt: comparisonData.alternative.qualityRating,
      advantage: 'alt',
      diff: '+0.4 vendor rating',
    },
    {
      label: 'Active Risk Status',
      current: comparisonData.current.activeRisk,
      alt: comparisonData.alternative.activeRisk,
      advantage: 'alt',
      diff: 'Low vs Critical bottleneck',
    },
  ];

  const handleConfirmDecision = () => {
    // Generate audit event for proposed sourcing decision
    setDecisionConfirmed(true);
    setTimeout(() => {
      setModalVisible(false);
      router.push('/(protected)/supply-chain-manager/approvals/RP-001' as any);
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Supplier Comparison"
        subtitle="Disruption Sourcing Decision Support"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Disruption Context Banner */}
      <View style={styles.contextBanner}>
        <View style={styles.contextTopRow}>
          <View style={styles.contextBadge}>
            <AlertTriangle size={12} color="#DC2626" style={{ marginRight: 4 }} />
            <Text style={styles.contextBadgeText}>Disruption Mitigation</Text>
          </View>
          <Text style={styles.disruptionId}>Incident SHP-101</Text>
        </View>
        <Text style={styles.contextTitle}>
          Sourcing Evaluation for Component PRD-012 Industrial Microcontrollers
        </Text>
        <Text style={styles.contextDesc}>
          Primary vendor affected by Port of Singapore congestion. Comparing contracted baseline against vetted regional fallback.
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Supplier Profile Dual Header */}
        <View style={styles.dualProfileContainer}>
          {/* Current Supplier Profile */}
          <View style={[styles.profileCard, styles.currentProfileCard]}>
            <View style={styles.profileBadgeCurrent}>
              <Text style={styles.profileBadgeCurrentText}>CURRENT SUPPLIER</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={2}>
              {comparisonData.current.name}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={11} color="#64748B" style={{ marginRight: 3 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {comparisonData.current.location}
              </Text>
            </View>
            <View style={styles.qualRow}>
              <CheckCircle2 size={12} color="#16A36A" style={{ marginRight: 4 }} />
              <Text style={styles.qualTextApproved}>Approved</Text>
            </View>
          </View>

          {/* Alternative Supplier Profile */}
          <View style={[styles.profileCard, styles.altProfileCard]}>
            <View style={styles.profileBadgeAlt}>
              <Text style={styles.profileBadgeAltText}>ALTERNATIVE</Text>
            </View>
            <Text style={styles.profileName} numberOfLines={2}>
              {comparisonData.alternative.name}
            </Text>
            <View style={styles.locationRow}>
              <MapPin size={11} color="#0D9488" style={{ marginRight: 3 }} />
              <Text style={styles.locationText} numberOfLines={1}>
                {comparisonData.alternative.location}
              </Text>
            </View>
            <View style={styles.qualRow}>
              <AlertCircle size={12} color="#D97706" style={{ marginRight: 4 }} />
              <Text style={styles.qualTextPending}>Pending</Text>
            </View>
          </View>
        </View>

        {/* Aligned Metric Comparison Table */}
        <View style={styles.sectionCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={styles.tableColHeaderMetric}>Comparison Metric</Text>
            <Text style={styles.tableColHeaderCurrent}>Current</Text>
            <Text style={styles.tableColHeaderAlt}>Alternative</Text>
          </View>

          {metrics.map((m, idx) => (
            <View
              key={m.label}
              style={[
                styles.tableMetricRow,
                idx % 2 === 1 && { backgroundColor: '#F8FAFC' },
              ]}
            >
              <View style={styles.metricLabelCol}>
                <Text style={styles.metricLabelText}>{m.label}</Text>
                <Text
                  style={[
                    styles.metricDiffText,
                    m.advantage === 'alt'
                      ? { color: '#0D9488' }
                      : { color: '#DC2626' },
                  ]}
                >
                  {m.diff}
                </Text>
              </View>

              <View style={styles.metricValCol}>
                <Text
                  style={[
                    styles.metricValText,
                    m.advantage === 'current' && styles.valAdvantage,
                  ]}
                >
                  {m.current}
                </Text>
              </View>

              <View style={styles.metricValCol}>
                <Text
                  style={[
                    styles.metricValText,
                    m.advantage === 'alt' && styles.valAdvantageAlt,
                  ]}
                >
                  {m.alt}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Advantage & Strategic Risk Assessment */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Strategic Trade-Off Assessment</Text>

          {/* Advantages */}
          <View style={styles.advantageBox}>
            <View style={styles.boxHeaderRow}>
              <TrendingUp size={14} color="#16A36A" style={{ marginRight: 6 }} />
              <Text style={styles.advantageBoxTitle}>Alternative Supplier Advantages</Text>
            </View>
            <Text style={styles.boxBullet}>
              • 4-day lead time reduction prevents assembly standstill at Bangalore Plant B.
            </Text>
            <Text style={styles.boxBullet}>
              • ₹200/unit price concession yields estimated ₹190,000 procurement savings across 950 units.
            </Text>
            <Text style={styles.boxBullet}>
              • 800-unit capacity fully absorbs total committed order volume with 150 units headroom.
            </Text>
          </View>

          {/* Risks & Governance Caveat */}
          <View style={styles.riskBox}>
            <View style={styles.boxHeaderRow}>
              <ShieldAlert size={14} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.riskBoxTitle}>Qualification Caveat & Risk Governance</Text>
            </View>
            <Text style={styles.riskDesc}>
              Alternative supplier holds <Text style={{ fontWeight: '700' }}>Pending</Text> qualification status. Phase 2 quality audits and automotive ISO sign-off have not yet been ratified.
            </Text>
            <View style={styles.policyNotice}>
              <Info size={13} color="#D97706" style={{ marginRight: 6, marginTop: 2 }} />
              <Text style={styles.policyNoticeText}>
                Selecting this alternative creates a <Text style={{ fontWeight: '700' }}>Proposed Sourcing Decision</Text>. It will not automatically issue a purchase order or bypass quality review.
              </Text>
            </View>
          </View>
        </View>

        {/* Secondary Navigation Actions */}
        <View style={styles.auxActionsRow}>
          <Pressable
            style={styles.auxBtn}
            onPress={() => router.push('/(protected)/supply-chain-manager/suppliers/SUP-01' as any)}
          >
            <Building size={14} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.auxBtnText}>View Supplier Details</Text>
          </Pressable>

          <Pressable
            style={styles.auxBtn}
            onPress={() => router.push('/(protected)/supply-chain-manager/approvals/RP-001' as any)}
          >
            <RotateCcw size={14} color="#64748B" style={{ marginRight: 6 }} />
            <Text style={styles.auxBtnTextSec}>Return to Recovery Plan</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Sticky Primary Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          style={styles.selectSupplierBtn}
          onPress={() => setModalVisible(true)}
        >
          <Scale size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.selectSupplierBtnText}>Select Alternative Supplier</Text>
        </Pressable>
      </View>

      {/* Modal: Proposed Sourcing Decision Governance */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <Scale size={20} color="#0D9488" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Proposed Sourcing Decision</Text>
                <Text style={styles.modalSubtitle}>Zero-Trust Governance Protocol</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)}>
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            {decisionConfirmed ? (
              <View style={styles.successStateWrap}>
                <CheckCircle2 size={44} color="#16A36A" style={{ marginBottom: 12 }} />
                <Text style={styles.successStateTitle}>Sourcing Proposal Created</Text>
                <Text style={styles.successStateDesc}>
                  Decision logged to Cryptographic Audit Trail (EVT-9042). Redirecting to Recovery Plan RP-001...
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.modalNoticeBox}>
                  <Text style={styles.modalNoticeText}>
                    You are proposing to substitute <Text style={{ fontWeight: '700' }}>Global Silicon Fab Ltd</Text> with <Text style={{ fontWeight: '700' }}>Continental Semiconductor Fab</Text> for Disruption SHP-101.
                  </Text>
                </View>

                <View style={styles.modalSummaryList}>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Target Sourcing Volume</Text>
                    <Text style={styles.modalSummaryVal}>800 Units (PRD-012)</Text>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Projected Unit Cost</Text>
                    <Text style={styles.modalSummaryVal}>₹2,000 / unit</Text>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Expected Lead Time</Text>
                    <Text style={[styles.modalSummaryVal, { color: '#0D9488' }]}>10 Days (-4 days)</Text>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text style={styles.modalSummaryLabel}>Governance Action</Text>
                    <Text style={[styles.modalSummaryVal, { color: '#D97706' }]}>Proposal (No auto-PO)</Text>
                  </View>
                </View>

                <View style={styles.modalButtonRow}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={styles.modalConfirmBtn}
                    onPress={handleConfirmDecision}
                  >
                    <CheckCircle2 size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalConfirmBtnText}>Confirm Proposal</Text>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  contextBanner: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  contextTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  contextBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  contextBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  disruptionId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748B',
  },
  contextTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  contextDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
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
  dualProfileContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  profileCard: {
    flex: 1,
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
  currentProfileCard: {
    borderTopWidth: 3,
    borderTopColor: '#DC2626',
  },
  altProfileCard: {
    borderTopWidth: 3,
    borderTopColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  profileBadgeCurrent: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  profileBadgeCurrentText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#991B1B',
  },
  profileBadgeAlt: {
    alignSelf: 'flex-start',
    backgroundColor: '#CCFBF1',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 6,
  },
  profileBadgeAltText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#0F766E',
  },
  profileName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
    minHeight: 34,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  locationText: {
    fontSize: 10,
    color: '#64748B',
    flex: 1,
  },
  qualRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qualTextApproved: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  qualTextPending: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 4,
  },
  tableColHeaderMetric: {
    flex: 1.4,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  tableColHeaderCurrent: {
    width: 80,
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableColHeaderAlt: {
    width: 80,
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  metricLabelCol: {
    flex: 1.4,
  },
  metricLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
  },
  metricDiffText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  metricValCol: {
    width: 80,
    alignItems: 'center',
  },
  metricValText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  valAdvantage: {
    fontWeight: '800',
    color: '#16A36A',
  },
  valAdvantageAlt: {
    fontWeight: '800',
    color: '#0D9488',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 10,
  },
  advantageBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  boxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  advantageBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  boxBullet: {
    fontSize: 11,
    color: '#166534',
    lineHeight: 16,
    marginBottom: 2,
  },
  riskBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 10,
    padding: 10,
  },
  riskBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B91C1C',
  },
  riskDesc: {
    fontSize: 11,
    color: '#7F1D1D',
    lineHeight: 16,
    marginBottom: 8,
  },
  policyNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  policyNoticeText: {
    fontSize: 10,
    color: '#92400E',
    flex: 1,
    lineHeight: 14,
  },
  auxActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  auxBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  auxBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  auxBtnTextSec: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  bottomBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  selectSupplierBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0D9488',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  selectSupplierBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#CCFBF1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  modalNoticeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  modalNoticeText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  modalSummaryList: {
    gap: 8,
    marginBottom: 16,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSummaryLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  modalSummaryVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1.5,
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  successStateWrap: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  successStateTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 6,
  },
  successStateDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 17,
  },
});
