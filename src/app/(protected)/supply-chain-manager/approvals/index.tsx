import { useRouter } from 'expo-router';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Filter,
  History,
  Layers,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
  XCircle,
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
import ApprovalCard from '@/features/supply-chain-manager/components/ApprovalCard';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { RecoveryPlan } from '@/features/supply-chain-manager/types';
import { useSyncVersion } from '@/services/backendSync';

export default function ApprovalCentreScreen() {
  const router = useRouter();
  useSyncVersion();
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Pending' | 'High Priority' | 'Approved' | 'Completed'>('Pending');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const filterOptions: Array<'All' | 'Pending' | 'High Priority' | 'Approved' | 'Completed'> = [
    'Pending',
    'High Priority',
    'All',
    'Approved',
    'Completed',
  ];

  const allPlans = managerService.getRecoveryPlans();

  const filteredPlans = allPlans.filter((plan) => {
    // Search filter
    if (search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      const match =
        plan.id.toLowerCase().includes(q) ||
        plan.planName.toLowerCase().includes(q) ||
        plan.relatedDisruptionId.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Status filter
    if (selectedFilter === 'Pending') {
      return plan.status === 'Pending Approval' || plan.status === 'Draft';
    }
    if (selectedFilter === 'High Priority') {
      return plan.priority === 'Critical' || plan.priority === 'High';
    }
    if (selectedFilter === 'Approved') {
      return plan.status === 'Approved';
    }
    if (selectedFilter === 'Completed') {
      return plan.status === 'Completed';
    }
    return true;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const pendingCount = allPlans.filter(
    (p) => p.status === 'Pending Approval' || p.status === 'Draft'
  ).length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Approval Centre"
        subtitle="Executive sign-off, SLA governance & expenditure authorization"
      />

      {/* Top Governance Status Banner */}
      <View style={styles.governanceBanner}>
        <View style={styles.govLeft}>
          <ShieldCheck size={18} color="#0D9488" style={{ marginRight: 8, flexShrink: 0 }} />
          <View>
            <Text style={styles.govTitle}>Zero-Trust Governance Enforced</Text>
            <Text style={styles.govSubtitle}>
              Operations Analysts cannot approve their own plans. Manager authorization commits to audit ledger.
            </Text>
          </View>
        </View>
      </View>

      {/* Counter & Search Toolbar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plan ID, name, disruption..."
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

        {/* Filter Pills */}
        <View style={styles.filterRow}>
          {filterOptions.map((opt) => (
            <Pressable
              key={opt}
              style={[
                styles.filterPill,
                selectedFilter === opt && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(opt)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === opt && styles.filterPillTextActive,
                ]}
              >
                {opt} {opt === 'Pending' && `(${pendingCount})`}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Recovery Plans List */}
      <FlatList
        data={filteredPlans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        renderItem={({ item }) => (
          <ApprovalCard
            plan={item}
            onReview={() =>
              router.push(`/(protected)/supply-chain-manager/approvals/${item.id}` as any)
            }
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <CheckCircle2 size={36} color="#16A36A" style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No pending approvals found</Text>
            <Text style={styles.emptyDesc}>
              All submitted recovery plans have been processed or authorized.
            </Text>
          </View>
        }
      />

      <ManagerBottomNav activeTab="approvals" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  governanceBanner: {
    backgroundColor: '#F0FDFA',
    borderBottomWidth: 1,
    borderBottomColor: '#CCFBF1',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  govLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  govTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  govSubtitle: {
    fontSize: 11,
    color: '#475569',
    marginTop: 1,
    lineHeight: 15,
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
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
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#10234D',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
});
