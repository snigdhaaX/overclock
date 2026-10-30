import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Hash,
  MapPin,
  Package,
  Search,
  ShieldCheck,
  Truck,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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
import { ProcurementBottomNav } from '../../../features/procurement-approver/components/ProcurementBottomNav';
import { ProcurementHeader } from '../../../features/procurement-approver/components/ProcurementHeader';
import { PurchaseOrderCard } from '../../../features/procurement-approver/components/PurchaseOrderCard';
import { procurementService } from '../../../features/procurement-approver/services/procurementService';
import { POStatus, PurchaseOrder } from '../../../features/procurement-approver/types';

export default function PurchaseOrdersScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<POStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setDataVersion] = useState(0);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const orders = procurementService.getPurchaseOrders(activeTab, searchQuery);
  const selectedOrder = selectedOrderId
    ? procurementService.getPurchaseOrderById(selectedOrderId) || null
    : null;

  const handleOpenDetail = (order: PurchaseOrder) => {
    setSelectedOrderId(order.id);
  };

  const handleInitiateCancel = () => {
    setCancelReason('');
    setActionError(null);
    setCancelModalVisible(true);
  };

  const handleConfirmCancel = () => {
    if (!selectedOrder) return;
    if (!cancelReason.trim()) {
      setActionError('Cancellation reason is mandatory for audit accountability.');
      return;
    }

    const res = procurementService.cancelPurchaseOrder(
      selectedOrder.id,
      'Priya Sharma (Procurement Approver)',
      cancelReason.trim()
    );

    if (res.success && res.po) {
      setCancelModalVisible(false);
      Alert.alert(
        'Purchase Order Cancelled',
        `Purchase Order ${selectedOrder.id} has been formally cancelled and audit logged.`
      );
    } else {
      setActionError(res.error || 'Failed to cancel purchase order.');
    }
  };

  const tabs: { key: POStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All Orders' },
    { key: 'open', label: 'Open' },
    { key: 'in_production', label: 'Production' },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Purchase Orders"
        subtitle="Active & Historical Procurement Orders"
        showBack
        onBack={() => router.back()}
      />

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search PO ID, supplier, product or SKU..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FileText size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Purchase Orders Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try adjusting your search query or switching tabs.'
                : 'No purchase orders currently match this status filter.'}
            </Text>
          </View>
        ) : (
          orders.map((po) => (
            <PurchaseOrderCard
              key={po.id}
              order={po}
              onPress={() => handleOpenDetail(po)}
            />
          ))
        )}
      </ScrollView>

      {/* Order Detail Modal */}
      <Modal
        visible={!!selectedOrder}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedOrderId(null)}
      >
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <View style={styles.modalIdRow}>
                  <Text style={styles.modalPoId}>{selectedOrder?.id}</Text>
                  <View
                    style={[
                      styles.modalStatusBadge,
                      selectedOrder?.status === 'completed'
                        ? styles.bgGreen
                        : selectedOrder?.status === 'cancelled'
                        ? styles.bgRed
                        : styles.bgBlue,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        selectedOrder?.status === 'completed'
                          ? styles.textGreen
                          : selectedOrder?.status === 'cancelled'
                          ? styles.textRed
                          : styles.textBlue,
                      ]}
                    >
                      {selectedOrder?.status?.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.modalHeaderSub}>
                  {selectedOrder?.productName}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedOrderId(null)}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            {/* Modal Scroll Content */}
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalBodyContent}
            >
              {/* Supplier & Destination Card */}
              <View style={styles.detailCard}>
                <Text style={styles.cardHeader}>SUPPLIER & DISPATCH PROFILE</Text>

                <View style={styles.infoRow}>
                  <Building size={16} color="#8B5CF6" />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Supplier</Text>
                    <Text style={styles.infoValue}>{selectedOrder?.supplierName}</Text>
                    <Text style={styles.infoMeta}>ID: {selectedOrder?.supplierId}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <MapPin size={16} color="#8B5CF6" />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Destination Facility</Text>
                    <Text style={styles.infoValue}>{selectedOrder?.destinationWarehouse}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <Truck size={16} color="#8B5CF6" />
                  <View style={styles.infoCol}>
                    <Text style={styles.infoLabel}>Logistics & Incoterms</Text>
                    <Text style={styles.infoValue}>{selectedOrder?.shippingTerms}</Text>
                    <Text style={styles.infoMeta}>Payment: {selectedOrder?.paymentTerms}</Text>
                  </View>
                </View>
              </View>

              {/* Line Items Card */}
              <View style={styles.detailCard}>
                <Text style={styles.cardHeader}>ORDER LINE ITEMS</Text>

                {selectedOrder?.items.map((item, idx) => (
                  <View key={idx} style={styles.itemRow}>
                    <View style={styles.itemDescCol}>
                      <Text style={styles.itemSku}>{item.sku}</Text>
                      <Text style={styles.itemDesc}>{item.description}</Text>
                    </View>
                    <View style={styles.itemQtyCol}>
                      <Text style={styles.itemQty}>{item.quantity.toLocaleString()} u</Text>
                      <Text style={styles.itemPrice}>
                        @ ₹{item.unitPrice.toLocaleString('en-IN')}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>
                      ₹{item.total.toLocaleString('en-IN')}
                    </Text>
                  </View>
                ))}

                <View style={styles.financialDivider} />

                <View style={styles.financialRow}>
                  <Text style={styles.financialLabel}>Total Order Value</Text>
                  <Text style={styles.financialValue}>
                    {selectedOrder?.currency}
                    {selectedOrder?.totalAmount.toLocaleString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* Delivery Schedule & Authorization */}
              <View style={styles.detailCard}>
                <Text style={styles.cardHeader}>AUTHORIZATION & SCHEDULE</Text>

                <View style={styles.metaGrid}>
                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Created Date</Text>
                    <Text style={styles.metaValue}>{selectedOrder?.createdAt}</Text>
                  </View>

                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Required Delivery</Text>
                    <Text style={styles.metaValue}>{selectedOrder?.expectedDeliveryDate}</Text>
                  </View>

                  <View style={styles.metaCell}>
                    <Text style={styles.metaLabel}>Approver</Text>
                    <Text style={styles.metaValue}>{selectedOrder?.approvedBy}</Text>
                  </View>

                  {selectedOrder?.requestId && (
                    <View style={styles.metaCell}>
                      <Text style={styles.metaLabel}>Originating Request</Text>
                      <Text style={[styles.metaValue, { color: '#8B5CF6' }]}>
                        {selectedOrder?.requestId}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Blockchain Proof */}
                {selectedOrder?.blockchainTxHash && (
                  <View style={styles.blockchainBox}>
                    <View style={styles.blockchainHeaderRow}>
                      <ShieldCheck size={14} color="#16A36A" />
                      <Text style={styles.blockchainTitle}>Trustchain Ledger Verification</Text>
                    </View>
                    <Text style={styles.blockchainHash}>
                      TX: {selectedOrder.blockchainTxHash}
                    </Text>
                  </View>
                )}
              </View>

              {/* Audit History Timeline */}
              <View style={styles.detailCard}>
                <Text style={styles.cardHeader}>AUDIT HISTORY</Text>
                {selectedOrder?.auditHistory.map((rec, idx) => (
                  <View key={idx} style={styles.auditRow}>
                    <View style={styles.auditDotCol}>
                      <View style={styles.auditDot} />
                      {idx < (selectedOrder?.auditHistory.length || 0) - 1 && (
                        <View style={styles.auditLine} />
                      )}
                    </View>
                    <View style={styles.auditContent}>
                      <Text style={styles.auditEventName}>{rec.event}</Text>
                      <Text style={styles.auditMeta}>
                        {rec.actor} · {rec.timestamp}
                      </Text>
                      {rec.note && <Text style={styles.auditNote}>{rec.note}</Text>}
                    </View>
                  </View>
                ))}
              </View>

              {/* Action Buttons */}
              {selectedOrder &&
                (selectedOrder.status === 'open' || selectedOrder.status === 'in_production') && (
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={handleInitiateCancel}
                  >
                    <XCircle size={16} color="#DC2626" />
                    <Text style={styles.cancelBtnText}>
                      Cancel Purchase Order (Approver Authority)
                    </Text>
                  </Pressable>
                )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Cancellation Prompt Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <Pressable
          style={styles.cancelPromptOverlay}
          onPress={() => setCancelModalVisible(false)}
        >
          <Pressable style={styles.cancelPromptBox} onPress={(e) => e.stopPropagation()}>
            <View style={styles.promptHeader}>
              <AlertTriangle size={24} color="#DC2626" />
              <Text style={styles.promptTitle}>Cancel Purchase Order</Text>
            </View>
            <Text style={styles.promptSubtitle}>
              Cancelling {selectedOrder?.id} will notify supplier {selectedOrder?.supplierName} and update the immutable ledger.
            </Text>

            {actionError && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{actionError}</Text>
              </View>
            )}

            <Text style={styles.inputLabel}>Mandatory Cancellation Reason:</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Supplier lead time breach, assembly line specification change..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            <View style={styles.promptActionRow}>
              <Pressable
                style={styles.promptSecondaryBtn}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.promptSecondaryText}>Discard</Text>
              </Pressable>

              <Pressable
                style={styles.promptPrimaryBtn}
                onPress={handleConfirmCancel}
              >
                <Text style={styles.promptPrimaryText}>Confirm Cancellation</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <ProcurementBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
    padding: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    marginTop: 50,
    backgroundColor: '#F5F7FB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalPoId: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  modalStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  modalHeaderSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  modalBody: {
    flex: 1,
  },
  modalBodyContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.6,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 2,
  },
  infoMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  itemDescCol: {
    flex: 1,
    marginRight: 8,
  },
  itemSku: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  itemDesc: {
    fontSize: 13,
    color: '#1E293B',
    fontWeight: '500',
    marginTop: 2,
  },
  itemQtyCol: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  itemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  itemPrice: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  financialDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 10,
    marginBottom: 8,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  financialLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  financialValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaCell: {
    width: '46%',
  },
  metaLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 2,
  },
  blockchainBox: {
    backgroundColor: '#F0FDF4',
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  blockchainHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  blockchainTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  blockchainHash: {
    fontSize: 10,
    color: '#166534',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  auditRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  auditDotCol: {
    alignItems: 'center',
    width: 16,
    marginRight: 10,
  },
  auditDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginTop: 4,
  },
  auditLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  auditContent: {
    flex: 1,
  },
  auditEventName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  auditMeta: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  auditNote: {
    fontSize: 11,
    color: '#475569',
    backgroundColor: '#F8FAFC',
    padding: 6,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  cancelPromptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  cancelPromptBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 420,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  promptSubtitle: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    color: '#10234D',
    minHeight: 70,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  promptActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  promptSecondaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  promptSecondaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  promptPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  promptPrimaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  bgGreen: { backgroundColor: '#DCFCE7' },
  textGreen: { color: '#15803D' },
  bgRed: { backgroundColor: '#FEE2E2' },
  textRed: { color: '#B91C1C' },
  bgBlue: { backgroundColor: '#EFF6FF' },
  textBlue: { color: '#2563EB' },
});
