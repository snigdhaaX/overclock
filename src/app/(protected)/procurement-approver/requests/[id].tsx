import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  FileEdit,
  History,
  Link2,
  Package,
  Shield,
  ShieldAlert,
  TrendingUp,
  User,
  XCircle,
  Zap,
} from 'lucide-react-native';
import {
  ApprovalAuditEvent,
  ProcurementRequest,
} from '../../../../features/procurement-approver/types';
import { procurementService } from '../../../../features/procurement-approver/services/procurementService';
import ProcurementHeader from '../../../../features/procurement-approver/components/ProcurementHeader';
import {
  ProcurementPriorityBadge,
  ProcurementStatusBadge,
} from '../../../../features/procurement-approver/components/ProcurementStatusBadge';
import ApprovalDecisionSheet, {
  DecisionMode,
} from '../../../../features/procurement-approver/components/ApprovalDecisionSheet';

export default function RequestDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [, setDataVersion] = useState(0);
  const [modalMode, setModalMode] = useState<DecisionMode | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const request = id ? procurementService.getRequestById(id) : null;
  const auditEvents = request
    ? procurementService
        .getAuditEvents()
        .filter((e) => e.requestId.toLowerCase() === request.id.toLowerCase())
    : [];

  if (!request) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ProcurementHeader title="Request Details" showBack />
        <View style={styles.notFoundContainer}>
          <AlertCircle size={48} color="#DC2626" />
          <Text style={styles.notFoundTitle}>Request Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            The sourcing request with ID &quot;{id}&quot; could not be located.
          </Text>
          <Pressable style={styles.returnBtn} onPress={() => router.back()}>
            <Text style={styles.returnBtnText}>Return to Requests</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isPending = request.status === 'pending';
  const isOverThreshold = request.estimatedCost > request.approvalThreshold;
  const isApproved = request.status === 'approved';
  const isRejected = request.status === 'rejected';

  const handleDecisionConfirm = async (mode: DecisionMode, text: string) => {
    if (mode === 'approve') {
      const res = procurementService.approveRequest(
        request.id,
        'Priya Sharma (Procurement Approver)',
        text
      );
      if (!res.success) {
        Alert.alert('Approval Blocked', res.error || 'Failed to approve request.');
        return;
      }
      setActionSuccessMsg(`Request authorized. Purchase Order ${res.po?.id} generated on ledger.`);
    } else if (mode === 'reject') {
      const res = procurementService.rejectRequest(
        request.id,
        'Priya Sharma (Procurement Approver)',
        text
      );
      if (!res.success) {
        Alert.alert('Rejection Error', res.error || 'Failed to reject request.');
        return;
      }
      setActionSuccessMsg('Request rejection logged immutably in procurement audit trail.');
    } else if (mode === 'changes') {
      const res = procurementService.requestChanges(
        request.id,
        'Priya Sharma (Procurement Approver)',
        text
      );
      if (!res.success) {
        Alert.alert('Error', res.error || 'Failed to request changes.');
        return;
      }
      setActionSuccessMsg('Modification notice dispatched to Supply Chain Manager.');
    }
    setDataVersion((v) => v + 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title={request.id}
        subtitle="Formal Sourcing Dossier &amp; Approver Sign-off"
        showBack
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Status Confirmation Banner */}
        {actionSuccessMsg && (
          <View style={styles.successBanner}>
            <CheckCircle2 size={16} color="#15803D" />
            <Text style={styles.successText}>{actionSuccessMsg}</Text>
          </View>
        )}

        {/* Request Dossier Header */}
        <View style={styles.dossierCard}>
          <View style={styles.dossierTop}>
            <View style={styles.typeBlock}>
              <Text style={styles.typeLabel}>{request.typeLabel}</Text>
              <Text style={styles.productTitle}>{request.productName}</Text>
              <Text style={styles.skuText}>SKU: {request.productSku}</Text>
            </View>
          </View>

          <View style={styles.badgesRow}>
            <ProcurementPriorityBadge priority={request.priority} />
            <ProcurementStatusBadge status={request.status} />
          </View>

          {/* Threshold Alert if applicable */}
          {isOverThreshold && (
            <View style={styles.thresholdBlock}>
              <AlertTriangle size={16} color="#DC2626" />
              <View style={{ flex: 1 }}>
                <Text style={styles.thresholdTitle}>Authority Threshold Exceeded</Text>
                <Text style={styles.thresholdDesc}>
                  Estimated cost of ₹{request.estimatedCost.toLocaleString('en-IN')} exceeds your
                  individual signing authority limit of ₹
                  {request.approvalThreshold.toLocaleString('en-IN')}. Co-signature or escalation is
                  required.
                </Text>
              </View>
            </View>
          )}

          {/* Sourcing Cost Strip */}
          <View style={styles.costStrip}>
            <View style={styles.costCol}>
              <Text style={styles.costLabel}>Requested Quantity</Text>
              <Text style={styles.costVal}>{request.requestedQuantity.toLocaleString()} units</Text>
            </View>
            <View style={styles.costDivider} />
            <View style={styles.costCol}>
              <Text style={styles.costLabel}>Negotiated Unit Cost</Text>
              <Text style={styles.costVal}>
                {request.currency}
                {request.unitPrice.toLocaleString('en-IN')} / u
              </Text>
            </View>
            <View style={styles.costDivider} />
            <View style={styles.costCol}>
              <Text style={styles.costLabel}>Total Commitment</Text>
              <Text style={styles.costValTotal}>
                {request.currency}
                {request.estimatedCost.toLocaleString('en-IN')}
              </Text>
            </View>
          </View>

          {/* Business Justification */}
          <View style={styles.justificationBox}>
            <Text style={styles.sectionHeading}>Business Justification</Text>
            <Text style={styles.justificationText}>{request.businessJustification}</Text>
          </View>

          {/* Linked Operational Entities */}
          <View style={styles.linkedRow}>
            <View style={styles.linkedItem}>
              <User size={13} color="#64748B" />
              <Text style={styles.linkedText}>
                Submitted by: <Text style={{ fontWeight: '700' }}>{request.submittedBy}</Text>
              </Text>
            </View>
            <View style={styles.linkedItem}>
              <Calendar size={13} color="#64748B" />
              <Text style={styles.linkedText}>Required: {request.requiredDate}</Text>
            </View>
            {request.disruptionId && (
              <View style={styles.linkedItem}>
                <Link2 size={13} color="#8B5CF6" />
                <Text style={styles.linkedTextHighlight}>
                  Linked Disruption: {request.disruptionId} ({request.recoveryPlanId})
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Supplier Information Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Building size={18} color="#8B5CF6" />
            <Text style={styles.cardHeaderTitle}>Proposed Vendor Assessment</Text>
          </View>

          <View style={styles.supplierHero}>
            <View style={{ flex: 1 }}>
              <Text style={styles.suppName}>{request.supplierName}</Text>
              <Text style={styles.suppLoc}>{request.supplierLocation}</Text>
            </View>
            <ProcurementStatusBadge status={request.qualificationStatus} size="sm" />
          </View>

          <View style={styles.suppStatsGrid}>
            <View style={styles.suppStatBox}>
              <Clock size={14} color="#64748B" />
              <Text style={styles.suppStatLabel}>Lead Time</Text>
              <Text style={styles.suppStatVal}>{request.leadTimeDays} days</Text>
            </View>

            <View style={styles.suppStatBox}>
              <Package size={14} color="#64748B" />
              <Text style={styles.suppStatLabel}>Weekly Capacity</Text>
              <Text style={styles.suppStatVal}>800 units/wk</Text>
            </View>

            <View style={styles.suppStatBox}>
              <ShieldAlert size={14} color={request.supplierRiskScore > 70 ? '#DC2626' : '#16A36A'} />
              <Text style={styles.suppStatLabel}>Risk Score</Text>
              <Text
                style={[
                  styles.suppStatVal,
                  { color: request.supplierRiskScore > 70 ? '#DC2626' : '#16A36A' },
                ]}
              >
                {request.supplierRiskScore}/100
              </Text>
            </View>

            <View style={styles.suppStatBox}>
              <TrendingUp size={14} color="#16A36A" />
              <Text style={styles.suppStatLabel}>Delivery SLA</Text>
              <Text style={styles.suppStatVal}>92.4% On-Time</Text>
            </View>
          </View>

          {/* Quick link to compare */}
          <Pressable
            style={styles.compareLinkBtn}
            onPress={() => router.push('/(protected)/procurement-approver/suppliers/compare')}
          >
            <Text style={styles.compareLinkText}>
              Compare with Alternative Supplier Matrix &rarr;
            </Text>
          </Pressable>
        </View>

        {/* Impact Analysis Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Shield size={18} color="#2563EB" />
            <Text style={styles.cardHeaderTitle}>Supply Chain Impact Analysis</Text>
          </View>

          <View style={styles.impactList}>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Protected Customer Orders</Text>
              <Text style={styles.impactVal}>{request.ordersAffected.join(', ')}</Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Schedule Delta vs Sea Transit</Text>
              <Text style={[styles.impactVal, { color: '#16A36A' }]}>
                {request.deliveryImpactDays} Days (Buffer Restored)
              </Text>
            </View>
            <View style={styles.impactRow}>
              <Text style={styles.impactLabel}>Budget Headroom Check</Text>
              <Text
                style={[
                  styles.impactVal,
                  { color: isOverThreshold ? '#DC2626' : '#16A36A' },
                ]}
              >
                {isOverThreshold
                  ? 'Exceeds Delegation (Escalation Required)'
                  : 'Fully Within Approver Limit'}
              </Text>
            </View>
          </View>
        </View>

        {/* Existing Decision / PO Details if decided */}
        {(isApproved || isRejected) && (
          <View style={styles.decisionRecordCard}>
            <Text style={styles.recordTitle}>
              {isApproved ? 'Authorization Record' : 'Rejection Record'}
            </Text>
            <View style={styles.recordRow}>
              <Text style={styles.recordLabel}>Decision Actor:</Text>
              <Text style={styles.recordVal}>{request.decisionActor}</Text>
            </View>
            <View style={styles.recordRow}>
              <Text style={styles.recordLabel}>Timestamp:</Text>
              <Text style={styles.recordVal}>{request.decisionTimestamp}</Text>
            </View>
            {request.poId && (
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Purchase Order ID:</Text>
                <Text style={styles.recordValHighlight}>{request.poId}</Text>
              </View>
            )}
            {request.txHash && (
              <View style={styles.recordRow}>
                <Text style={styles.recordLabel}>Audit Ledger Tx:</Text>
                <Text style={styles.recordValHash}>{request.txHash}</Text>
              </View>
            )}
            <View style={{ marginTop: 6 }}>
              <Text style={styles.recordLabel}>Decision Comments:</Text>
              <Text style={styles.recordComment}>{request.decisionReason}</Text>
            </View>
          </View>
        )}

        {/* Approval History Timeline */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <History size={18} color="#0D9488" />
            <Text style={styles.cardHeaderTitle}>Audit History Trail ({auditEvents.length})</Text>
          </View>

          {auditEvents.map((evt, idx) => (
            <View key={evt.id} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={styles.timelineDot} />
                {idx < auditEvents.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineHeaderRow}>
                  <Text style={styles.timelineAction}>{evt.actionLabel}</Text>
                  <Text style={styles.timelineTime}>{evt.timestamp}</Text>
                </View>
                <Text style={styles.timelineActor}>
                  {evt.actor} · {evt.role}
                </Text>
                {evt.comments && <Text style={styles.timelineNotes}>{evt.comments}</Text>}
              </View>
            </View>
          ))}
        </View>

        {/* Approver Action Panel */}
        {isPending && (
          <View style={styles.actionPanel}>
            <Text style={styles.actionPanelTitle}>Approver Governance Decision</Text>
            <Text style={styles.actionPanelSubtitle}>
              Authorize commitment, request commercial revisions, or reject submission.
            </Text>

            <View style={styles.actionsGrid}>
              {/* Approve Button */}
              <Pressable
                style={[
                  styles.primaryApproveBtn,
                  isOverThreshold && styles.btnDisabled,
                ]}
                onPress={() => setModalMode('approve')}
                disabled={isOverThreshold}
              >
                <FileCheck size={18} color="#FFFFFF" />
                <Text style={styles.primaryApproveText}>
                  {isOverThreshold ? 'Threshold Exceeded' : 'Authorize & Issue PO'}
                </Text>
              </Pressable>

              <View style={styles.secondaryActionsRow}>
                {/* Request Changes */}
                <Pressable
                  style={styles.changesBtn}
                  onPress={() => setModalMode('changes')}
                >
                  <FileEdit size={16} color="#0284C7" />
                  <Text style={styles.changesBtnText}>Request Changes</Text>
                </Pressable>

                {/* Reject */}
                <Pressable
                  style={styles.rejectBtn}
                  onPress={() => setModalMode('reject')}
                >
                  <XCircle size={16} color="#DC2626" />
                  <Text style={styles.rejectBtnText}>Reject Request</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Decision Modal Sheet */}
      {modalMode && (
        <ApprovalDecisionSheet
          visible={Boolean(modalMode)}
          mode={modalMode}
          request={request}
          onClose={() => setModalMode(null)}
          onConfirm={handleDecisionConfirm}
        />
      )}
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
  notFoundContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 12,
  },
  notFoundSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  returnBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 14,
  },
  successText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#15803D',
    flex: 1,
  },
  dossierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  dossierTop: {
    marginBottom: 10,
  },
  typeBlock: {
    gap: 2,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10234D',
  },
  skuText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  thresholdBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
  },
  thresholdTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: 2,
  },
  thresholdDesc: {
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 15,
  },
  costStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 14,
  },
  costCol: {
    flex: 1,
    alignItems: 'center',
  },
  costDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
  },
  costLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 3,
    textAlign: 'center',
  },
  costVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  costValTotal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  justificationBox: {
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  justificationText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  linkedRow: {
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  linkedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkedText: {
    fontSize: 11,
    color: '#64748B',
  },
  linkedTextHighlight: {
    fontSize: 11,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  supplierHero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  suppName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  suppLoc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  suppStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  suppStatBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  suppStatLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 4,
  },
  suppStatVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  compareLinkBtn: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  compareLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  impactList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  impactVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  decisionRecordCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  recordTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 8,
  },
  recordRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  recordLabel: {
    fontSize: 11,
    color: '#475569',
  },
  recordVal: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  recordValHighlight: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  recordValHash: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    fontFamily: 'monospace',
  },
  recordComment: {
    fontSize: 11,
    color: '#1F2937',
    fontStyle: 'italic',
    marginTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0D9488',
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#CCFBF1',
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timelineHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineAction: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  timelineTime: {
    fontSize: 10,
    color: '#64748B',
  },
  timelineActor: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  timelineNotes: {
    fontSize: 11,
    color: '#334155',
    marginTop: 4,
    lineHeight: 15,
  },
  actionPanel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  actionPanelTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  actionPanelSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  actionsGrid: {
    gap: 10,
  },
  primaryApproveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A36A',
    paddingVertical: 14,
    borderRadius: 10,
    gap: 8,
  },
  btnDisabled: {
    backgroundColor: '#94A3B8',
  },
  primaryApproveText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  changesBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  changesBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0284C7',
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  rejectBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
});
