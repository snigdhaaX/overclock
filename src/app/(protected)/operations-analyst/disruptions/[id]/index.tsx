import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileSpreadsheet,
  Layers,
  MapPin,
  Package,
  Ship,
  Sparkles,
  TrendingDown,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OperationsHeader from '../../../../../features/operations-analyst/components/OperationsHeader';
import OrderCard from '../../../../../features/operations-analyst/components/OrderCard';
import SeverityBadge from '../../../../../features/operations-analyst/components/SeverityBadge';
import StatusBadge from '../../../../../features/operations-analyst/components/StatusBadge';
import TimelineView from '../../../../../features/operations-analyst/components/TimelineView';
import { useOrderRisk } from '../../../../../features/operations-analyst/hooks/useOrderRisk';
import operationsService from '../../../../../features/operations-analyst/services/operationsService';

export default function DisruptionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'orders'>('overview');

  const disruption = operationsService.getDisruptionById(id || 'SHP-101') || operationsService.getDisruptions()[0];
  const { orders: affectedOrders } = useOrderRisk(operationsService.getOrders({ disruptionId: disruption.id }));

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Header with back navigation and Disruption ID */}
      <OperationsHeader
        title={disruption.id}
        subtitle={disruption.title}
        showBack
        onBack={() => router.back()}
        rightAction={
          <SeverityBadge severity={disruption.severity} />
        }
      />

      {/* Tabs Row */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('overview')}
          style={[styles.tabBtn, activeTab === 'overview' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}>
            Overview
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('timeline')}
          style={[styles.tabBtn, activeTab === 'timeline' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'timeline' && styles.tabTextActive]}>
            Timeline ({disruption.timeline.length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('orders')}
          style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Affected Orders ({disruption.affectedOrdersCount})
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeTab === 'overview' && (
          <>
            {/* Quick Summary Pill Bar */}
            <View style={styles.summaryBar}>
              <View style={styles.summaryItem}>
                <Clock size={16} color="#D97706" style={{ marginBottom: 4 }} />
                <Text style={styles.summaryLabel}>Delay Duration</Text>
                <Text style={[styles.summaryVal, { color: '#D97706' }]}>
                  {disruption.estimatedDelay}
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Layers size={16} color="#2563EB" style={{ marginBottom: 4 }} />
                <Text style={styles.summaryLabel}>Orders Impacted</Text>
                <Text style={[styles.summaryVal, { color: '#2563EB' }]}>
                  {disruption.affectedOrdersCount} Orders
                </Text>
              </View>

              <View style={styles.summaryDivider} />

              <View style={styles.summaryItem}>
                <Compass size={16} color="#16A34A" style={{ marginBottom: 4 }} />
                <Text style={styles.summaryLabel}>Status</Text>
                <Text style={[styles.summaryVal, { color: '#10234D' }]}>
                  {disruption.status}
                </Text>
              </View>
            </View>

            {/* Shipment Information Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <Ship size={18} color="#2563EB" style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>Shipment Information</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Carrier & Vessel</Text>
                <Text style={styles.infoValue}>{disruption.carrier}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Transit Corridor</Text>
                <Text style={styles.infoValue}>{disruption.location}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Original ETA</Text>
                <Text style={styles.infoValue}>{disruption.originalEta}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Revised ETA</Text>
                <Text style={[styles.infoValue, { color: '#DC2626', fontWeight: '700' }]}>
                  {disruption.revisedEta}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Current State</Text>
                <StatusBadge status={disruption.status} size="sm" />
              </View>
            </View>

            {/* Supplier & Product Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <Building size={18} color="#0D9488" style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>Supplier & Commodity</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Supplier</Text>
                <Text style={styles.infoValue}>{disruption.supplier}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Product Category</Text>
                <Text style={styles.infoValue}>{disruption.product}</Text>
              </View>
            </View>

            {/* Disruption Cause Analysis Card */}
            <View style={styles.sectionCard}>
              <View style={styles.cardHeader}>
                <AlertTriangle size={18} color="#D97706" style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>Root Cause Analysis</Text>
              </View>

              <Text style={styles.causeText}>{disruption.reason}</Text>

              <View style={styles.reportedAtBanner}>
                <Clock size={13} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.reportedAtText}>
                  First reported {disruption.reportedTime} via authenticated carrier event
                </Text>
              </View>
            </View>
          </>
        )}

        {activeTab === 'timeline' && (
          <View style={styles.sectionCard}>
            <Text style={styles.cardHeaderTitle}>Incident Event Log</Text>
            <Text style={styles.subtext}>
              Chronological audit trail of telemetry alerts, carrier communications, and investigations
            </Text>
            <TimelineView items={disruption.timeline} />
          </View>
        )}

        {activeTab === 'orders' && (
          <View>
            <View style={styles.ordersHeaderRow}>
              <Text style={styles.ordersHeaderTitle}>Committed Customer Deliveries</Text>
              <Text style={styles.ordersHeaderCount}>{affectedOrders.length} orders</Text>
            </View>

            {affectedOrders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action Bar */}
      <View style={styles.bottomActionBar}>
        <Pressable
          onPress={() => router.push(`/(protected)/operations-analyst/disruptions/${disruption.id}/impact`)}
          style={({ pressed }) => [styles.secondaryActionBtn, pressed && styles.btnPressed]}
        >
          <Layers size={16} color="#2563EB" style={{ marginRight: 6 }} />
          <Text style={styles.secondaryActionText}>View Impact Flow</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/(protected)/operations-analyst/recovery/recommendations')}
          style={({ pressed }) => [styles.primaryActionBtn, pressed && styles.btnPressed]}
        >
          <Sparkles size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.primaryActionText}>Recovery Plans</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '80%',
    alignSelf: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  subtext: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10234D',
    maxWidth: '60%',
    textAlign: 'right',
  },
  causeText: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 19,
    marginBottom: 12,
  },
  reportedAtBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  reportedAtText: {
    fontSize: 11,
    color: '#64748B',
  },
  ordersHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  ordersHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
  },
  ordersHeaderCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  secondaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563EB',
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.8,
  },
});
