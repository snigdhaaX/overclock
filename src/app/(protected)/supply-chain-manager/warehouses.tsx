import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowUpDown,
  Building,
  CheckCircle2,
  Filter,
  Layers,
  MapPin,
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
import ManagerBottomNav from '../../../features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '../../../features/supply-chain-manager/components/ManagerHeader';
import { WarehouseCard } from '../../../features/supply-chain-manager/components/WarehouseCard';
import managerService from '../../../features/supply-chain-manager/services/managerService';
import { WarehouseProfile } from '../../../features/supply-chain-manager/types';

export default function WarehouseOverviewScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseProfile | null>(null);

  const filterOptions = [
    'All',
    'Healthy',
    'At Risk',
    'Capacity Warning',
    'Inventory Shortage',
  ];

  const rawWarehouses = managerService.getWarehouses({
    search,
    filter: selectedFilter,
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const totalWarehouses = rawWarehouses.length;
  const avgUtilization = Math.round(
    rawWarehouses.reduce((acc, curr) => acc + curr.capacityUtilisation, 0) / (totalWarehouses || 1)
  );
  const totalInbound = rawWarehouses.reduce((acc, curr) => acc + curr.incomingShipmentsCount, 0);
  const totalOutbound = rawWarehouses.reduce((acc, curr) => acc + curr.outgoingOrdersCount, 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Warehouse Facilities"
        subtitle="Regional distribution centres, capacity thresholds & safety stock buffer"
      />

      <View style={styles.container}>
        {/* KPI Summary Banner */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalWarehouses}</Text>
            <Text style={styles.kpiLabel}>Logistics Hubs</Text>
          </View>
          <View
            style={[
              styles.kpiCard,
              avgUtilization > 85 ? styles.kpiCardAlert : undefined,
            ]}
          >
            <Text
              style={[
                styles.kpiValue,
                { color: avgUtilization > 85 ? '#DC2626' : '#10234D' },
              ]}
            >
              {avgUtilization}%
            </Text>
            <Text style={styles.kpiLabel}>Avg Capacity</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#2563EB' }]}>{totalInbound}</Text>
            <Text style={styles.kpiLabel}>Inbound Convoys</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiValue, { color: '#0D9488' }]}>{totalOutbound}</Text>
            <Text style={styles.kpiLabel}>Outbound Orders</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search facility name, ID, city, manager..."
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

        {/* Health Filter Chips */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterChipList}
            renderItem={({ item }) => {
              const active = selectedFilter === item;
              return (
                <Pressable
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(item)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Warehouse List */}
        <FlatList
          data={rawWarehouses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <WarehouseCard warehouse={item} onPress={() => setSelectedWarehouse(item)} />
          )}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Warehouse size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Facilities Found</Text>
              <Text style={styles.emptySubtitle}>
                Try adjusting your search query or inventory health filter.
              </Text>
            </View>
          }
        />
      </View>

      {/* Warehouse Detail Modal Sheet */}
      <Modal
        visible={selectedWarehouse !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedWarehouse(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.backdropPress} onPress={() => setSelectedWarehouse(null)} />
          {selectedWarehouse && (
            <View style={styles.modalContent}>
              <View style={styles.modalDragHandle} />

              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalWarehouseId}>{selectedWarehouse.id}</Text>
                  <Text style={styles.modalWarehouseName}>{selectedWarehouse.name}</Text>
                </View>
                <Pressable
                  style={styles.modalCloseBtn}
                  onPress={() => setSelectedWarehouse(null)}
                >
                  <X size={18} color="#64748B" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalBody}>
                <View style={styles.infoRow}>
                  <MapPin size={14} color="#64748B" style={{ marginTop: 2 }} />
                  <Text style={styles.modalLocationText}>{selectedWarehouse.location}</Text>
                </View>

                {/* Storage & Safety Stock Breakdown */}
                <View style={styles.metricGrid}>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricTileLabel}>Gross Floor Storage</Text>
                    <Text style={styles.metricTileValue}>{selectedWarehouse.totalStorageSqFt}</Text>
                  </View>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricTileLabel}>Capacity Utilisation</Text>
                    <Text
                      style={[
                        styles.metricTileValue,
                        {
                          color:
                            selectedWarehouse.capacityUtilisation > 85 ? '#DC2626' : '#10234D',
                        },
                      ]}
                    >
                      {selectedWarehouse.capacityUtilisation}%
                    </Text>
                  </View>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricTileLabel}>Buffer Safety Stock</Text>
                    <Text
                      style={[
                        styles.metricTileValue,
                        {
                          color:
                            selectedWarehouse.safetyStockLevel < 20 ? '#DC2626' : '#16A34A',
                        },
                      ]}
                    >
                      {selectedWarehouse.safetyStockLevel}%
                    </Text>
                  </View>
                  <View style={styles.metricTile}>
                    <Text style={styles.metricTileLabel}>Facility Lead</Text>
                    <Text style={styles.metricTileValue}>{selectedWarehouse.managerInCharge}</Text>
                  </View>
                </View>

                {/* Active Alerts */}
                {selectedWarehouse.activeWarnings.length > 0 && (
                  <View style={styles.modalAlertBox}>
                    <View style={styles.modalAlertHeader}>
                      <AlertTriangle size={16} color="#DC2626" />
                      <Text style={styles.modalAlertTitle}>Facility Operational Alerts</Text>
                    </View>
                    {selectedWarehouse.activeWarnings.map((warn, i) => (
                      <Text key={i} style={styles.modalAlertText}>
                        • {warn}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Pressable
                    style={styles.modalPrimaryBtn}
                    onPress={() => {
                      setSelectedWarehouse(null);
                      router.push(`/(protected)/supply-chain-manager/network` as any);
                    }}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Locate Facility on Real Map</Text>
                  </Pressable>
                </View>
              </ScrollView>
            </View>
          )}
        </View>
      </Modal>

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
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
  },
  kpiCardAlert: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.5,
  },
  kpiLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
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
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  backdropPress: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '75%',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modalWarehouseId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  modalWarehouseName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  modalLocationText: {
    fontSize: 13,
    color: '#475569',
    flex: 1,
    lineHeight: 18,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  metricTile: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricTileLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  metricTileValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  modalAlertBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  modalAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  modalAlertTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalAlertText: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 16,
    marginBottom: 3,
  },
  modalActions: {
    marginTop: 10,
  },
  modalPrimaryBtn: {
    backgroundColor: '#10234D',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
