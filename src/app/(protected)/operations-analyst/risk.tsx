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

export default function RiskIntelligenceScreen() {
  const router = useRouter();
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
            <Text style={styles.sectionTitle}>Warehouse Depletion Alerts</Text>
            <View style={styles.inventoryCard}>
              <View style={styles.invRow}>
                <View style={[styles.invIcon, { backgroundColor: '#FEE2E2' }]}>
                  <Warehouse size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invTitle}>Mumbai Central Hub (WH-MUM)</Text>
                  <Text style={styles.invSub}>Buffer: 14% | Microcontroller ICs</Text>
                </View>
                <SeverityBadge severity="Critical" size="sm" />
              </View>
              <Text style={styles.invDesc}>
                Stock depletion risk triggered due to 120h OceanTrans berth backlog. 8 customer orders exposed.
              </Text>
            </View>

            <View style={styles.inventoryCard}>
              <View style={styles.invRow}>
                <View style={[styles.invIcon, { backgroundColor: '#FEF3C7' }]}>
                  <Warehouse size={18} color="#D97706" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invTitle}>Frankfurt Cargo Facility</Text>
                  <Text style={styles.invSub}>Buffer: 28% | Optical Sensors</Text>
                </View>
                <SeverityBadge severity="Medium" size="sm" />
              </View>
              <Text style={styles.invDesc}>
                Customs classification document hold resolved. Clearing outbound flights.
              </Text>
            </View>
          </View>
        )}

        {activeTab === 'supplier' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier Reliability & Risk</Text>
            <View style={styles.inventoryCard}>
              <View style={styles.invRow}>
                <View style={[styles.invIcon, { backgroundColor: '#FFEDD5' }]}>
                  <Building size={18} color="#EA580C" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invTitle}>Tech Components Ltd (SUP-08)</Text>
                  <Text style={styles.invSub}>Shenzhen Semiconductor Cluster</Text>
                </View>
                <SeverityBadge severity="High" size="sm" />
              </View>
              <Text style={styles.invDesc}>
                Regional power cuts causing 8-day wafer fab backlog. Recommend dual-sourcing strategy.
              </Text>
            </View>

            <View style={styles.inventoryCard}>
              <View style={styles.invRow}>
                <View style={[styles.invIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Building size={18} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.invTitle}>TechParts Ltd (SUP-03)</Text>
                  <Text style={styles.invSub}>Singapore Distribution Node</Text>
                </View>
                <SeverityBadge severity="Low" size="sm" />
              </View>
              <Text style={styles.invDesc}>
                Manufacturing output stable. Port berth queue is the sole bottleneck.
              </Text>
            </View>
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
