import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  MapPin,
  Maximize2,
  Package,
  Route,
  Truck,
  X,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import SeverityBadge from '../../operations-analyst/components/SeverityBadge';
import StatusBadge from '../../operations-analyst/components/StatusBadge';
import { OrderRoute, RouteStop } from '../types';

interface RouteDetailSheetProps {
  route: OrderRoute;
  onClose: () => void;
}

export const RouteDetailSheet: React.FC<RouteDetailSheetProps> = ({ route, onClose }) => {
  const router = useRouter();

  return (
    <View style={styles.sheetContainer}>
      {/* Header Handle */}
      <View style={styles.handleBar} />

      {/* Sheet Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.orderTitleGroup}>
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>{route.orderId}</Text>
          </View>
          <Text style={styles.shipmentRefText}>{route.shipmentId}</Text>
          <SeverityBadge severity={route.riskLevel} size="sm" />
        </View>

        <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
          <X size={18} color="#64748B" />
        </Pressable>
      </View>

      <Text style={styles.customerName}>{route.customer}</Text>
      <Text style={styles.productDesc}>{route.product} • {route.quantity} units</Text>

      {/* Metrics Row */}
      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Route size={14} color="#0D9488" style={{ marginRight: 5 }} />
          <View>
            <Text style={styles.metricLabel}>Distance</Text>
            <Text style={styles.metricValue}>{route.distanceKm} km</Text>
          </View>
        </View>

        <View style={styles.metricItem}>
          <Clock size={14} color="#2563EB" style={{ marginRight: 5 }} />
          <View>
            <Text style={styles.metricLabel}>Transit Time</Text>
            <Text style={styles.metricValue}>{route.estimatedDuration}</Text>
          </View>
        </View>

        <View style={styles.metricItem}>
          <Calendar size={14} color="#D97706" style={{ marginRight: 5 }} />
          <View>
            <Text style={styles.metricLabel}>Delivery SLA</Text>
            <Text style={styles.metricValue}>{route.expectedDelivery}</Text>
          </View>
        </View>
      </View>

      {/* Delay Warning if present */}
      {route.delay && (
        <View style={styles.delayBanner}>
          <AlertTriangle size={15} color="#DC2626" style={{ marginRight: 8, flexShrink: 0 }} />
          <Text style={styles.delayBannerText}>
            Estimated Delay: {route.delay} due to transit disruption.
          </Text>
        </View>
      )}

      {/* Stop Progression */}
      <Text style={styles.stopsSectionTitle}>Logistics Corridor Stops ({route.stops.length})</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stopsScroll}
      >
        {route.stops.map((stop: RouteStop, index: number) => {
          const isDone = stop.status === 'completed';
          const isCurrent = stop.status === 'current';
          return (
            <View key={stop.id} style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View
                  style={[
                    styles.stopStatusDot,
                    isDone && styles.stopDotDone,
                    isCurrent && styles.stopDotCurrent,
                  ]}
                />
                <Text style={styles.stopTypeText}>{stop.type.toUpperCase()}</Text>
              </View>
              <Text style={styles.stopName} numberOfLines={1}>
                {stop.name}
              </Text>
              <Text style={styles.stopLocation} numberOfLines={1}>
                {stop.location}
              </Text>
              <Text style={styles.stopTime}>{stop.plannedArrival}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        {route.associatedDisruptionId && (
          <Pressable
            style={styles.impactBtn}
            onPress={() => {
              onClose();
              router.push(`/(protected)/supply-chain-manager/disruptions/${route.associatedDisruptionId}` as any);
            }}
          >
            <Text style={styles.impactBtnText}>View Disruption Details</Text>
          </Pressable>
        )}
        <Pressable
          style={styles.closeActionBtn}
          onPress={onClose}
        >
          <Text style={styles.closeActionBtnText}>Done</Text>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    position: 'absolute',
    bottom: 60,
    left: 12,
    right: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 10,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idBadge: {
    backgroundColor: '#F0FDFA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  idBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D9488',
  },
  shipmentRefText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  productDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  metricsGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  delayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  delayBannerText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    flex: 1,
  },
  stopsSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  stopsScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  stopCard: {
    width: 140,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  stopStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#CBD5E1',
  },
  stopDotDone: {
    backgroundColor: '#10B981',
  },
  stopDotCurrent: {
    backgroundColor: '#0D9488',
  },
  stopTypeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
  },
  stopName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 2,
  },
  stopLocation: {
    fontSize: 10,
    color: '#64748B',
  },
  stopTime: {
    fontSize: 9,
    color: '#94A3B8',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  impactBtn: {
    flex: 2,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  closeActionBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeActionBtnText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default RouteDetailSheet;
