import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { AlternativeComparison } from '../types';

interface ComparisonCardProps {
  comparison: AlternativeComparison;
}

export function SupplierComparisonCard({ comparison }: ComparisonCardProps) {
  const { currentSupplier, alternativeSupplier, metrics, advantages, risks } = comparison;

  return (
    <View style={styles.container}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.metricColumnHeader}>
          <Text style={styles.headerLabel}>CRITERIA</Text>
        </View>
        <View style={styles.supplierColumnHeader}>
          <Text style={styles.supplierNameHeader} numberOfLines={1}>
            {currentSupplier.name.split(' ')[0]}
          </Text>
          <View style={[styles.statusTag, styles.statusTagApproved]}>
            <Text style={styles.statusTagText}>Current</Text>
          </View>
        </View>
        <View style={styles.supplierColumnHeader}>
          <Text style={styles.supplierNameHeader} numberOfLines={1}>
            {alternativeSupplier.name.split(' ')[0]}
          </Text>
          <View style={[styles.statusTag, styles.statusTagAlternative]}>
            <Text style={styles.statusTagTextAlt}>Proposed</Text>
          </View>
        </View>
      </View>

      {/* Rows */}
      {metrics.map((row, idx) => (
        <View
          key={idx}
          style={[styles.tableRow, idx % 2 === 0 ? styles.tableRowEven : styles.tableRowOdd]}
        >
          <View style={styles.metricLabelCell}>
            <Text style={styles.metricLabelText}>{row.label}</Text>
          </View>

          <View style={styles.valueCell}>
            <Text style={styles.currentValueText}>{row.current}</Text>
          </View>

          <View style={styles.valueCell}>
            <Text
              style={[
                styles.altValueText,
                row.isAdvantage && styles.advantageText,
                row.isWarning && styles.warningText,
              ]}
            >
              {row.alternative}
            </Text>
            {row.delta ? (
              <Text
                style={[
                  styles.deltaText,
                  row.isAdvantage ? styles.deltaGreen : styles.deltaAmber,
                ]}
              >
                {row.delta}
              </Text>
            ) : null}
          </View>
        </View>
      ))}

      {/* Strategic Advantages */}
      <View style={styles.sectionBox}>
        <Text style={styles.sectionBoxTitle}>Strategic Advantages</Text>
        {advantages.map((adv, i) => (
          <View key={i} style={styles.bulletRow}>
            <CheckCircle2 size={14} color="#16A36A" style={{ marginTop: 2 }} />
            <Text style={styles.bulletText}>{adv}</Text>
          </View>
        ))}
      </View>

      {/* Sourcing Risk Factors */}
      <View style={[styles.sectionBox, styles.riskBox]}>
        <Text style={[styles.sectionBoxTitle, styles.riskBoxTitle]}>
          Risk &amp; Governance Constraints
        </Text>
        {risks.map((risk, i) => (
          <View key={i} style={styles.bulletRow}>
            <AlertCircle size={14} color="#DC2626" style={{ marginTop: 2 }} />
            <Text style={styles.bulletText}>{risk}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#10234D',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  metricColumnHeader: {
    flex: 1.2,
  },
  headerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  supplierColumnHeader: {
    flex: 1,
    alignItems: 'center',
  },
  supplierNameHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statusTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusTagApproved: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusTagAlternative: {
    backgroundColor: '#8B5CF6',
  },
  statusTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  statusTagTextAlt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  tableRowEven: {
    backgroundColor: '#FFFFFF',
  },
  tableRowOdd: {
    backgroundColor: '#F8FAFC',
  },
  metricLabelCell: {
    flex: 1.2,
  },
  metricLabelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  valueCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentValueText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  altValueText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  advantageText: {
    color: '#16A36A',
  },
  warningText: {
    color: '#D97706',
  },
  deltaText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  deltaGreen: {
    color: '#16A36A',
  },
  deltaAmber: {
    color: '#D97706',
  },
  sectionBox: {
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: '#F0FDF4',
  },
  sectionBoxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  riskBox: {
    backgroundColor: '#FEF2F2',
  },
  riskBoxTitle: {
    color: '#B91C1C',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletText: {
    fontSize: 12,
    color: '#334155',
    flex: 1,
    lineHeight: 16,
  },
});

export default SupplierComparisonCard;

