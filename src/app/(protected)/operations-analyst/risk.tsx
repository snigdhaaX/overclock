import { useRouter } from 'expo-router';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Building,
  CheckCircle2,
  Package,
  ShieldAlert,
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
import OperationsBottomNav from '../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../features/operations-analyst/components/OperationsHeader';
import OrderCard from '../../../features/operations-analyst/components/OrderCard';
import RiskDonutChart from '../../../features/operations-analyst/components/RiskDonutChart';
import SeverityBadge from '../../../features/operations-analyst/components/SeverityBadge';
import RiskSourceNote from '../../../features/operations-analyst/components/RiskSourceNote';
import { useOrderRisk } from '../../../features/operations-analyst/hooks/useOrderRisk';
import operationsService from '../../../features/operations-analyst/services/operationsService';
import type { SeverityLevel } from '../../../features/operations-analyst/types';
import { getLiveData, useSyncVersion } from '@/services/backendSync';
import { RiskEngineCard } from '../../../features/operations-analyst/components/RiskEngineCard';

export default function RiskIntelligenceScreen() {
  const router = useRouter();
  useSyncVersion();
  const live = getLiveData();
  const [activeTab, setActiveTab] = useState<'order' | 'inventory' | 'supplier'>('order');

  const sampleRiskData = operationsService.getRiskIntelligence();
  const { orders: scoredOrders, status, source, refresh } = useOrderRisk(operationsService.getOrders());
  const highRiskOrders = [...scoredOrders].sort((a, b) => b.riskScore - a.riskScore).slice(0, 4);

  // Once scores are live, the summary describes those same orders rather than sample totals.
  const isLive = status === 'live';
  const countBySeverity = (severity: SeverityLevel) => scoredOrders.filter((o) => o.severity === severity).length;
  const riskData = isLive && scoredOrders.length > 0
    ? {
        criticalCount: countBySeverity('Critical'),
        highCount: countBySeverity('High'),
        mediumCount: countBySeverity('Medium'),
        lowCount: countBySeverity('Low'),
        overallScore: Math.round(scoredOrders.reduce((sum, o) => sum + o.riskScore, 0) / scoredOrders.length),
      }
    : sampleRiskData;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Risk Intelligence"
        subtitle="Predictive vulnerability modeling across corridors"
        showBack
        onBack={() => router.back()}
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('order')}
          style={[styles.tabBtn, activeTab === 'order' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'order' && styles.tabTextActive]}>
            Order Exposure
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('inventory')}
          style={[styles.tabBtn, activeTab === 'inventory' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'inventory' && styles.tabTextActive]}>
            Inventory Stock
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('supplier')}
          style={[styles.tabBtn, activeTab === 'supplier' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'supplier' && styles.tabTextActive]}>
            Supplier Health
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <RiskEngineCard />
        <RiskSourceNote status={status} source={source} onRetry={refresh} />

        {/* Risk Distribution Donut Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Exposure Distribution</Text>
          <Text style={styles.sectionSubtitle}>
            {isLive
              ? `Scored across ${scoredOrders.length} affected customer orders`
              : 'Sample totals, shown until live scores are available'}
          </Text>

          <View style={{ marginTop: 12 }}>
            <RiskDonutChart
              critical={riskData.criticalCount}
              high={riskData.highCount}
              medium={riskData.mediumCount}
              low={riskData.lowCount}
              overallScore={riskData.overallScore}
            />
          </View>
        </View>

        {activeTab === 'order' && (
          <View style={styles.section}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>High Risk Client Orders</Text>
              <Pressable
                onPress={() => router.push('/(protected)/operations-analyst/orders')}
                hitSlop={8}
              >
                <Text style={styles.seeAllText}>See all ({operationsService.getOrders().length}) →</Text>
              </Pressable>
            </View>

            <View style={{ marginTop: 10 }}>
              {highRiskOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onPress={() => router.push('/(protected)/operations-analyst/orders')}
                />
              ))}
            </View>
          </View>
        )}

        {activeTab === 'inventory' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Warehouse Stock</Text>
            {(live.inventory ?? []).map((row) => {
              const severity: SeverityLevel = row.available <= 0 ? 'Critical' : row.available < row.onHand * 0.25 ? 'High' : 'Low';
              return (
                <View key={`${row.warehouseCode}-${row.sku}`} style={styles.inventoryCard}>
                  <View style={styles.invRow}>
                    <View style={[styles.invIcon, { backgroundColor: severity === 'Low' ? '#DCFCE7' : '#FEE2E2' }]}>
                      <Warehouse size={18} color={severity === 'Low' ? '#16A34A' : '#DC2626'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invTitle}>{row.warehouse} ({row.warehouseCode})</Text>
                      <Text style={styles.invSub}>{row.product}</Text>
                    </View>
                    <SeverityBadge severity={severity} size="sm" />
                  </View>
                  <Text style={styles.invDesc}>
                    {row.available.toLocaleString()} free of {row.onHand.toLocaleString()} on hand. {row.reserved.toLocaleString()} reserved, {row.safety.toLocaleString()} safety stock.
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === 'supplier' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier Reliability & Risk</Text>
            {(live.suppliers ?? []).map((supplier) => {
              const late = supplier.late_rate ?? 0;
              const severity: SeverityLevel = late >= 0.3 ? 'High' : late >= 0.15 ? 'Medium' : 'Low';
              return (
                <View key={supplier.code} style={styles.inventoryCard}>
                  <View style={styles.invRow}>
                    <View style={[styles.invIcon, { backgroundColor: severity === 'Low' ? '#DCFCE7' : '#FFEDD5' }]}>
                      <Building size={18} color={severity === 'Low' ? '#16A34A' : '#EA580C'} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.invTitle}>{supplier.name} ({supplier.code})</Text>
                      <Text style={styles.invSub}>{supplier.country}</Text>
                    </View>
                    <SeverityBadge severity={severity} size="sm" />
                  </View>
                  <Text style={styles.invDesc}>
                    {supplier.on_time_rate === null ? 'No delivery history yet.' : `${Math.round(supplier.on_time_rate * 100)}% on time across ${supplier.outcomes} recorded deliveries.`}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <OperationsBottomNav activeTab="more" />
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
    paddingBottom: 110,
  },
  section: {
    marginBottom: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  inventoryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginTop: 10,
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  invIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  invTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  invSub: {
    fontSize: 11,
    color: '#64748B',
  },
  invDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 17,
  },
});
