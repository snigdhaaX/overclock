import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  ArrowRightLeft,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
  X,
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
import { QuantityStepper } from '../../../features/warehouse-operator/components/QuantityStepper';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { StockTransfer, TransferReason, WarehouseProduct } from '../../../features/warehouse-operator/types';

export default function StockTransferScreen() {
  const router = useRouter();
  const products = warehouseService.getWarehouseInventory();
  const [transfers, setTransfers] = useState<StockTransfer[]>(
    warehouseService.getStockTransfers()
  );

  const [fromWarehouse, setFromWarehouse] = useState('WH-MUM (Mumbai Central)');
  const [toWarehouse, setToWarehouse] = useState('WH-BLR (Bangalore Depot)');
  const [selectedProduct, setSelectedProduct] = useState<WarehouseProduct>(products[0]);
  const [transferQty, setTransferQty] = useState(20);
  const [reason, setReason] = useState<TransferReason>('Fulfil Customer Orders');
  const [requiredDate, setRequiredDate] = useState('26 Oct 2026');
  const [notes, setNotes] = useState('Urgent buffer rebalancing to protect EduTech SLA fulfillment.');
  const [createdTransfer, setCreatedTransfer] = useState<StockTransfer | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const update = () => {
      setTransfers(warehouseService.getStockTransfers());
    };
    return warehouseService.subscribe(update);
  }, []);

  const destinationOptions = [
    'WH-BLR (Bangalore Depot)',
    'WH-DEL (Delhi Northern)',
    'WH-HYD (Hyderabad Hub)',
    'WH-MAA (Chennai Port)',
  ];

  const reasons: TransferReason[] = [
    'Fulfil Customer Orders',
    'Replenishment',
    'Warehouse Balancing',
    'Operational Requirement',
  ];

  const handleCreateTransfer = () => {
    if (transferQty <= 0) {
      Alert.alert('Validation Error', 'Transfer quantity must be greater than zero.');
      return;
    }
    if (transferQty > selectedProduct.availableQuantity) {
      Alert.alert(
        'Insufficient Stock',
        `Cannot transfer ${transferQty} units. Only ${selectedProduct.availableQuantity} units available at ${fromWarehouse}.`
      );
      return;
    }

    const res = warehouseService.createStockTransfer({
      fromWarehouse,
      toWarehouse,
      productSku: selectedProduct.sku,
      productName: selectedProduct.name,
      transferQuantity: transferQty,
      transferReason: reason,
      requiredDate,
      notes: notes.trim().length > 0 ? notes : undefined,
      requestedBy: 'Rohit Verma (EMP-4029)',
    });

    if (res.success && res.transfer) {
      setCreatedTransfer(res.transfer);
      setShowSuccessModal(true);
    } else {
      Alert.alert('Error', res.error || 'Failed to submit transfer request.');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { label: 'APPROVED', bg: '#DCFCE7', text: '#16A36A' };
      case 'in_transit':
        return { label: 'IN TRANSIT', bg: '#EFF6FF', text: '#2563EB' };
      case 'completed':
        return { label: 'COMPLETED', bg: '#F1F5F9', text: '#475569' };
      case 'pending_approval':
      default:
        return { label: 'PENDING APPROVAL', bg: '#FEF3C7', text: '#D97706' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Stock Transfer"
        subtitle="Inter-Depot Rebalancing & Inventory Movement"
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Governance Policy Notice */}
        <View style={styles.policyNotice}>
          <ShieldCheck size={16} color="#0D9488" />
          <View style={styles.policyTextWrap}>
            <Text style={styles.policyTitle}>Manager Sign-Off Required</Text>
            <Text style={styles.policyDesc}>
              Inter-facility transfers are governed by dual-signoff policies. Requests are queued directly for Supply Chain Manager approval.
            </Text>
          </View>
        </View>

        {/* Transfer Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>New Transfer Initiation</Text>

          {/* Source & Destination Warehouse */}
          <View style={styles.routeBox}>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>FROM SOURCE DEPOT</Text>
              <View style={styles.depotPill}>
                <Building2 size={13} color="#16A36A" />
                <Text style={styles.depotText}>{fromWarehouse}</Text>
              </View>
            </View>

            <View style={styles.routeArrow}>
              <ArrowRightLeft size={16} color="#64748B" />
            </View>

            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>TO DESTINATION DEPOT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.destScroll}>
                {destinationOptions.map((dest) => (
                  <Pressable
                    key={dest}
                    style={[
                      styles.destChip,
                      toWarehouse === dest && styles.destChipSelected,
                    ]}
                    onPress={() => setToWarehouse(dest)}
                  >
                    <Text
                      style={[
                        styles.destChipText,
                        toWarehouse === dest && styles.destChipTextSelected,
                      ]}
                    >
                      {dest.split(' ')[0]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* Select Product */}
          <Text style={styles.fieldLabel}>Select SKU to Relocate</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skuScroll}>
            {products.map((p) => (
              <Pressable
                key={p.sku}
                style={[
                  styles.skuChip,
                  selectedProduct.sku === p.sku && styles.skuChipSelected,
                ]}
                onPress={() => {
                  setSelectedProduct(p);
                  if (transferQty > p.availableQuantity) {
                    setTransferQty(Math.min(20, p.availableQuantity));
                  }
                }}
              >
                <Text
                  style={[
                    styles.skuChipSku,
                    selectedProduct.sku === p.sku && styles.skuChipSkuSelected,
                  ]}
                >
                  {p.sku}
                </Text>
                <Text style={styles.skuChipName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.skuChipAvail}>Avail: {p.availableQuantity} units</Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Quantity Stepper */}
          <View style={styles.stepperSection}>
            <QuantityStepper
              label="Transfer Quantity"
              value={transferQty}
              onChange={setTransferQty}
              min={1}
              max={selectedProduct.availableQuantity}
              step={5}
              unit="units"
            />
            <Text style={styles.stepperSubtext}>
              Max available at source depot: {selectedProduct.availableQuantity} units
            </Text>
          </View>

          {/* Reason Selector */}
          <Text style={styles.fieldLabel}>Business Justification</Text>
          <View style={styles.reasonsList}>
            {reasons.map((r) => (
              <Pressable
                key={r}
                style={[
                  styles.reasonChip,
                  reason === r && styles.reasonChipSelected,
                ]}
                onPress={() => setReason(r)}
              >
                <View
                  style={[
                    styles.reasonRadio,
                    reason === r && styles.reasonRadioActive,
                  ]}
                >
                  {reason === r && <View style={styles.radioDot} />}
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    reason === r && styles.reasonTextSelected,
                  ]}
                >
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Delivery Date */}
          <View style={styles.dateSection}>
            <Text style={styles.fieldLabel}>Required Destination Arrival Date</Text>
            <View style={styles.dateInputRow}>
              <Calendar size={16} color="#64748B" />
              <TextInput
                style={styles.dateInput}
                value={requiredDate}
                onChangeText={setRequiredDate}
                placeholder="DD Mon YYYY"
                placeholderTextColor="#94A3B8"
              />
            </View>
          </View>

          {/* Special Notes */}
          <Text style={styles.fieldLabel}>Carrier / Handling Instructions</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add special packaging, temperature requirements, or expedite notes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={2}
            value={notes}
            onChangeText={setNotes}
          />

          {/* Submit Button */}
          <Pressable style={styles.submitBtn} onPress={handleCreateTransfer}>
            <ArrowRightLeft size={16} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Submit Transfer Request</Text>
          </Pressable>
        </View>

        {/* Existing In-Flight Transfers */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Stock Transfers ({transfers.length})</Text>
        </View>

        {transfers.map((item) => {
          const badge = getStatusBadge(item.status);
          return (
            <View key={item.id} style={styles.transferCard}>
              <View style={styles.transferHeader}>
                <View style={styles.transferIdRow}>
                  <Text style={styles.transferId}>{item.id}</Text>
                  <View style={[styles.badgePill, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.badgePillText, { color: badge.text }]}>
                      {badge.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.transferDate}>{item.requestedAt}</Text>
              </View>

              <Text style={styles.transferSku}>
                {item.productSku} · <Text style={{ fontWeight: '800' }}>{item.transferQuantity}</Text> units
              </Text>
              <Text style={styles.transferProdName}>{item.productName}</Text>

              <View style={styles.transferRouteRow}>
                <Text style={styles.routeDepotText}>{item.fromWarehouse.split(' ')[0]}</Text>
                <ArrowRight size={13} color="#64748B" />
                <Text style={[styles.routeDepotText, { color: '#0D9488' }]}>
                  {item.toWarehouse.split(' ')[0]}
                </Text>
              </View>

              <View style={styles.transferFooter}>
                <Text style={styles.reasonBadgeText}>{item.transferReason}</Text>
                {item.txHash && (
                  <Text style={styles.transferTx} numberOfLines={1}>
                    Tx: {item.txHash.slice(0, 10)}...
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#0D9488" />
            </View>

            <Text style={styles.modalTitle}>Transfer Request Submitted</Text>
            <Text style={styles.modalSub}>
              Sent to Supply Chain Manager governance approval queue.
            </Text>

            {createdTransfer && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Request ID</Text>
                  <Text style={styles.summaryVal}>{createdTransfer.id}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>SKU & Qty</Text>
                  <Text style={styles.summaryVal}>
                    {createdTransfer.productSku} ({createdTransfer.transferQuantity} units)
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Destination</Text>
                  <Text style={styles.summaryVal}>{createdTransfer.toWarehouse.split(' ')[0]}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryKey}>Ledger Hash</Text>
                  <Text style={styles.summaryTx} numberOfLines={1}>
                    {createdTransfer.txHash}
                  </Text>
                </View>
              </View>
            )}

            <Pressable
              style={styles.modalDoneBtn}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </Pressable>
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
  content: {
    padding: 16,
  },
  policyNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 14,
  },
  policyTextWrap: {
    flex: 1,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F766E',
    marginBottom: 2,
  },
  policyDesc: {
    fontSize: 11,
    color: '#115E59',
    lineHeight: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 14,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 12,
  },
  routeBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  routeItem: {
    marginBottom: 8,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  depotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  depotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
  routeArrow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  destScroll: {
    flexDirection: 'row',
  },
  destChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 6,
  },
  destChipSelected: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  destChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  destChipTextSelected: {
    color: '#FFFFFF',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 10,
    marginBottom: 8,
  },
  skuScroll: {
    marginHorizontal: -4,
    marginBottom: 12,
  },
  skuChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
    width: 140,
  },
  skuChipSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  skuChipSku: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  skuChipSkuSelected: {
    color: '#0D9488',
  },
  skuChipName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  skuChipAvail: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A36A',
    marginTop: 4,
  },
  stepperSection: {
    marginBottom: 8,
  },
  stepperSubtext: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 4,
  },
  reasonsList: {
    gap: 6,
    marginBottom: 12,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    borderColor: '#0D9488',
    backgroundColor: '#F0FDFA',
  },
  reasonRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonRadioActive: {
    borderColor: '#0D9488',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
  },
  reasonText: {
    fontSize: 12,
    color: '#475569',
  },
  reasonTextSelected: {
    fontWeight: '700',
    color: '#0F766E',
  },
  dateSection: {
    marginBottom: 10,
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#10234D',
    marginBottom: 14,
  },
  submitBtn: {
    backgroundColor: '#0D9488',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  transferCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 10,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  transferIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transferId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  badgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  transferDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  transferSku: {
    fontSize: 14,
    color: '#10234D',
    marginBottom: 2,
  },
  transferProdName: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  transferRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  routeDepotText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  transferFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonBadgeText: {
    fontSize: 10,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transferTx: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
    maxWidth: 140,
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
  successIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#CCFBF1',
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
  summaryBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryKey: {
    fontSize: 11,
    color: '#64748B',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  summaryTx: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
    maxWidth: 160,
  },
  modalDoneBtn: {
    width: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
