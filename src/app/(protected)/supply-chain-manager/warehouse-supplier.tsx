import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  Filter,
  Scale,
  Search,
  ShieldAlert,
  Warehouse,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SupplierCard } from '@/features/supply-chain-manager/components/SupplierCard';
import { WarehouseCard } from '@/features/supply-chain-manager/components/WarehouseCard';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { SupplierProfile, WarehouseProfile } from '@/features/supply-chain-manager/types';

export default function WarehouseSupplierOverviewScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Warehouses' | 'Suppliers'>('Warehouses');

  // Warehouses state
  const [whSearch, setWhSearch] = useState('');
  const [whFilter, setWhFilter] = useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseProfile | null>(null);

  // Suppliers state
  const [supSearch, setSupSearch] = useState('');
  const [supFilter, setSupFilter] = useState('All');

  const [refreshing, setRefreshing] = useState(false);

  const whFilterOptions = [
    'All',
    'Healthy',
    'At Risk',
    'Capacity Warning',
    'Inventory Shortage',
  ];

  const supFilterOptions = ['All', 'Active', 'At Risk', 'Critical', 'Under Review'];

  const warehouses = managerService.getWarehouses({
    search: whSearch,
    filter: whFilter,
  });

  const suppliers = managerService.getSuppliers({
    search: supSearch,
    status: supFilter,
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  // Warehouse stats
  const totalWarehouses = warehouses.length;
  const avgUtilization = Math.round(
    warehouses.reduce((acc, curr) => acc + curr.capacityUtilisation, 0) /
      (warehouses.length || 1)
  );
  const criticalWarehouses = warehouses.filter(
    (w) => w.inventoryHealth !== 'Healthy'
  ).length;

  // Supplier stats
  const totalSuppliers = suppliers.length;
  const criticalSuppliers = suppliers.filter(
    (s) => s.status === 'Critical' || s.status === 'At Risk'
  ).length;
  const avgSla = Math.round(
    suppliers.reduce((acc, curr) => acc + curr.deliveryPerformance, 0) /
      (suppliers.length || 1)
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Network Entities"
        subtitle="Warehouses & Supplier Nodes"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* 2 Segmented Tabs */}
      <View style={styles.tabsContainer}>
        <Pressable
          style={[styles.tabButton, activeTab === 'Warehouses' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Warehouses')}
        >
          <Warehouse
            size={16}
            color={activeTab === 'Warehouses' ? '#0D9488' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'Warehouses' && styles.tabTextActive]}>
            Warehouses ({totalWarehouses})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabButton, activeTab === 'Suppliers' && styles.tabButtonActive]}
          onPress={() => setActiveTab('Suppliers')}
        >
          <Building
            size={16}
            color={activeTab === 'Suppliers' ? '#0D9488' : '#64748B'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'Suppliers' && styles.tabTextActive]}>
            Suppliers ({totalSuppliers})
          </Text>
        </Pressable>
      </View>

      {/* ========================================================= */}
      {/* TAB 1: WAREHOUSES */}
      {/* ========================================================= */}
      {activeTab === 'Warehouses' && (
        <View style={styles.tabBody}>
          {/* Summary KPIs */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Hubs</Text>
              <Text style={styles.kpiVal}>{totalWarehouses}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg Capacity</Text>
              <Text style={styles.kpiVal}>{avgUtilization}%</Text>
            </View>
            <View style={[styles.kpiCard, criticalWarehouses > 0 && { borderColor: '#FECACA' }]}>
              <Text style={styles.kpiLabel}>Inventory Alerts</Text>
              <Text style={[styles.kpiVal, criticalWarehouses > 0 && { color: '#DC2626' }]}>
                {criticalWarehouses}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search warehouses by name, city, manager..."
              placeholderTextColor="#94A3B8"
              value={whSearch}
              onChangeText={setWhSearch}
            />
            {whSearch.length > 0 && (
              <Pressable onPress={() => setWhSearch('')}>
                <X size={16} color="#64748B" />
              </Pressable>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {whFilterOptions.map((filter) => (
              <Pressable
                key={filter}
                style={[
                  styles.filterChip,
                  whFilter === filter && styles.filterChipActive,
                ]}
                onPress={() => setWhFilter(filter)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    whFilter === filter && styles.filterChipTextActive,
                  ]}
                >
                  {filter}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Warehouses List */}
          <FlatList
            data={warehouses}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
            }
            renderItem={({ item }) => (
              <WarehouseCard
                warehouse={item}
                onPress={() => setSelectedWarehouse(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Warehouses Found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search query or filters.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SUPPLIERS */}
      {/* ========================================================= */}
      {activeTab === 'Suppliers' && (
        <View style={styles.tabBody}>
          {/* Summary KPIs */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Total Vendors</Text>
              <Text style={styles.kpiVal}>{totalSuppliers}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Avg Delivery SLA</Text>
              <Text style={styles.kpiVal}>{avgSla}%</Text>
            </View>
            <View style={[styles.kpiCard, criticalSuppliers > 0 && { borderColor: '#FECACA' }]}>
              <Text style={styles.kpiLabel}>Disrupted / Risk</Text>
              <Text style={[styles.kpiVal, criticalSuppliers > 0 && { color: '#DC2626' }]}>
                {criticalSuppliers}
              </Text>
            </View>
          </View>

          {/* Search Bar */}
          <View style={styles.searchBar}>
            <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search suppliers by name, category, city..."
              placeholderTextColor="#94A3B8"
              value={supSearch}
              onChangeText={setSupSearch}
            />
            {supSearch.length > 0 && (
              <Pressable onPress={() => setSupSearch('')}>
                <X size={16} color="#64748B" />
              </Pressable>
            )}
          </View>

          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            {supFilterOptions.map((status) => (
              <Pressable
                key={status}
                style={[
                  styles.filterChip,
                  supFilter === status && styles.filterChipActive,
                ]}
                onPress={() => setSupFilter(status)}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    supFilter === status && styles.filterChipTextActive,
                  ]}
                >
                  {status}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Alternative Comparison CTA Banner */}
          <View style={styles.compareNoticeBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.compareNoticeTitle}>Disruption Sourcing Support</Text>
              <Text style={styles.compareNoticeDesc}>
                Evaluate alternative suppliers for lead-time and cost concessions.
              </Text>
            </View>
            <Pressable
              style={styles.compareNoticeBtn}
              onPress={() => router.push('/(protected)/supply-chain-manager/suppliers/compare' as any)}
            >
              <Scale size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.compareNoticeBtnText}>Compare</Text>
            </Pressable>
          </View>

          {/* Suppliers List */}
          <FlatList
            data={suppliers}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
            }
            renderItem={({ item }) => (
              <SupplierCard
                supplier={item}
                onPress={() =>
                  router.push(`/(protected)/supply-chain-manager/suppliers/${item.id}` as any)
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No Suppliers Found</Text>
                <Text style={styles.emptySubtitle}>Try adjusting your search query or filters.</Text>
              </View>
            }
          />
        </View>
      )}

      {/* Warehouse Detail Modal */}
      <Modal
        visible={!!selectedWarehouse}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setSelectedWarehouse(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedWarehouse && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={styles.modalTitle}>{selectedWarehouse.name}</Text>
                    <Text style={styles.modalSub}>{selectedWarehouse.location}</Text>
                  </View>
                  <Pressable onPress={() => setSelectedWarehouse(null)}>
                    <X size={20} color="#64748B" />
                  </Pressable>
                </View>

                <View style={styles.modalGrid}>
                  <View style={styles.modalCell}>
                    <Text style={styles.modalCellLabel}>Capacity Utilisation</Text>
                    <Text style={styles.modalCellVal}>
                      {selectedWarehouse.capacityUtilisation}%
                    </Text>
                  </View>
                  <View style={styles.modalCell}>
                    <Text style={styles.modalCellLabel}>Safety Stock Buffer</Text>
                    <Text style={styles.modalCellVal}>
                      {selectedWarehouse.safetyStockLevel}%
                    </Text>
                  </View>
                  <View style={styles.modalCell}>
                    <Text style={styles.modalCellLabel}>Inbound Convoys</Text>
                    <Text style={styles.modalCellVal}>
                      {selectedWarehouse.incomingShipmentsCount} Shipments
                    </Text>
                  </View>
                  <View style={styles.modalCell}>
                    <Text style={styles.modalCellLabel}>Facility Manager</Text>
                    <Text style={styles.modalCellVal}>
                      {selectedWarehouse.managerInCharge}
                    </Text>
                  </View>
                </View>

                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedWarehouse(null)}
                >
                  <Text style={styles.modalCloseBtnText}>Close Dossier</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0D9488',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  tabBody: {
    flex: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
    textAlign: 'center',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '900',
    color: '#10234D',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1E293B',
    padding: 0,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  compareNoticeBanner: {
    backgroundColor: '#F0FDFA',
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#CCFBF1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  compareNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
  },
  compareNoticeDesc: {
    fontSize: 10,
    color: '#115E59',
    marginTop: 1,
  },
  compareNoticeBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compareNoticeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  modalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  modalCell: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  modalCellLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  modalCellVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  modalCloseBtn: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
