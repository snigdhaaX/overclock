import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Globe,
  ShieldAlert,
  Star,
  Truck,
} from 'lucide-react-native';
import { SupplierProfile } from '../types';
import { ProcurementStatusBadge } from './ProcurementStatusBadge';

interface SupplierCardProps {
  supplier: SupplierProfile;
  onPress: () => void;
}

export function SupplierCard({ supplier, onPress }: SupplierCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical':
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#D97706';
      default:
        return '#16A36A';
    }
  };

  const riskColor = getRiskColor(supplier.riskLevel);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.nameCol}>
          <Text style={styles.supplierName}>{supplier.name}</Text>
          <Text style={styles.categoryText}>{supplier.category}</Text>
        </View>

        <ProcurementStatusBadge status={supplier.qualificationStatus} size="sm" />
      </View>

      {/* Location */}
      <View style={styles.locationRow}>
        <Globe size={12} color="#64748B" />
        <Text style={styles.locationText}>{supplier.location}</Text>
      </View>

      {/* Disruption Warning */}
      {supplier.activeDisruptions > 0 && (
        <View style={styles.disruptionAlert}>
          <AlertTriangle size={13} color="#DC2626" />
          <Text style={styles.disruptionText}>
            {supplier.activeDisruptions} active supply disruption flagged
          </Text>
        </View>
      )}

      {/* Telemetry Metrics */}
      <View style={styles.metricsStrip}>
        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <ShieldAlert size={11} color={riskColor} />
            <Text style={styles.metricLabel}>Risk Score</Text>
          </View>
          <Text style={[styles.metricVal, { color: riskColor }]}>
            {supplier.riskScore}/100
          </Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <Truck size={11} color="#64748B" />
            <Text style={styles.metricLabel}>On-Time</Text>
          </View>
          <Text style={styles.metricVal}>{supplier.onTimeDeliveryRate}%</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <Clock size={11} color="#64748B" />
            <Text style={styles.metricLabel}>Lead Time</Text>
          </View>
          <Text style={styles.metricVal}>{supplier.averageLeadTimeDays}d</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricItem}>
          <View style={styles.metricLabelRow}>
            <Star size={11} color="#D97706" />
            <Text style={styles.metricLabel}>Quality</Text>
          </View>
          <Text style={styles.metricVal}>{supplier.qualityScore}/5</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.spendText}>
          YTD Sourcing: <Text style={{ fontWeight: '700' }}>{supplier.spendYTD}</Text>
        </Text>
        <View style={styles.profilePrompt}>
          <Text style={styles.profileText}>Supplier Dossier</Text>
          <ArrowRight size={12} color="#8B5CF6" />
        </View>
      </View>
    </Pressable>
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  nameCol: {
    flex: 1,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#475569',
  },
  disruptionAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 10,
  },
  disruptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  metricsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 10,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 2,
  },
  metricLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  metricVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  spendText: {
    fontSize: 11,
    color: '#64748B',
  },
  profilePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

export default SupplierCard;

