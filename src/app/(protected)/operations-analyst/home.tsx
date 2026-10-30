import { useRouter } from 'expo-router';
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  FilePlus2,
  Layers,
  Package,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DisruptionCard from '../../../features/operations-analyst/components/DisruptionCard';
import MetricCard from '../../../features/operations-analyst/components/MetricCard';
import OperationsBottomNav from '../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../features/operations-analyst/components/OperationsHeader';
import operationsService from '../../../features/operations-analyst/services/operationsService';

export default function OperationsAnalystHomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const disruptions = operationsService.getDisruptions();
  const criticalDisruptions = disruptions.filter((d) => d.severity === 'Critical' || d.severity === 'High');

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader showGreeting userName="Anishwath" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
      >
        {/* KPI 2x2 Grid */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <MetricCard
              label="Active Disruptions"
              value="14"
              change="+2 today"
              isPositiveChange={false}
              icon={<AlertOctagon size={20} color="#DC2626" />}
              iconBgColor="#FEE2E2"
              onPress={() => router.push('/(protected)/operations-analyst/disruptions')}
            />
            <MetricCard
              label="Affected Orders"
              value="23"
              change="8 at risk"
              isPositiveChange={false}
              icon={<Package size={20} color="#EA580C" />}
              iconBgColor="#FFEDD5"
              onPress={() => router.push('/(protected)/operations-analyst/orders')}
            />
          </View>
          <View style={styles.kpiRow}>
            <MetricCard
              label="On-time Delivery"
              value="92%"
              change="Target: 95%"
              isPositiveChange={true}
              icon={<TrendingUp size={20} color="#16A34A" />}
              iconBgColor="#DCFCE7"
              onPress={() => router.push('/(protected)/operations-analyst/risk')}
            />
            <MetricCard
              label="Recovery Plans"
              value="6 Active"
              change="96% Feasible"
              isPositiveChange={true}
              icon={<Sparkles size={20} color="#2563EB" />}
              iconBgColor="#EFF6FF"
              onPress={() => router.push('/(protected)/operations-analyst/recovery/recommendations')}
            />
          </View>
        </View>

        {/* Quick Action Shortcuts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Operational Shortcuts</Text>
          <View style={styles.shortcutsRow}>
            <Pressable
              onPress={() => router.push('/(protected)/operations-analyst/disruptions/SHP-101')}
              style={({ pressed }) => [styles.shortcutBtn, pressed && styles.btnPressed]}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Search size={18} color="#2563EB" />
              </View>
              <Text style={styles.shortcutLabel}>Investigate{'\n'}Disruption</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(protected)/operations-analyst/disruptions/SHP-101/impact')}
              style={({ pressed }) => [styles.shortcutBtn, pressed && styles.btnPressed]}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#F5F3FF' }]}>
                <Layers size={18} color="#7C3AED" />
              </View>
              <Text style={styles.shortcutLabel}>Analyse{'\n'}Impact</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(protected)/operations-analyst/recovery/create')}
              style={({ pressed }) => [styles.shortcutBtn, pressed && styles.btnPressed]}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#ECFDF5' }]}>
                <FilePlus2 size={18} color="#059669" />
              </View>
              <Text style={styles.shortcutLabel}>Create{'\n'}Recovery Plan</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/(protected)/operations-analyst/recovery/execution')}
              style={({ pressed }) => [styles.shortcutBtn, pressed && styles.btnPressed]}
            >
              <View style={[styles.shortcutIconCircle, { backgroundColor: '#FFFBEB' }]}>
                <Zap size={18} color="#D97706" />
              </View>
              <Text style={styles.shortcutLabel}>Execution{'\n'}Tracking</Text>
            </Pressable>
          </View>
        </View>

        {/* Priority Disruption Spotlight Banner */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>High Priority Incident</Text>
            <Pressable
              onPress={() => router.push('/(protected)/operations-analyst/disruptions/SHP-101')}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>Deep Dive →</Text>
            </Pressable>
          </View>

          {criticalDisruptions.length > 0 && (
            <DisruptionCard
              disruption={criticalDisruptions[0]}
              onPress={() => router.push(`/(protected)/operations-analyst/disruptions/${criticalDisruptions[0].id}`)}
            />
          )}
        </View>

        {/* Recent Supply Chain Alerts */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Recent Incident Alerts</Text>
            <Pressable
              onPress={() => router.push('/(protected)/operations-analyst/disruptions')}
              hitSlop={8}
            >
              <Text style={styles.seeAllText}>View All ({disruptions.length})</Text>
            </Pressable>
          </View>

          {disruptions.slice(1, 4).map((item) => (
            <DisruptionCard
              key={item.id}
              disruption={item}
              onPress={() => router.push(`/(protected)/operations-analyst/disruptions/${item.id}`)}
            />
          ))}
        </View>
      </ScrollView>

      {/* Fixed Bottom Navigation */}
      <OperationsBottomNav activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110, // Avoid overlapping fixed bottom nav
  },
  kpiGrid: {
    gap: 12,
    marginBottom: 20,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
    letterSpacing: -0.2,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
  },
  shortcutsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  shortcutBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  shortcutIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  shortcutLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
    textAlign: 'center',
    lineHeight: 14,
  },
  btnPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
});
