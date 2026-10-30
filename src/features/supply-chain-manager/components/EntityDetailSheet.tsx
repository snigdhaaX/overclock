import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Building,
  CheckCircle,
  Factory,
  Layers,
  MapPin,
  Package,
  Truck,
  Warehouse,
  X,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface EntityDetailSheetProps {
  entity: {
    type: 'supplier' | 'warehouse' | 'distribution' | 'customer' | 'shipment';
    title: string;
    location: string;
    coordinate: { latitude: number; longitude: number };
    details?: any;
  };
  onClose: () => void;
}

export const EntityDetailSheet: React.FC<EntityDetailSheetProps> = ({ entity, onClose }) => {
  const router = useRouter();

  const getIcon = () => {
    switch (entity.type) {
      case 'supplier':
        return <Factory size={18} color="#0D9488" />;
      case 'warehouse':
        return <Warehouse size={18} color="#D97706" />;
      case 'distribution':
        return <Layers size={18} color="#2563EB" />;
      case 'customer':
        return <Package size={18} color="#7C3AED" />;
      default:
        return <Truck size={18} color="#10234D" />;
    }
  };

  const getBackgroundColor = () => {
    switch (entity.type) {
      case 'supplier':
        return '#F0FDFA';
      case 'warehouse':
        return '#FFFBEB';
      case 'distribution':
        return '#EFF6FF';
      case 'customer':
        return '#F5F3FF';
      default:
        return '#F8FAFC';
    }
  };

  const handleAction = () => {
    onClose();
    if (entity.type === 'supplier') {
      router.push('/(protected)/supply-chain-manager/suppliers' as any);
    } else if (entity.type === 'warehouse') {
      router.push('/(protected)/supply-chain-manager/warehouses' as any);
    } else if (entity.details?.orderId) {
      router.push('/(protected)/supply-chain-manager/disruptions' as any);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, { backgroundColor: getBackgroundColor() }]}>
            {getIcon()}
          </View>
          <View>
            <Text style={styles.typeTag}>{entity.type.toUpperCase()} FACILITY</Text>
            <Text style={styles.title} numberOfLines={1}>
              {entity.title}
            </Text>
          </View>
        </View>

        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <X size={18} color="#64748B" />
        </Pressable>
      </View>

      <View style={styles.locationRow}>
        <MapPin size={13} color="#64748B" style={{ marginRight: 4 }} />
        <Text style={styles.locationText}>{entity.location}</Text>
      </View>

      {entity.details && (
        <View style={styles.detailsBox}>
          {entity.details.orderId && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Linked Order:</Text>
              <Text style={styles.metaValue}>{entity.details.orderId}</Text>
            </View>
          )}
          {entity.details.customer && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Client:</Text>
              <Text style={styles.metaValue}>{entity.details.customer}</Text>
            </View>
          )}
          {entity.details.notes && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Notes:</Text>
              <Text style={styles.metaValue}>{entity.details.notes}</Text>
            </View>
          )}
        </View>
      )}

      <Pressable style={styles.actionBtn} onPress={handleAction}>
        <Text style={styles.actionBtnText}>
          {entity.type === 'supplier'
            ? 'View Supplier Intelligence'
            : entity.type === 'warehouse'
            ? 'View Warehouse Capacity'
            : 'View Active Telemetry'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeTag: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  actionBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default EntityDetailSheet;
