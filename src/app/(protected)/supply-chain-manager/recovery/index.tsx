import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  DollarSign,
  Filter,
  Layers,
  RotateCcw,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { RecoveryPlan } from '@/features/supply-chain-manager/types';

export default function RecoveryMonitoringScreen() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<'All' | 'In Progress' | 'Approved' | 'Pending' | 'Completed'>('All');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const tabs: Array<'All' | 'In Progress' | 'Approved' | 'Pending' | 'Completed'> = [
    'All',
    'In Progress',
    'Approved',
    'Pending',
    'Completed',
  ];

  const plans = managerService.getRecoveryPlans().filter((plan) => {
    if (search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      const match =
        plan.id.toLowerCase().includes(q) ||
        plan.planName.toLowerCase().includes(q) ||
        plan.relatedDisruptionId.toLowerCase().includes(q);
      if (!match) return false;
    }

    if (selectedTab === 'In Progress') return plan.status === 'In Progress';
    if (selectedTab === 'Approved') return plan.status === 'Approved';
    if (selectedTab === 'Pending') return plan.status === 'Pending Approval' || plan.status === 'Draft';
    if (selectedTab === 'Completed') return plan.status === 'Completed';
    return true;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const getProgressPercent = (plan: RecoveryPlan) => {
    if (plan.status === 'Completed') return 100;
    if (plan.status === 'In Progress') return 65;
    if (plan.status === 'Approved') return 25;
    return 0;
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Recovery Monitoring"
        subtitle="Tracking approved strategies, multi-role dispatch & SLA recovery"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabBtn, selectedTab === tab && styles.tabBtnActive]}
            onPress={() => setSelectedTab(tab)}
          >
            <Text style={[styles.tabText, selectedTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Search Input */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plan ID, disruption, strategy..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={6}>
              <X size={16} color="#64748B" />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        renderItem={({ item }) => {
          const progress = getProgressPercent(item);
          return (
            <Pressable
              style={styles.planCard}
              onPress={() =>
                router.push(`/(protected)/supply-chain-manager/recovery/${item.id}` as any)
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.idGroup}>
                  <Text style={styles.planId}>{item.id}</Text>
                  <View style={styles.disruptionTag}>
                    <Text style={styles.disruptionTagText}>Ref: {item.relatedDisruptionId}</Text>
                  </View>
                </View>
                <StatusBadge status={item.status} size="sm" />
              </View>

              <Text style={styles.planName}>{item.planName}</Text>
              <Text style={styles.strategyText} numberOfLines={2}>
                {item.strategy}
              </Text>

              {/* Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Execution Progress</Text>
                  <Text style={styles.progressVal}>{progress}%</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: progress === 100 ? '#16A36A' : '#0D9488',
                      },
                    ]}
                  />
                </View>
              </View>

              {/* Stats Footer */}
              <View style={styles.statsFooter}>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Cost</Text>
                  <Text style={styles.statVal}>${item.estimatedCost.toLocaleString()}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>SLA Impact</Text>
                  <Text style={[styles.statVal, { color: '#16A36A' }]}>{item.deliveryImpact}</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Feasibility</Text>
                  <Text style={styles.statVal}>{item.feasibilityScore}%</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Target Date</Text>
                  <Text style={styles.statVal}>{item.targetCompletionDate}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
      />

      <ManagerBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 12,
  },
  tabBtn: {
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#0D9488',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  searchBarContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  planCard: {
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
  cardHeader: {
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
  planId: {
    fontSize: 14,
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
    fontWeight: '700',
    color: '#2563EB',
  },
  planName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  strategyText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 12,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  progressVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10234D',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsFooter: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 9,
    color: '#64748B',
    marginBottom: 2,
  },
  statVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10234D',
  },
});
