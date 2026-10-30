import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  Layers,
  MapPin,
  ShieldCheck,
  User,
  Warehouse,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { WarehouseProfile } from '../types';

interface WarehouseCardProps {
  warehouse: WarehouseProfile;
  onPress?: () => void;
}

export const WarehouseCard: React.FC<WarehouseCardProps> = ({ warehouse, onPress }) => {
  const getHealthBadge = () => {
    switch (warehouse.inventoryHealth) {
      case 'Inventory Shortage':
        return { color: '#DC2626', bg: '#FEF2F2', label: 'Inventory Shortage' };
      case 'Capacity Warning':
        return { color: '#D97706', bg: '#FFFBEB', label: 'Capacity Warning' };
      case 'At Risk':
        return { color: '#EA580C', bg: '#FFF7ED', label: 'At Risk' };
      default:
        return { color: '#16A36A', bg: '#F0FDF4', label: 'Healthy Reserve' };
    }
  };

  const badge = getHealthBadge();

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.warehouseId}>{warehouse.id}</Text>
          <Text style={styles.sqftText}>{warehouse.totalStorageSqFt}</Text>
        </View>

        <View style={[styles.healthBadge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.healthBadgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.warehouseName}>{warehouse.name}</Text>

      <View style={styles.locationRow}>
        <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
        <Text style={styles.locationText} numberOfLines={1}>
          {warehouse.location}
        </Text>
      </View>

      {/* Capacity Utilization Progress Bar */}
      <View style={styles.capacitySection}>
        <View style={styles.capacityHeader}>
          <Text style={styles.capacityLabel}>Capacity Utilisation</Text>
          <Text
            style={[
              styles.capacityPercent,
              { color: warehouse.capacityUtilisation > 85 ? '#DC2626' : '#10234D' },
            ]}
          >
            {warehouse.capacityUtilisation}%
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${warehouse.capacityUtilisation}%`,
                backgroundColor:
                  warehouse.capacityUtilisation > 85
                    ? '#DC2626'
                    : warehouse.capacityUtilisation > 70
                    ? '#D97706'
                    : '#0D9488',
              },
            ]}
          />
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <ArrowDownLeft size={13} color="#2563EB" style={{ marginRight: 4 }} />
          <Text style={styles.metricLabel}>Inbound:</Text>
          <Text style={styles.metricValue}>{warehouse.incomingShipmentsCount} loads</Text>
        </View>

        <View style={styles.metricItem}>
          <ArrowUpRight size={13} color="#0D9488" style={{ marginRight: 4 }} />
          <Text style={styles.metricLabel}>Outbound:</Text>
          <Text style={styles.metricValue}>{warehouse.outgoingOrdersCount} orders</Text>
        </View>

        <View style={styles.metricItem}>
          <User size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.metricValue}>{warehouse.managerInCharge}</Text>
        </View>
      </View>

      {/* Active Warnings if any */}
      {warehouse.activeWarnings.length > 0 && (
        <View style={styles.warningBox}>
          <AlertTriangle size={13} color="#D97706" style={{ marginRight: 6, flexShrink: 0 }} />
          <Text style={styles.warningText} numberOfLines={1}>
            {warehouse.activeWarnings[0]}
          </Text>
        </View>
      )}
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
  warehouseId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  sqftText: {
    fontSize: 11,
    color: '#64748B',
  },
  healthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  healthBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  warehouseName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
  },
  capacitySection: {
    marginBottom: 12,
  },
  capacityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  capacityPercent: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 8,
    marginBottom: 8,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  metricValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  warningText: {
    fontSize: 11,
    color: '#B45309',
    fontWeight: '600',
    flex: 1,
  },
});

export default WarehouseCard;
