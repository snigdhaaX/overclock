import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowUpDown,
  Building,
  CheckCircle2,
  Filter,
  Search,
  ShieldAlert,
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
import ManagerBottomNav from '../../../../features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '../../../../features/supply-chain-manager/components/ManagerHeader';
import { SupplierCard } from '../../../../features/supply-chain-manager/components/SupplierCard';
import managerService from '../../../../features/supply-chain-manager/services/managerService';
import { SupplierProfile } from '../../../../features/supply-chain-manager/types';

export default function SupplierOverviewScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'risk' | 'sla' | 'spend'>('risk');
  const [refreshing, setRefreshing] = useState(false);

  const statusOptions = ['All', 'Active', 'At Risk', 'Critical', 'Under Review'];

  const rawSuppliers = managerService.getSuppliers({
    search,
    status: selectedStatus,
  });

  const sortedSuppliers = [...rawSuppliers].sort((a, b) => {
    if (sortBy === 'risk') return b.riskScore - a.riskScore;
    if (sortBy === 'sla') return b.deliveryPerformance - a.deliveryPerformance;
    if (sortBy === 'spend') return b.spendYTD.localeCompare(a.spendYTD);
    return 0;
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const totalCount = sortedSuppliers.length;
  const criticalCount = sortedSuppliers.filter((s) => s.status === 'Critical' || s.status === 'At Risk').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Supplier Overview"
        subtitle="Tier-1 & Tier-2 partner reliability, risk scores & SLA performance"
      />

      <View style={styles.container}>
        {/* KPI Summary Banner */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalCount}</Text>
            <Text style={styles.kpiLabel}>Total Monitored</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiCardAlert]}>
            <Text style={[styles.kpiValue, { color: '#DC2626' }]}>{criticalCount}</Text>
            <Text style={styles.kpiLabel}>At Risk / Critical</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#16A34A' }]}>92.4%</Text>
            <Text style={styles.kpiLabel}>Average SLA</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search supplier, category, city..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color="#64748B" />
            </Pressable>
          )}
        </View>

        {/* Status Filter Chips */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={statusOptions}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterChipList}
            renderItem={({ item }) => {
              const active = selectedStatus === item;
              return (
                <Pressable
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedStatus(item)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Sorting Options */}
        <View style={styles.sortBar}>
          <View style={styles.sortLabelGroup}>
            <ArrowUpDown size={14} color="#64748B" style={{ marginRight: 4 }} />
            <Text style={styles.sortLabel}>Sort by:</Text>
          </View>
          <View style={styles.sortButtons}>
            <Pressable
              style={[styles.sortBtn, sortBy === 'risk' && styles.sortBtnActive]}
              onPress={() => setSortBy('risk')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'risk' && styles.sortBtnTextActive]}>
                Risk Score
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortBtn, sortBy === 'sla' && styles.sortBtnActive]}
              onPress={() => setSortBy('sla')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'sla' && styles.sortBtnTextActive]}>
                Delivery SLA
              </Text>
            </Pressable>
            <Pressable
              style={[styles.sortBtn, sortBy === 'spend' && styles.sortBtnActive]}
              onPress={() => setSortBy('spend')}
            >
              <Text style={[styles.sortBtnText, sortBy === 'spend' && styles.sortBtnTextActive]}>
                Annual Spend
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Supplier List */}
        <FlatList
          data={sortedSuppliers}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <SupplierCard
              supplier={item}
              onPress={() =>
                router.push(`/(protected)/supply-chain-manager/suppliers/${item.id}` as any)
              }
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ShieldAlert size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Suppliers Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or status filter to see vendors.
              </Text>
            </View>
          }
        />
      </View>

      <ManagerBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
  },
  kpiCardAlert: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#17243B',
    padding: 0,
  },
  filtersWrapper: {
    marginBottom: 8,
  },
  filterChipList: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 8,
  },
  sortLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sortLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 4,
  },
  sortBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E2E8F0',
  },
  sortBtnActive: {
    backgroundColor: '#10234D',
  },
  sortBtnText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  sortBtnTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17243B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
