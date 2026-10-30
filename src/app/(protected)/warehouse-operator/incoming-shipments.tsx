import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Layers,
  MapPin,
  Package,
  Search,
  Truck,
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
import { InboundShipmentItem } from '../../../features/warehouse-operator/types';

export default function IncomingShipmentsScreen() {
  const router = useRouter();
  const [shipments, setShipments] = useState<InboundShipmentItem[]>(
    warehouseService.getIncomingShipments()
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const update = () => {
      setShipments(warehouseService.getIncomingShipments());
    };
    return warehouseService.subscribe(update);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setShipments(warehouseService.getIncomingShipments());
    setTimeout(() => setRefreshing(false), 500);
  };

  const filtered = shipments.filter((s) => {
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      const matchId = s.id.toLowerCase().includes(q);
      const matchSup = s.supplier.toLowerCase().includes(q);
      const matchCar = s.carrier.toLowerCase().includes(q);
      const matchSku = s.productSku.toLowerCase().includes(q);
      return matchId || matchSup || matchCar || matchSku;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return { label: 'RECEIVED', bg: '#DCFCE7', text: '#16A36A' };
      case 'in_progress':
        return { label: 'IN PROGRESS', bg: '#EFF6FF', text: '#2563EB' };
      case 'delayed':
        return { label: 'BERTH DELAY', bg: '#FEE2E2', text: '#DC4545' };
      case 'pending':
      default:
        return { label: 'DOCK SCHEDULED', bg: '#FEF3C7', text: '#D97706' };
    }
  };

  const pendingCount = shipments.filter((s) => s.status === 'pending').length;
  const receivedCount = shipments.filter((s) => s.status === 'received').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Incoming Shipments"
        subtitle="Receiving Bay 02 · Inbound Consignments & Manifests"
      />

      <View style={styles.container}>
        {/* KPI Strip */}
        <View style={styles.kpiStrip}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiVal}>{shipments.length}</Text>
            <Text style={styles.kpiLabel}>Total Inbound</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#D97706' }]}>{pendingCount}</Text>
            <Text style={styles.kpiLabel}>Pending Arrival</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiVal, { color: '#16A36A' }]}>{receivedCount}</Text>
            <Text style={styles.kpiLabel}>Dock Checked-In</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Shipment ID, Supplier, Carrier, SKU..."
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

        {/* Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'in_progress', 'received'].map((st) => (
            <Pressable
              key={st}
              style={[styles.filterChip, selectedStatus === st && styles.filterChipActive]}
              onPress={() => setSelectedStatus(st)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedStatus === st && styles.filterChipTextActive,
                ]}
              >
                {st === 'all'
                  ? 'All Consignments'
                  : st === 'pending'
                  ? `Scheduled (${pendingCount})`
                  : st === 'in_progress'
                  ? 'Dock Active'
                  : `Received (${receivedCount})`}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Consignments List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A36A']} />}
        >
          {filtered.map((shp) => {
            const badge = getStatusBadge(shp.status);
            return (
              <View key={shp.id} style={styles.shipmentCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.idGroup}>
                    <Text style={styles.shipmentId}>{shp.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.priorityBadge,
                      shp.priority === 'Critical'
                        ? styles.priorityCritical
                        : styles.priorityHigh,
                    ]}
                  >
                    <Text
                      style={[
                        styles.priorityBadgeText,
                        shp.priority === 'Critical'
                          ? styles.priorityCriticalText
                          : styles.priorityHighText,
                      ]}
                    >
                      {shp.priority.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.productTitle}>{shp.productName}</Text>
                <Text style={styles.skuText}>SKU: {shp.productSku} · Ref: {shp.purchaseRef}</Text>

                <View style={styles.carrierBox}>
                  <View style={styles.carrierRow}>
                    <Truck size={13} color="#2563EB" />
                    <Text style={styles.carrierText}>{shp.carrier}</Text>
                  </View>
                  <Text style={styles.supplierText}>{shp.supplier}</Text>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>{shp.expectedQuantity}</Text>
                    <Text style={styles.metricLabel}>Expected</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={[styles.metricVal, { color: '#16A36A' }]}>
                      {shp.actualReceivedQuantity}
                    </Text>
                    <Text style={styles.metricLabel}>Received</Text>
                  </View>
                  <View style={styles.metricItem}>
                    <Text style={styles.metricVal}>{shp.expectedArrivalDate}</Text>
                    <Text style={styles.metricLabel}>Dock ETA</Text>
                  </View>
                </View>

                {/* Footer Action Strip */}
                <View style={styles.cardFooter}>
                  <View style={styles.destinationTag}>
                    <MapPin size={12} color="#16A36A" />
                    <Text style={styles.destinationText}>{shp.warehouseDestination} · Bay 02</Text>
                  </View>

                  {shp.status !== 'received' ? (
                    <Pressable
                      style={styles.receiveActionBtn}
                      onPress={() => router.push('/(protected)/warehouse-operator/receiving' as any)}
                    >
                      <ArrowDownToLine size={14} color="#FFFFFF" />
                      <Text style={styles.receiveActionBtnText}>Dock Check-In</Text>
                    </Pressable>
                  ) : (
                    <View style={styles.checkedInBadge}>
                      <CheckCircle2 size={14} color="#16A36A" />
                      <Text style={styles.checkedInBadgeText}>Goods Receipt Signed</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}

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
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
  },
  kpiVal: {
    fontSize: 18,
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
  shipmentCard: {
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
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shipmentId: {
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
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityCritical: {
    backgroundColor: '#FEE2E2',
  },
  priorityHigh: {
    backgroundColor: '#FEF3C7',
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  priorityCriticalText: {
    color: '#DC4545',
  },
  priorityHighText: {
    color: '#D97706',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  skuText: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  carrierBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  carrierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  carrierText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  supplierText: {
    fontSize: 11,
    color: '#64748B',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  destinationTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  destinationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16A36A',
  },
  receiveActionBtn: {
    backgroundColor: '#16A36A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  receiveActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  checkedInBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
});
