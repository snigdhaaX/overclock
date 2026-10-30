import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  TrendingDown,
  User,
  XCircle,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import SeverityBadge from '../../operations-analyst/components/SeverityBadge';
import StatusBadge from '../../operations-analyst/components/StatusBadge';
import { RecoveryPlan } from '../types';

interface ApprovalCardProps {
  plan: RecoveryPlan;
  onApprove?: (planId: string) => void;
  onReject?: (planId: string) => void;
  onReview?: (planId: string) => void;
}

export const ApprovalCard: React.FC<ApprovalCardProps> = ({
  plan,
  onApprove,
  onReject,
  onReview,
}) => {
  const router = useRouter();

  const handleReview = () => {
    if (onReview) {
      onReview(plan.id);
    } else {
      router.push(`/(protected)/supply-chain-manager/approvals/${plan.id}` as any);
    }
  };

  return (
    <Pressable style={styles.card} onPress={handleReview}>
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.planId}>{plan.id}</Text>
          <View style={styles.disruptionTag}>
            <Text style={styles.disruptionTagText}>Ref: {plan.relatedDisruptionId}</Text>
          </View>
        </View>
        <StatusBadge status={plan.status} size="sm" />
      </View>

      <Text style={styles.planName}>{plan.planName}</Text>
      <Text style={styles.strategy} numberOfLines={2}>
        {plan.strategy}
      </Text>

      {/* Analyst Submitter Info */}
      <View style={styles.submitterRow}>
        <User size={13} color="#64748B" style={{ marginRight: 4 }} />
        <Text style={styles.submitterLabel}>Submitted by:</Text>
        <Text style={styles.submitterName}>{plan.submittedBy || 'Anishwath (Analyst)'}</Text>
        <Text style={styles.submitterTime}>• {plan.submittedAt || 'Today, 09:12 AM'}</Text>
      </View>

      {/* Financial & Operational KPI Grid */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCell}>
          <Text style={styles.kpiLabel}>Estimated Cost</Text>
          <Text style={styles.kpiValue}>${plan.estimatedCost.toLocaleString()}</Text>
        </View>

        <View style={styles.kpiCell}>
          <Text style={styles.kpiLabel}>Delivery Impact</Text>
          <Text style={[styles.kpiValue, { color: '#16A36A' }]}>{plan.deliveryImpact}</Text>
        </View>

        <View style={styles.kpiCell}>
          <Text style={styles.kpiLabel}>Feasibility</Text>
          <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{plan.feasibilityScore}%</Text>
        </View>

        <View style={styles.kpiCell}>
          <Text style={styles.kpiLabel}>Priority</Text>
          <SeverityBadge severity={plan.priority as any} size="sm" />
        </View>
      </View>

      {/* Card Action Buttons */}
      <View style={styles.buttonRow}>
        <Pressable
          style={styles.reviewBtn}
          onPress={handleReview}
        >
          <Text style={styles.reviewBtnText}>Review Plan Details</Text>
        </Pressable>

        {plan.status === 'Pending Approval' && (
          <Pressable
            style={styles.decideBtn}
            onPress={() => router.push(`/(protected)/supply-chain-manager/approvals/${plan.id}/decision` as any)}
          >
            <ShieldCheck size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.decideBtnText}>Decide</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  disruptionTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disruptionTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  planName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  strategy: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 10,
  },
  submitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  submitterLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  submitterName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  submitterTime: {
    fontSize: 10,
    color: '#94A3B8',
    marginLeft: 4,
  },
  kpiGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  kpiCell: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 4,
    fontWeight: '600',
  },
  kpiValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewBtn: {
    flex: 2,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  decideBtn: {
    flex: 1.5,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  decideBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ApprovalCard;
