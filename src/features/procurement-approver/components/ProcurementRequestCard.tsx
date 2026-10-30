import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  AlertTriangle,
  ArrowRight,
  Building,
  Calendar,
  DollarSign,
  Package,
  User,
} from 'lucide-react-native';
import { ProcurementRequest } from '../types';
import {
  ProcurementPriorityBadge,
  ProcurementStatusBadge,
} from './ProcurementStatusBadge';

interface RequestCardProps {
  request: ProcurementRequest;
  onPress: () => void;
}

export function ProcurementRequestCard({ request, onPress }: RequestCardProps) {
  const isOverThreshold = request.estimatedCost > request.approvalThreshold;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {/* Top Header: ID & Badges */}
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.requestId}>{request.id}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeText}>{request.typeLabel}</Text>
          </View>
        </View>

        <View style={styles.badgeRow}>
          <ProcurementPriorityBadge priority={request.priority} />
          <ProcurementStatusBadge status={request.status} size="sm" />
        </View>
      </View>

      {/* Product Title */}
      <View style={styles.productSection}>
        <Text style={styles.productName}>{request.productName}</Text>
        <Text style={styles.skuText}>SKU: {request.productSku}</Text>
      </View>

      {/* Over-Threshold Alert */}
      {isOverThreshold && request.status === 'pending' && (
        <View style={styles.thresholdAlert}>
          <AlertTriangle size={14} color="#DC2626" />
          <Text style={styles.thresholdText}>
            Exceeds individual approval threshold (Limit: ₹
            {(request.approvalThreshold / 100000).toFixed(1)}L)
          </Text>
        </View>
      )}

      {/* Details Grid */}
      <View style={styles.metaGrid}>
        <View style={styles.metaRow}>
          <Building size={13} color="#64748B" />
          <Text style={styles.metaText} numberOfLines={1}>
            {request.supplierName}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Package size={13} color="#64748B" />
          <Text style={styles.metaText}>
            Qty:{' '}
            <Text style={{ fontWeight: '700', color: '#10234D' }}>
              {request.requestedQuantity.toLocaleString()}
            </Text>{' '}
            units
          </Text>
        </View>

        <View style={styles.metaRow}>
          <DollarSign size={13} color="#64748B" />
          <Text style={styles.costText}>
            {request.currency}
            {request.estimatedCost.toLocaleString('en-IN')}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <Calendar size={13} color="#64748B" />
          <Text style={styles.metaText}>Need by {request.requiredDate}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.cardFooter}>
        <View style={styles.submittedBy}>
          <User size={12} color="#64748B" />
          <Text style={styles.submittedText} numberOfLines={1}>
            {request.submittedBy}
          </Text>
        </View>

        <View style={styles.actionPrompt}>
          <Text style={styles.actionText}>Review &amp; Decide</Text>
          <ArrowRight size={13} color="#8B5CF6" />
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
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 8,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requestId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: 0.2,
  },
  typeBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  productSection: {
    marginBottom: 12,
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
    lineHeight: 20,
  },
  skuText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  thresholdAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginBottom: 12,
  },
  thresholdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    flex: 1,
  },
  metaGrid: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  costText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  submittedBy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    marginRight: 8,
  },
  submittedText: {
    fontSize: 11,
    color: '#64748B',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
});

export default ProcurementRequestCard;

