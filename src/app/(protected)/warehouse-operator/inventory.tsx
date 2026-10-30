import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  Filter,
  MapPin,
  Package,
  Plus,
  QrCode,
  Search,
  ShieldAlert,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { StockStatus, WarehouseProduct } from '../../../features/warehouse-operator/types';

export default function InventoryScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<WarehouseProduct[]>(
    warehouseService.getWarehouseInventory()
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const update = () => {
      setProducts(warehouseService.getWarehouseInventory(statusFilter, search));
    };
    return warehouseService.subscribe(update);
  }, [statusFilter, search]);

  const onRefresh = () => {
    setRefreshing(true);
    setProducts(warehouseService.getWarehouseInventory(statusFilter, search));
    setTimeout(() => setRefreshing(false), 500);
  };

  const kpis = warehouseService.getWarehouseKpis();

  const filteredProducts = warehouseService.getWarehouseInventory(statusFilter, search);

  const getStatusBadge = (status: StockStatus) => {
    switch (status) {
      case 'in_stock':
        return { label: 'IN STOCK', bg: '#DCFCE7', text: '#16A36A' };
      case 'low_stock':
        return { label: 'LOW STOCK', bg: '#FEF3C7', text: '#D97706' };
      case 'quarantined':
        return { label: 'QUARANTINE', bg: '#FEE2E2', text: '#DC4545' };
      case 'out_of_stock':
        return { label: 'OUT OF STOCK', bg: '#F1F5F9', text: '#64748B' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Depot Inventory"
        subtitle="Mumbai Central Hub (WH-MUM) · Bin Location Ledger"
      />

      <View style={styles.container}>
        {/* Top Metric Strip */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{kpis.availableUnits.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Available</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiVal, { color: '#DC4545' }]}>
              {kpis.quarantinedUnits}
            </Text>
            <Text style={styles.kpiLabel}>Quarantined</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>
              {kpis.lowStockCount}
            </Text>
            <Text style={styles.kpiLabel}>Low Stock SKUs</Text>
          </View>
          <View style={styles.kpiDivider} />
          <View style={styles.kpiItem}>
            <Text style={styles.kpiVal}>{kpis.totalSkus}</Text>
            <Text style={styles.kpiLabel}>Total SKUs</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search SKU, item name, barcode, category..."
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

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['all', 'in_stock', 'low_stock', 'quarantined'] as const).map((s) => (
            <Pressable
              key={s}
              style={[styles.filterChip, statusFilter === s && styles.filterChipActive]}
              onPress={() => setStatusFilter(s)}
            >
              <Text
                style={[styles.filterChipText, statusFilter === s && styles.filterChipTextActive]}
              >
                {s === 'all'
                  ? 'All Items'
                  : s.replace('_', ' ').toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Products List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A36A']} />}
        >
          {filteredProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Boxes size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No SKUs found</Text>
              <Text style={styles.emptySub}>Try searching for a different SKU code or barcode.</Text>
            </View>
          ) : (
            filteredProducts.map((p) => {
              const badge = getStatusBadge(p.stockStatus);
              return (
                <Pressable
                  key={p.sku}
                  style={styles.productCard}
                  onPress={() => router.push(`/(protected)/warehouse-operator/product/${p.sku}` as any)}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.skuRow}>
                      <Text style={styles.skuText}>{p.sku}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                          {badge.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.barcodeText}>EAN: {p.barcode}</Text>
                  </View>

                  <Text style={styles.prodName}>{p.name}</Text>
                  <Text style={styles.categoryText}>{p.category}</Text>

                  {/* Quantities Strip */}
                  <View style={styles.qtyStrip}>
                    <View style={styles.qtyBox}>
                      <Text style={[styles.qtyVal, { color: '#16A36A' }]}>
                        {p.availableQuantity}
                      </Text>
                      <Text style={styles.qtyLabel}>Available</Text>
                    </View>
                    <View style={styles.qtyBox}>
                      <Text style={[styles.qtyVal, { color: '#2563EB' }]}>
                        {p.reservedQuantity}
                      </Text>
                      <Text style={styles.qtyLabel}>Reserved</Text>
                    </View>
                    <View style={styles.qtyBox}>
                      <Text style={[styles.qtyVal, { color: '#DC4545' }]}>
                        {p.quarantinedQuantity}
                      </Text>
                      <Text style={styles.qtyLabel}>Quarantined</Text>
                    </View>
                  </View>

                  {/* Bin Location */}
                  <View style={styles.locRow}>
                    <MapPin size={13} color="#16A36A" />
                    <Text style={styles.locText}>{p.storageLocation}</Text>
                  </View>

                  {/* Footer Action Strip */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      style={styles.quickActionLink}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push('/(protected)/warehouse-operator/stock-transfer' as any);
                      }}
                    >
                      <Text style={styles.quickActionLinkText}>Transfer</Text>
                    </Pressable>

                    <Pressable
                      style={styles.quickActionLink}
                      onPress={(e) => {
                        e.stopPropagation();
                        router.push('/(protected)/warehouse-operator/damage-report' as any);
                      }}
                    >
                      <Text style={[styles.quickActionLinkText, { color: '#DC4545' }]}>
                        Report Defect
                      </Text>
                    </Pressable>

                    <View style={styles.viewDetailRow}>
                      <Text style={styles.viewDetailText}>Details</Text>
                      <ArrowRight size={13} color="#16A36A" />
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      <WarehouseBottomNav />
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
  },
  kpiStrip: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    alignItems: 'center',
  },
  kpiItem: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  filterScroll: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    alignSelf: 'center',
  },
  filterChipActive: {
    backgroundColor: '#10234D',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skuText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  barcodeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 2,
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  qtyStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  qtyBox: {
    flex: 1,
    alignItems: 'center',
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  qtyLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  locRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  locText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A36A',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  quickActionLink: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  quickActionLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  viewDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
