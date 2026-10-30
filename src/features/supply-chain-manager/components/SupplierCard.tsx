import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  MapPin,
  ShieldAlert,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SupplierProfile } from '../types';

interface SupplierCardProps {
  supplier: SupplierProfile;
  onPress?: () => void;
}

export const SupplierCard: React.FC<SupplierCardProps> = ({ supplier, onPress }) => {
  const router = useRouter();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push(`/(protected)/supply-chain-manager/suppliers/${supplier.id}` as any);
    }
  };

  const getStatusColor = () => {
    switch (supplier.status) {
      case 'Critical':
        return '#DC2626';
      case 'At Risk':
        return '#D97706';
      case 'Under Review':
        return '#2563EB';
      default:
        return '#16A34A';
    }
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.supplierId}>{supplier.id}</Text>
          <View style={styles.tierTag}>
            <Text style={styles.tierTagText}>Tier {supplier.tier}</Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() + '15' }]}>
          <Text style={[styles.statusBadgeText, { color: getStatusColor() }]}>
            {supplier.status}
          </Text>
        </View>
      </View>

      <Text style={styles.supplierName}>{supplier.name}</Text>
      <Text style={styles.categoryText}>{supplier.category}</Text>

      <View style={styles.locationRow}>
        <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
        <Text style={styles.locationText} numberOfLines={1}>
          {supplier.location}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Risk Score</Text>
          <Text
            style={[
              styles.metricValue,
              {
                color:
                  supplier.riskScore >= 80
                    ? '#DC2626'
                    : supplier.riskScore >= 60
                    ? '#D97706'
                    : '#16A36A',
              },
            ]}
          >
            {supplier.riskScore}/100
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Delivery SLA</Text>
          <Text
            style={[
              styles.metricValue,
              supplier.deliveryPerformance == null && { fontSize: 10, color: '#64748B', fontWeight: '600' },
            ]}
          >
            {supplier.deliveryPerformance != null
              ? `${supplier.deliveryPerformance}%`
              : 'Not enough history'}
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>Active Disruption</Text>
          <Text
            style={[
              styles.metricValue,
              { color: supplier.activeDisruptions > 0 ? '#DC2626' : '#64748B' },
            ]}
          >
            {supplier.activeDisruptions}
          </Text>
        </View>

        <View style={styles.metricCell}>
          <Text style={styles.metricLabel}>YTD Spend</Text>
          <Text style={styles.metricValue}>{supplier.spendYTD}</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.footerText}>
          {supplier.productsSupplied.length} products • {supplier.activeShipments.length} in transit
        </Text>
        <View style={styles.arrowRow}>
          <Text style={styles.viewText}>View Profile</Text>
          <ChevronRight size={14} color="#0D9488" />
        </View>
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
    marginBottom: 6,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supplierId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  tierTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tierTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metricCell: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 3,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  arrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
});

export default SupplierCard;
