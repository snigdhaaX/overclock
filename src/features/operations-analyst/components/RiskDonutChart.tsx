import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

interface RiskDonutChartProps {
  critical: number;
  high: number;
  medium: number;
  low: number;
  overallScore?: number;
}

export const RiskDonutChart: React.FC<RiskDonutChartProps> = ({
  critical,
  high,
  medium,
  low,
  overallScore = 78,
}) => {
  const total = critical + high + medium + low || 1;
  const size = 150;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Calculate percentages and stroke offsets
  const pCritical = critical / total;
  const pHigh = high / total;
  const pMedium = medium / total;
  const pLow = low / total;

  const strokeCritical = circumference * pCritical;
  const strokeHigh = circumference * pHigh;
  const strokeMedium = circumference * pMedium;
  const strokeLow = circumference * pLow;

  const offsetCritical = 0;
  const offsetHigh = -strokeCritical;
  const offsetMedium = -(strokeCritical + strokeHigh);
  const offsetLow = -(strokeCritical + strokeHigh + strokeMedium);

  const legendItems = [
    { label: 'Critical Risk', count: critical, pct: Math.round(pCritical * 100), color: '#DC2626', bg: '#FEE2E2' },
    { label: 'High Risk', count: high, pct: Math.round(pHigh * 100), color: '#EA580C', bg: '#FFEDD5' },
    { label: 'Medium Risk', count: medium, pct: Math.round(pMedium * 100), color: '#D97706', bg: '#FEF3C7' },
    { label: 'Low Risk', count: low, pct: Math.round(pLow * 100), color: '#16A34A', bg: '#DCFCE7' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.chartWrapper}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            {/* Background track */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#F1F5F9"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Low */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#16A34A"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeLow} ${circumference}`}
              strokeDashoffset={offsetLow}
              fill="none"
              strokeLinecap="round"
            />
            {/* Medium */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#D97706"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeMedium} ${circumference}`}
              strokeDashoffset={offsetMedium}
              fill="none"
              strokeLinecap="round"
            />
            {/* High */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#EA580C"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeHigh} ${circumference}`}
              strokeDashoffset={offsetHigh}
              fill="none"
              strokeLinecap="round"
            />
            {/* Critical */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#DC2626"
              strokeWidth={strokeWidth}
              strokeDasharray={`${strokeCritical} ${circumference}`}
              strokeDashoffset={offsetCritical}
              fill="none"
              strokeLinecap="round"
            />
          </G>
        </Svg>

        <View style={styles.centerText}>
          <Text style={styles.scoreValue}>{overallScore}</Text>
          <Text style={styles.scoreLabel}>Risk Index</Text>
        </View>
      </View>

      {/* Legend list */}
      <View style={styles.legendContainer}>
        {legendItems.map((item, idx) => (
          <View key={idx} style={styles.legendRow}>
            <View style={styles.legendLeft}>
              <View style={[styles.legendDot, { backgroundColor: item.color }]} />
              <Text style={styles.legendLabel}>{item.label}</Text>
            </View>
            <View style={styles.legendRight}>
              <Text style={styles.legendCount}>{item.count} items</Text>
              <Text style={styles.legendPct}>({item.pct}%)</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    flexDirection: 'column',
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  chartWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.5,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  legendContainer: {
    width: '100%',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 12,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legendLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  legendRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  legendPct: {
    fontSize: 11,
    color: '#64748B',
  },
});

export default RiskDonutChart;
