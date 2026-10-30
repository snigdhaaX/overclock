import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  ArrowRight,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Package,
  Truck,
  XCircle,
} from 'lucide-react-native';
import { POStatus, PurchaseOrder } from '../types';

interface PurchaseOrderCardProps {
  order: PurchaseOrder;
  onPress: () => void;
}

export function PurchaseOrderCard({ order, onPress }: PurchaseOrderCardProps) {
  const getStatusConfig = (status: POStatus) => {
    switch (status) {
      case 'open':
        return { label: 'OPEN / ISSUED', bg: '#EFF6FF', text: '#2563EB', icon: <Clock size={12} color="#2563EB" /> };
      case 'in_production':
        return { label: 'IN PRODUCTION', bg: '#FAF5FF', text: '#8B5CF6', icon: <Package size={12} color="#8B5CF6" /> };
      case 'dispatched':
        return { label: 'IN TRANSIT', bg: '#FEF3C7', text: '#B45309', icon: <Truck size={12} color="#B45309" /> };
      case 'completed':
        return { label: 'COMPLETED', bg: '#DCFCE7', text: '#15803D', icon: <CheckCircle2 size={12} color="#15803D" /> };
      case 'cancelled':
        return { label: 'CANCELLED', bg: '#FEE2E2', text: '#B91C1C', icon: <XCircle size={12} color="#B91C1C" /> };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Top Row: PO ID & Status */}
      <View style={styles.topRow}>
        <View style={styles.idContainer}>
          <Text style={styles.poId}>{order.id}</Text>
          {order.requestId && (
            <Text style={styles.refText}>Ref: {order.requestId}</Text>
          )}
        </View>

        <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
          {statusConfig.icon}
          <Text style={[styles.statusText, { color: statusConfig.text }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      {/* Supplier & Product Info */}
      <View style={styles.contentSection}>
        <Text style={styles.productName}>{order.productName}</Text>
        <Text style={styles.skuText}>SKU: {order.productSku}</Text>

        <View style={styles.supplierRow}>
          <Building size={13} color="#64748B" />
          <Text style={styles.supplierText} numberOfLines={1}>
            {order.supplierName}
          </Text>
        </View>
      </View>

      {/* Financials & Delivery Bar */}
      <View style={styles.statsStrip}>
        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <Package size={11} color="#64748B" />
            <Text style={styles.statLabel}>Ordered Qty</Text>
          </View>
          <Text style={styles.statVal}>{order.quantity.toLocaleString()} u</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <DollarSign size={11} color="#64748B" />
            <Text style={styles.statLabel}>Total Value</Text>
          </View>
          <Text style={styles.statValCost}>
            {order.currency}
            {order.totalAmount.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statCol}>
          <View style={styles.statLabelRow}>
            <Calendar size={11} color="#64748B" />
            <Text style={styles.statLabel}>Target ETA</Text>
          </View>
          <Text style={styles.statValDate}>{order.expectedDeliveryDate}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text style={styles.destinationText} numberOfLines={1}>
          Destination: {order.destinationWarehouse}
        </Text>
        <View style={styles.viewPrompt}>
          <Text style={styles.viewText}>Order Dossier</Text>
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
    alignItems: 'center',
    marginBottom: 12,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  poId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: 0.2,
  },
  refText: {
    fontSize: 11,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  contentSection: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
  },
  skuText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  supplierText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  statsStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginBottom: 10,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  statValCost: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  statValDate: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  destinationText: {
    fontSize: 11,
    color: '#64748B',
    flex: 1,
    marginRight: 8,
  },
  viewPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

export default PurchaseOrderCard;

