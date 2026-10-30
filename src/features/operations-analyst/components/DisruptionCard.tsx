import {
  AlertTriangle,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Package,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Disruption } from '../types';
import SeverityBadge from './SeverityBadge';
import StatusBadge from './StatusBadge';

interface DisruptionCardProps {
  disruption: Disruption;
  onPress: () => void;
}

export const DisruptionCard: React.FC<DisruptionCardProps> = ({ disruption, onPress }) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.disruptionId}>{disruption.id}</Text>
          <Text style={styles.disruptionTitle} numberOfLines={1}>
            {disruption.title}
          </Text>
        </View>
        <SeverityBadge severity={disruption.severity} size="sm" />
      </View>

      {/* Reference & Location */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Package size={14} color="#64748B" style={styles.metaIcon} />
          <Text style={styles.metaText} numberOfLines={1}>
            {disruption.reference}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MapPin size={14} color="#64748B" style={styles.metaIcon} />
          <Text style={styles.metaText} numberOfLines={1}>
            {disruption.location}
          </Text>
        </View>
      </View>

      {/* Metric details pill row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailBadge}>
          <Clock size={13} color="#D97706" style={{ marginRight: 4 }} />
          <Text style={styles.detailText}>
            Delay: <Text style={styles.detailBold}>{disruption.estimatedDelay}</Text>
          </Text>
        </View>

        <View style={styles.detailBadge}>
          <Layers size={13} color="#2563EB" style={{ marginRight: 4 }} />
          <Text style={styles.detailText}>
            <Text style={styles.detailBold}>{disruption.affectedOrdersCount}</Text> orders affected
          </Text>
        </View>
      </View>

      {/* Bottom Footer Row */}
      <View style={styles.bottomRow}>
        <View style={styles.statusGroup}>
          <StatusBadge status={disruption.status} size="sm" />
          <Text style={styles.reportedTime}>{disruption.reportedTime}</Text>
        </View>
        <View style={styles.arrowCircle}>
          <ChevronRight size={16} color="#2563EB" />
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
  cardPressed: {
    backgroundColor: '#FAFCFF',
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  disruptionId: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginRight: 8,
  },
  disruptionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 14,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metaIcon: {
    marginRight: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  detailText: {
    fontSize: 11,
    color: '#475569',
  },
  detailBold: {
    fontWeight: '700',
    color: '#10234D',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  statusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reportedTime: {
    fontSize: 11,
    color: '#94A3B8',
  },
  arrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DisruptionCard;
