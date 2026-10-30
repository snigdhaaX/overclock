import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  Map,
  Package,
  Sparkles,
  TrendingDown,
  Warehouse,
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
import ImpactFlowDiagram from '../../../../../features/operations-analyst/components/ImpactFlowDiagram';
import OperationsHeader from '../../../../../features/operations-analyst/components/OperationsHeader';
import OrderCard from '../../../../../features/operations-analyst/components/OrderCard';
import SeverityBadge from '../../../../../features/operations-analyst/components/SeverityBadge';
import StatusBadge from '../../../../../features/operations-analyst/components/StatusBadge';
import operationsService from '../../../../../features/operations-analyst/services/operationsService';

export default function ImpactAnalysisScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'map' | 'orders' | 'inventory'>('map');

  const disruptionId = id || 'SHP-101';
  const disruption = operationsService.getDisruptionById(disruptionId) || operationsService.getDisruptions()[0];
  const impact = operationsService.getImpactSummary(disruptionId);
  const orders = operationsService.getOrders({ disruptionId });

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Impact Analysis"
        subtitle={`Downstream ripple effect: ${disruption.id}`}
        showBack
        onBack={() => router.back()}
        rightAction={<SeverityBadge severity={disruption.severity} />}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('map')}
          style={[styles.tabBtn, activeTab === 'map' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'map' && styles.tabTextActive]}>
            Impact Cascade
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('orders')}
          style={[styles.tabBtn, activeTab === 'orders' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Affected Orders ({impact.affectedOrders})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('inventory')}
          style={[styles.tabBtn, activeTab === 'inventory' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>
            Warehouse Buffers
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 4 Impact Summary KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Layers size={18} color="#2563EB" style={{ marginBottom: 4 }} />
              <Text style={styles.kpiValue}>{impact.affectedOrders}</Text>
              <Text style={styles.kpiLabel}>Orders at Risk</Text>
            </View>

            <View style={styles.kpiCard}>
              <Package size={18} color="#D97706" style={{ marginBottom: 4 }} />
              <Text style={styles.kpiValue}>{impact.totalUnitsAtRisk}</Text>
              <Text style={styles.kpiLabel}>Units Delayed</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Clock size={18} color="#EA580C" style={{ marginBottom: 4 }} />
              <Text style={styles.kpiValue}>{impact.estimatedDelay}</Text>
              <Text style={styles.kpiLabel}>Projected Delay</Text>
            </View>

            <View style={styles.kpiCard}>
              <DollarSign size={18} color="#DC2626" style={{ marginBottom: 4 }} />
              <Text style={[styles.kpiValue, { color: '#DC2626' }]}>
                ${(impact.revenueAtRisk / 1000).toFixed(0)}k
              </Text>
              <Text style={styles.kpiLabel}>Revenue Exposure</Text>
            </View>
          </View>
        </View>

        {activeTab === 'map' && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected Supply Chain Cascade</Text>
              <Text style={styles.sectionSubtitle}>
                Trace upstream supplier delays through transit into assembly warehouses and customer commitments
              </Text>
            </View>

            <ImpactFlowDiagram impact={impact} />
          </View>
        )}

        {activeTab === 'orders' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>High Risk Customer Deliveries</Text>
            <Text style={styles.sectionSubtitle}>
              Orders with pending delivery SLA commitments within the 5-day delay window
            </Text>

            <View style={{ marginTop: 12 }}>
              {orders.map((o) => (
                <OrderCard key={o.id} order={o} />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'inventory' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warehouse Buffer Status</Text>
            <Text style={styles.sectionSubtitle}>
              Inventory reserves across connected regional distribution nodes
            </Text>

            <View style={styles.warehouseCard}>
              <View style={styles.whHeader}>
                <View style={styles.whIcon}>
                  <Warehouse size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.whTitle}>WH-MUM (Mumbai Facility)</Text>
                  <Text style={styles.whSub}>Primary assembly buffer hub</Text>
                </View>
                <SeverityBadge severity="Critical" size="sm" />
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '14%', backgroundColor: '#DC2626' }]} />
              </View>
              <View style={styles.whMeta}>
                <Text style={styles.whMetaText}>Reserve Buffer: 14% (Critical depletion)</Text>
                <Text style={styles.whMetaText}>Threshold: 25%</Text>
              </View>
            </View>

            <View style={styles.warehouseCard}>
              <View style={styles.whHeader}>
                <View style={[styles.whIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Warehouse size={18} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.whTitle}>WH-BLR (Bangalore Facility)</Text>
                  <Text style={styles.whSub}>Alternative donor warehouse</Text>
                </View>
                <SeverityBadge severity="Low" size="sm" />
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '68%', backgroundColor: '#16A34A' }]} />
              </View>
              <View style={styles.whMeta}>
                <Text style={styles.whMetaText}>Reserve Buffer: 68% (Healthy)</Text>
                <Text style={styles.whMetaText}>Transferable: 350 units</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Action */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.push('/(protected)/operations-analyst/recovery/recommendations')}
          style={({ pressed }) => [styles.actionButton, pressed && styles.btnPressed]}
        >
          <Sparkles size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.actionButtonText}>Generate AI Recovery Strategies</Text>
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
    paddingBottom: 95,
  },
  kpiGrid: {
    gap: 10,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  warehouseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginTop: 10,
  },
  whHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  whIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  whTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  whSub: {
    fontSize: 11,
    color: '#64748B',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  whMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  whMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
