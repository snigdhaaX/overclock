import {
  Clock,
  DollarSign,
  Edit2,
  MapPin,
  Package,
  Plane,
  RefreshCw,
  Trash2,
  Truck,
  Users,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { RecoveryAction } from '../types';

interface ActionCardProps {
  action: RecoveryAction;
  stepNumber?: number;
  onEdit?: () => void;
  onRemove?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  action,
  stepNumber,
  onEdit,
  onRemove,
}) => {
  const getActionIcon = () => {
    switch (action.type) {
      case 'transfer_stock':
        return <Truck size={18} color="#2563EB" />;
      case 'expedite_shipment':
        return <Plane size={18} color="#9333EA" />;
      case 'alternative_supplier':
        return <Users size={18} color="#0D9488" />;
      case 'split_fulfilment':
        return <RefreshCw size={18} color="#EA580C" />;
      default:
        return <Package size={18} color="#64748B" />;
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          {stepNumber && (
            <View style={styles.stepBadge}>
              <Text style={styles.stepText}>{stepNumber}</Text>
            </View>
          )}
          <View style={styles.iconCircle}>{getActionIcon()}</View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{action.title}</Text>
            <Text style={styles.description}>{action.description}</Text>
          </View>
        </View>

        <View style={styles.actionsGroup}>
          {onEdit && (
            <Pressable onPress={onEdit} hitSlop={8} style={styles.iconBtn}>
              <Edit2 size={15} color="#64748B" />
            </Pressable>
          )}
          {onRemove && (
            <Pressable onPress={onRemove} hitSlop={8} style={styles.iconBtn}>
              <Trash2 size={15} color="#DC2626" />
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.detailsGrid}>
        <View style={styles.gridItem}>
          <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.gridLabel}>From/Via: </Text>
          <Text style={styles.gridValue} numberOfLines={1}>
            {action.sourceOrCarrier}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.gridLabel}>To: </Text>
          <Text style={styles.gridValue} numberOfLines={1}>
            {action.destination}
          </Text>
        </View>
        <View style={styles.gridItem}>
          <Clock size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.gridLabel}>Lead Time: </Text>
          <Text style={styles.gridValue}>{action.leadTime}</Text>
        </View>
        <View style={styles.gridItem}>
          <DollarSign size={13} color="#64748B" style={{ marginRight: 2 }} />
          <Text style={styles.gridLabel}>Cost: </Text>
          <Text style={styles.gridValue}>${action.estimatedCost.toLocaleString()}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#10234D',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
  },
  stepText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
  },
  detailsGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  gridValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10234D',
    flex: 1,
  },
});

export default ActionCard;
