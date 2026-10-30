import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  Clock,
  Filter,
  MapPin,
  Package,
  Search,
  Truck,
  User,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
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
import { OutboundShipmentItem } from '../../../features/warehouse-operator/types';

export default function OutgoingShipmentsScreen() {
  const router = useRouter();
  const [shipments, setShipments] = useState<OutboundShipmentItem[]>(
    warehouseService.getOutgoingShipments()
  );
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<OutboundShipmentItem | null>(null);
  const [showHandoffModal, setShowHandoffModal] = useState(false);

  const filtered = shipments.filter((s) => {
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      const matchId = s.id.toLowerCase().includes(q);
      const matchOrder = s.orderId.toLowerCase().includes(q);
      const matchCust = s.destinationCustomer.toLowerCase().includes(q);
      const matchSku = s.productSku.toLowerCase().includes(q);
      return matchId || matchOrder || matchCust || matchSku;
    }
    return true;
  });

  const handleDispatch = (shp: OutboundShipmentItem) => {
    setSelectedShipment(shp);
    setShowHandoffModal(true);
  };

  const confirmDispatch = () => {
    if (!selectedShipment) return;
    setShipments((prev) =>
      prev.map((s) =>
        s.id === selectedShipment.id ? { ...s, status: 'dispatched' as const } : s
      )
    );
    setShowHandoffModal(false);
    Alert.alert(
      'Carrier Handoff Verified',
      `${selectedShipment.id} (${selectedShipment.destinationCustomer}) handed over to carrier dispatch team.`
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'dispatched':
        return { label: 'DISPATCHED', bg: '#EFF6FF', text: '#2563EB' };
      case 'delivered':
        return { label: 'DELIVERED', bg: '#DCFCE7', text: '#16A36A' };
      case 'pending':
      default:
        return { label: 'READY TO DISPATCH', bg: '#FEF3C7', text: '#D97706' };
    }
  };

  const pendingCount = shipments.filter((s) => s.status === 'pending').length;
  const dispatchedCount = shipments.filter((s) => s.status === 'dispatched').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Outgoing Shipments"
        subtitle="Dock Bay 01 · Outbound Carrier Handoff & Dispatch"
      />

      <View style={styles.container}>
        {/* KPI Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryVal}>{shipments.length}</Text>
            <Text style={styles.summaryLabel}>Total Outbound</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryVal, { color: '#D97706' }]}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Staged at Bay</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={[styles.summaryVal, { color: '#2563EB' }]}>{dispatchedCount}</Text>
            <Text style={styles.summaryLabel}>In Transit</Text>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Order ID, Customer, SKU, or Carrier..."
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

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['all', 'pending', 'dispatched', 'delivered'].map((st) => (
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
                  ? 'All Shipments'
                  : st === 'pending'
                  ? `Staged (${pendingCount})`
                  : st === 'dispatched'
                  ? `Dispatched (${dispatchedCount})`
                  : 'Delivered'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Shipment Cards List */}
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Truck size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No matching shipments</Text>
              <Text style={styles.emptySub}>No outbound consignments match the selected filter.</Text>
            </View>
          ) : (
            filtered.map((shp) => {
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
                    <Text style={styles.orderRef}>Ref: {shp.orderId}</Text>
                  </View>

                  <Text style={styles.customerName}>{shp.destinationCustomer}</Text>
                  <Text style={styles.productDetail}>
                    {shp.productSku} · <Text style={{ fontWeight: '800' }}>{shp.quantity}</Text> units
                  </Text>
                  <Text style={styles.productName}>{shp.productName}</Text>

                  <View style={styles.timelineRow}>
                    <View style={styles.timeItem}>
                      <Clock size={12} color="#64748B" />
                      <Text style={styles.timeText}>Dispatch: {shp.dispatchDate}</Text>
                    </View>
                    {shp.carrier && (
                      <View style={styles.timeItem}>
                        <Truck size={12} color="#2563EB" />
                        <Text style={[styles.timeText, { color: '#2563EB', fontWeight: '700' }]}>
                          {shp.carrier}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Actions */}
                  <View style={styles.cardFooter}>
                    <Pressable
                      style={styles.taskLinkBtn}
                      onPress={() => router.push('/(protected)/warehouse-operator/tasks' as any)}
                    >
                      <Text style={styles.taskLinkText}>View Pick Task</Text>
                    </Pressable>

                    {shp.status === 'pending' ? (
                      <Pressable
                        style={styles.dispatchActionBtn}
                        onPress={() => handleDispatch(shp)}
                      >
                        <ArrowUpFromLine size={14} color="#FFFFFF" />
                        <Text style={styles.dispatchActionBtnText}>Sign Carrier Handoff</Text>
                      </Pressable>
                    ) : (
                      <View style={styles.handoffVerifiedBadge}>
                        <CheckCircle2 size={13} color="#16A36A" />
                        <Text style={styles.handoffVerifiedText}>Handoff Complete</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      </View>

      {/* Carrier Handoff Modal */}
      <Modal visible={showHandoffModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.handoffIconBox}>
              <ArrowUpFromLine size={32} color="#2563EB" />
            </View>

            <Text style={styles.modalTitle}>Confirm Carrier Dispatch</Text>
            <Text style={styles.modalSub}>
              Physical carrier driver has accepted sealed cartons and bill of lading at Bay 01.
            </Text>

            {selectedShipment && (
              <View style={styles.modalSummary}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Consignment ID</Text>
                  <Text style={styles.modalVal}>{selectedShipment.id}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Customer</Text>
                  <Text style={styles.modalVal}>{selectedShipment.destinationCustomer}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Units & SKU</Text>
                  <Text style={styles.modalVal}>
                    {selectedShipment.quantity} units ({selectedShipment.productSku})
                  </Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalKey}>Carrier</Text>
                  <Text style={[styles.modalVal, { color: '#2563EB' }]}>
                    {selectedShipment.carrier || 'Express Logistics'}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelBtn}
                onPress={() => setShowHandoffModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>

              <Pressable style={styles.modalConfirmBtn} onPress={confirmDispatch}>
                <Text style={styles.modalConfirmText}>Sign & Release Cargo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

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
  summaryGrid: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
  },
  summaryVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  summaryLabel: {
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
  orderRef: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  productDetail: {
    fontSize: 13,
    color: '#10234D',
    marginBottom: 2,
  },
  productName: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 10,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#64748B',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  taskLinkBtn: {
    paddingVertical: 6,
  },
  taskLinkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  dispatchActionBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dispatchActionBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  handoffVerifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  handoffVerifiedText: {
    fontSize: 11,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 23, 51, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
  },
  handoffIconBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalSummary: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  modalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalKey: {
    fontSize: 11,
    color: '#64748B',
  },
  modalVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
