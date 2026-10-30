import { Calendar, ChevronRight, Hash, Layers } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AffectedOrder } from '../types';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';

interface OrderCardProps {
  order: AffectedOrder;
  onPress?: () => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.orderId}>{order.id}</Text>
          <View style={styles.disruptionTag}>
            <Text style={styles.disruptionTagText}>Ref: {order.associatedDisruptionId}</Text>
          </View>
        </View>
        <SeverityBadge severity={order.severity} size="sm" />
      </View>

      <Text style={styles.customerName}>{order.customer}</Text>

      <View style={styles.productRow}>
        <Text style={styles.productText} numberOfLines={1}>
          {order.product}
        </Text>
        <Text style={styles.skuText}>{order.sku}</Text>
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Layers size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.metaLabel}>Quantity:</Text>
          <Text style={styles.metaValue}>{order.units} units</Text>
        </View>

        <View style={styles.metaCell}>
          <Calendar size={13} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.metaLabel}>Due:</Text>
          <Text style={styles.metaValue}>{order.deliveryCommitment}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.riskScoreContainer}>
          <Text style={styles.riskScoreLabel}>Risk Score: </Text>
          <Text
            style={[
              styles.riskScoreValue,
              {
                color:
                  order.riskScore >= 80
                    ? '#DC2626'
                    : order.riskScore >= 60
                    ? '#D97706'
                    : '#16A34A',
              },
            ]}
          >
            {order.riskScore}/100
          </Text>
        </View>

        <StatusBadge status={order.status} size="sm" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#FAFCFF',
    transform: [{ scale: 0.99 }],
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
  orderId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  disruptionTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disruptionTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  productRow: {
    marginBottom: 10,
  },
  productText: {
    fontSize: 12,
    color: '#64748B',
  },
  skuText: {
    fontSize: 11,
    color: '#94A3B8',
    fontFamily: 'monospace',
    marginTop: 1,
  },
  metaGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaCell: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  metaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  riskScoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riskScoreLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  riskScoreValue: {
    fontSize: 12,
    fontWeight: '800',
  },
});

export default OrderCard;
