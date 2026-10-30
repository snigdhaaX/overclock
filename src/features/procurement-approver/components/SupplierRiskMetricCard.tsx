import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Minus,
} from 'lucide-react-native';
import { SupplierRiskDimension } from '../types';

interface RiskMetricCardProps {
  dimension: SupplierRiskDimension;
}

export function SupplierRiskMetricCard({ dimension }: RiskMetricCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 75) return '#DC2626';
    if (score >= 50) return '#D97706';
    return '#16A36A';
  };

  const scoreColor = getScoreColor(dimension.score);

  const renderTrendIcon = () => {
    switch (dimension.trend) {
      case 'increasing':
        return <ArrowUpRight size={14} color="#DC2626" />;
      case 'decreasing':
        return <ArrowDownRight size={14} color="#16A36A" />;
      default:
        return <Minus size={14} color="#64748B" />;
    }
  };

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <Text style={styles.title}>{dimension.name}</Text>
          <Text style={styles.description}>{dimension.description}</Text>
        </View>

        <View style={styles.scoreBox}>
          <View style={[styles.scoreBadge, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {dimension.score}
            </Text>
          </View>
          <View style={styles.trendRow}>
            {renderTrendIcon()}
            <Text style={styles.trendText}>{dimension.trend.toUpperCase()}</Text>
          </View>
        </View>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarTrack}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${dimension.score}%`, backgroundColor: scoreColor },
          ]}
        />
      </View>

      {/* Risk Factors */}
      <View style={styles.factorsList}>
        <Text style={styles.factorsHeader}>Contributory Risk Indicators:</Text>
        {dimension.factors.map((factor, idx) => (
          <View key={idx} style={styles.factorRow}>
            <AlertTriangle size={12} color="#D97706" style={{ marginTop: 2 }} />
            <Text style={styles.factorText}>{factor}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
    gap: 12,
  },
  titleCol: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  description: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  scoreBox: {
    alignItems: 'center',
  },
  scoreBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 3,
  },
  trendText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  progressBarTrack: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorsList: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  factorsHeader: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  factorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 4,
  },
  factorText: {
    fontSize: 11,
    color: '#334155',
    flex: 1,
    lineHeight: 15,
  },
});

export default SupplierRiskMetricCard;

