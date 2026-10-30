import {
  CheckCircle2,
  ChevronRight,
  DollarSign,
  Gauge,
  Sparkles,
  Timer,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RecoveryPlan } from '../types';
import StatusBadge from './StatusBadge';

interface RecoveryPlanCardProps {
  plan: RecoveryPlan;
  isSelected?: boolean;
  onSelect?: () => void;
  onSimulate?: () => void;
  onViewDetails?: () => void;
}

export const RecoveryPlanCard: React.FC<RecoveryPlanCardProps> = ({
  plan,
  isSelected,
  onSelect,
  onSimulate,
  onViewDetails,
}) => {
  const isOptimal = plan.recommendationLabel.toLowerCase().includes('optimal');

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      {/* Top Banner Row */}
      <View style={styles.topRow}>
        <View
          style={[
            styles.labelBadge,
            { backgroundColor: isOptimal ? '#EFF6FF' : '#F8FAFC' },
          ]}
        >
          {isOptimal && <Sparkles size={12} color="#2563EB" style={{ marginRight: 4 }} />}
          <Text
            style={[
              styles.labelText,
              { color: isOptimal ? '#2563EB' : '#475569' },
            ]}
          >
            {plan.recommendationLabel}
          </Text>
        </View>

        <StatusBadge status={plan.status} size="sm" />
      </View>

      {/* Plan Title & Strategy */}
      <Text style={styles.planName}>{plan.planName}</Text>
      <Text style={styles.strategyText} numberOfLines={2}>
        {plan.strategy}
      </Text>

      {/* 3 Key Metrics Pills */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Est. Cost</Text>
          <Text style={styles.metricVal}>${plan.estimatedCost.toLocaleString()}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Delivery Impact</Text>
          <Text style={[styles.metricVal, { color: '#16A34A' }]}>
            {plan.deliveryImpact}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Feasibility</Text>
          <Text style={[styles.metricVal, { color: '#2563EB' }]}>
            {plan.feasibilityScore}%
          </Text>
        </View>
      </View>

      {/* Benefits summary list */}
      {plan.benefits.length > 0 && (
        <View style={styles.benefitsList}>
          {plan.benefits.slice(0, 2).map((benefit, idx) => (
            <View key={idx} style={styles.benefitRow}>
              <CheckCircle2 size={13} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.benefitText} numberOfLines={1}>
                {benefit}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Actions Row */}
      <View style={styles.actionsRow}>
        {onSimulate && (
          <Pressable
            onPress={onSimulate}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.btnPressed]}
          >
            <Gauge size={14} color="#2563EB" style={{ marginRight: 5 }} />
            <Text style={styles.actionBtnText}>Simulate</Text>
          </Pressable>
        )}

        {onViewDetails && (
          <Pressable
            onPress={onViewDetails}
            style={({ pressed }) => [styles.detailsBtn, pressed && styles.btnPressed]}
          >
            <Text style={styles.detailsBtnText}>View Details</Text>
            <ChevronRight size={14} color="#64748B" />
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
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#F8FAFF',
  },
  cardPressed: {
    opacity: 0.95,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  labelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  planName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  strategyText: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#EEF2F6',
    marginBottom: 12,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '80%',
    alignSelf: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  metricVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  benefitsList: {
    gap: 4,
    marginBottom: 12,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 2,
  },
  btnPressed: {
    opacity: 0.7,
  },
});

export default RecoveryPlanCard;
