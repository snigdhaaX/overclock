import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Calendar,
  Check,
  CheckCircle2,
  FileCheck,
  Package,
  QrCode,
  ShieldAlert,
  ShieldCheck,
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
import { QuantityStepper } from '../../../features/warehouse-operator/components/QuantityStepper';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { GoodsReceipt, InboundShipmentItem } from '../../../features/warehouse-operator/types';

export default function GoodsReceiptScreen() {
  const router = useRouter();
  const incomingShipments = warehouseService.getIncomingShipments();
  const [selectedShipment, setSelectedShipment] = useState<InboundShipmentItem>(
    incomingShipments[0] || {
      id: 'SHP-101',
      supplier: 'Global Silicon Fab Ltd',
      carrier: 'OceanTrans',
      productSku: 'PRD-012',
      productName: 'Industrial Microcontrollers 32-Bit',
      expectedQuantity: 500,
      actualReceivedQuantity: 0,
      expectedArrivalDate: '24 Oct 2026',
      status: 'pending',
      priority: 'Critical',
      warehouseDestination: 'WH-MUM',
      purchaseRef: 'PO-98421',
    }
  );

  const [receivedQty, setReceivedQty] = useState(selectedShipment.expectedQuantity);
  const [damagedQty, setDamagedQty] = useState(0);
  const [notes, setNotes] = useState('');
  const [carrierWaybillChecked, setCarrierWaybillChecked] = useState(true);
  const [sealIntactChecked, setSealIntactChecked] = useState(true);
  const [palletMoistureChecked, setPalletMoistureChecked] = useState(true);
  const [esdPackagingChecked, setEsdPackagingChecked] = useState(true);
  const [createdReceipt, setCreatedReceipt] = useState<GoodsReceipt | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSelectShipment = (shp: InboundShipmentItem) => {
    setSelectedShipment(shp);
    setReceivedQty(shp.expectedQuantity);
    setDamagedQty(0);
  };

  const handleConfirmReceipt = () => {
    if (damagedQty > receivedQty) {
      Alert.alert('Validation Error', 'Damaged quantity cannot exceed received quantity.');
      return;
    }

    const res = warehouseService.createGoodsReceipt({
      shipmentId: selectedShipment.id,
      supplier: selectedShipment.supplier,
      carrier: selectedShipment.carrier,
      expectedArrivalDate: selectedShipment.expectedArrivalDate,
      expectedQuantity: selectedShipment.expectedQuantity,
      receivedQuantity: receivedQty,
      damagedQuantity: damagedQty,
      productSku: selectedShipment.productSku,
      productName: selectedShipment.productName,
      purchaseRef: selectedShipment.purchaseRef,
      warehouseDestination: selectedShipment.warehouseDestination,
      notes: notes.trim().length > 0 ? notes : undefined,
      receivedBy: 'Rohit Verma (EMP-4029)',
    });

    if (res.success && res.receipt) {
      setCreatedReceipt(res.receipt);
      setShowSuccessModal(true);
    } else {
      Alert.alert('Error', res.error || 'Failed to submit goods receipt.');
    }
  };

  const netGoodQty = Math.max(0, receivedQty - damagedQty);

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Inbound Goods Receipt"
        subtitle="Dock Bay 02 · Cargo Inspection & Ledger Confirmation"
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Select Inbound Shipment Card */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Select Inbound Consignment</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.shipmentScroll}>
            {incomingShipments.map((shp) => (
              <Pressable
                key={shp.id}
                style={[
                  styles.shipmentChip,
                  selectedShipment.id === shp.id && styles.shipmentChipSelected,
                ]}
                onPress={() => handleSelectShipment(shp)}
              >
                <View style={styles.shipmentChipHeader}>
                  <Text
                    style={[
                      styles.shipmentChipId,
                      selectedShipment.id === shp.id && styles.shipmentChipIdSelected,
                    ]}
                  >
                    {shp.id}
                  </Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      shp.priority === 'Critical'
                        ? styles.priorityCritical
                        : styles.priorityHigh,
                    ]}
                  >
                    <Text style={styles.priorityBadgeText}>{shp.priority}</Text>
                  </View>
                </View>
                <Text style={styles.shipmentChipSku}>{shp.productSku}</Text>
                <Text style={styles.shipmentChipSupplier} numberOfLines={1}>
                  {shp.supplier}
                </Text>
                <Text style={styles.shipmentChipExpected}>
                  Expected: {shp.expectedQuantity} units
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Consignment Verification Summary */}
        <View style={styles.card}>
          <View style={styles.consignmentHeader}>
            <View style={styles.consignmentIcon}>
              <Truck size={22} color="#2563EB" />
            </View>
            <View style={styles.consignmentInfo}>
              <Text style={styles.consignmentTitle}>{selectedShipment.productName}</Text>
              <Text style={styles.consignmentRef}>
                PO: {selectedShipment.purchaseRef} · Carrier: {selectedShipment.carrier}
              </Text>
            </View>
          </View>

          <View style={styles.specsGrid}>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Destination</Text>
              <Text style={styles.specVal}>{selectedShipment.warehouseDestination}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Arrival Date</Text>
              <Text style={styles.specVal}>{selectedShipment.expectedArrivalDate}</Text>
            </View>
            <View style={styles.specBox}>
              <Text style={styles.specLabel}>Expected Units</Text>
              <Text style={[styles.specVal, { color: '#2563EB' }]}>
                {selectedShipment.expectedQuantity}
              </Text>
            </View>
          </View>
        </View>

        {/* Quantity Verification Steppers */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Dock Tally & Verification</Text>

          <View style={styles.stepperContainer}>
            <QuantityStepper
              label="Physical Units Received"
              value={receivedQty}
              onChange={setReceivedQty}
              min={0}
              max={selectedShipment.expectedQuantity * 2}
              step={10}
              unit="units"
            />
          </View>

          <View style={styles.stepperContainer}>
            <QuantityStepper
              label="Damaged / Defective Units"
              value={damagedQty}
              onChange={setDamagedQty}
              min={0}
              max={receivedQty}
              step={1}
              unit="units"
            />
          </View>

          {/* Real-time Tally Summary Strip */}
          <View style={styles.tallySummaryStrip}>
            <View style={styles.tallyItem}>
              <Text style={styles.tallyLabel}>Net Stock Added</Text>
              <Text style={[styles.tallyValue, { color: '#16A36A' }]}>
                +{netGoodQty} units
              </Text>
            </View>
            <View style={styles.tallyDivider} />
            <View style={styles.tallyItem}>
              <Text style={styles.tallyLabel}>Quarantined</Text>
              <Text
                style={[
                  styles.tallyValue,
                  { color: damagedQty > 0 ? '#DC4545' : '#64748B' },
                ]}
              >
                {damagedQty} units
              </Text>
            </View>
          </View>

          {damagedQty > 0 && (
            <View style={styles.discrepancyWarning}>
              <AlertTriangle size={15} color="#DC4545" />
              <Text style={styles.discrepancyText}>
                Discrepancy detected: {damagedQty} units will be automatically segregated into Quarantine Bay Q1.
              </Text>
            </View>
          )}
        </View>

        {/* Quality Check Inspection List */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Physical Inspection Checklist</Text>

          <Pressable
            style={styles.checkItem}
            onPress={() => setCarrierWaybillChecked(!carrierWaybillChecked)}
          >
            <View style={[styles.checkbox, carrierWaybillChecked && styles.checkboxActive]}>
              {carrierWaybillChecked && <Check size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>Carrier Bill of Lading & Waybill verified against PO</Text>
          </Pressable>

          <Pressable
            style={styles.checkItem}
            onPress={() => setSealIntactChecked(!sealIntactChecked)}
          >
            <View style={[styles.checkbox, sealIntactChecked && styles.checkboxActive]}>
              {sealIntactChecked && <Check size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>Customs & container tamper-evident seals intact</Text>
          </Pressable>

          <Pressable
            style={styles.checkItem}
            onPress={() => setPalletMoistureChecked(!palletMoistureChecked)}
          >
            <View style={[styles.checkbox, palletMoistureChecked && styles.checkboxActive]}>
              {palletMoistureChecked && <Check size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>Pallets examined for water immersion & crushing</Text>
          </Pressable>

          <Pressable
            style={styles.checkItem}
            onPress={() => setEsdPackagingChecked(!esdPackagingChecked)}
          >
            <View style={[styles.checkbox, esdPackagingChecked && styles.checkboxActive]}>
              {esdPackagingChecked && <Check size={13} color="#FFFFFF" />}
            </View>
            <Text style={styles.checkText}>ESD antistatic moisture barrier bags verified</Text>
          </Pressable>
        </View>

        {/* Receiving Notes */}
        <View style={styles.card}>
          <Text style={styles.cardSectionTitle}>Dock Notes & Discrepancy Comments</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Add container seal number, pallet IDs, or special notes..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <Pressable style={styles.submitBtn} onPress={handleConfirmReceipt}>
          <FileCheck size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Confirm & Sign Goods Receipt</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.successIconCircle}>
              <CheckCircle2 size={36} color="#16A36A" />
            </View>

            <Text style={styles.modalTitle}>Goods Receipt Confirmed</Text>
            <Text style={styles.modalSub}>
              Consignment logged and recorded to Trustchain immutable ledger.
            </Text>

            {createdReceipt && (
              <View style={styles.receiptDetails}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Receipt ID</Text>
                  <Text style={styles.receiptVal}>{createdReceipt.id}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Shipment</Text>
                  <Text style={styles.receiptVal}>{createdReceipt.shipmentId}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>SKU</Text>
                  <Text style={styles.receiptVal}>{createdReceipt.productSku}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Net Accepted</Text>
                  <Text style={[styles.receiptVal, { color: '#16A36A' }]}>
                    +{createdReceipt.receivedQuantity - createdReceipt.damagedQuantity} units
                  </Text>
                </View>
                {createdReceipt.damagedQuantity > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptKey}>Quarantined</Text>
                    <Text style={[styles.receiptVal, { color: '#DC4545' }]}>
                      {createdReceipt.damagedQuantity} units
                    </Text>
                  </View>
                )}
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptKey}>Audit Tx</Text>
                  <Text style={styles.receiptTx} numberOfLines={1}>
                    {createdReceipt.txHash}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <Pressable
                style={styles.modalSecondaryBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.push('/(protected)/warehouse-operator/inventory' as any);
                }}
              >
                <Text style={styles.modalSecondaryBtnText}>View Inventory</Text>
              </Pressable>

              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(protected)/warehouse-operator/home' as any);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Done</Text>
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
  content: {
    padding: 16,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 12,
  },
  shipmentScroll: {
    marginHorizontal: -4,
  },
  shipmentChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 10,
    width: 170,
  },
  shipmentChipSelected: {
    borderColor: '#16A36A',
    backgroundColor: '#F0FDF4',
  },
  shipmentChipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  shipmentChipId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  shipmentChipIdSelected: {
    color: '#16A36A',
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
    color: '#DC4545',
  },
  shipmentChipSku: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 2,
  },
  shipmentChipSupplier: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  shipmentChipExpected: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10234D',
    marginTop: 4,
  },
  consignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  consignmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consignmentInfo: {
    flex: 1,
  },
  consignmentTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  consignmentRef: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  specsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  specBox: {
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  specVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  stepperContainer: {
    marginBottom: 12,
  },
  tallySummaryStrip: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginTop: 4,
    alignItems: 'center',
  },
  tallyItem: {
    flex: 1,
    alignItems: 'center',
  },
  tallyDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#CBD5E1',
  },
  tallyLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  tallyValue: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  discrepancyWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  discrepancyText: {
    flex: 1,
    fontSize: 11,
    color: '#991B1B',
    lineHeight: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#16A36A',
    borderColor: '#16A36A',
  },
  checkText: {
    flex: 1,
    fontSize: 12,
    color: '#334155',
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 10,
    fontSize: 12,
    color: '#10234D',
    textAlignVertical: 'top',
  },
  submitBtn: {
    backgroundColor: '#16A36A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
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
    backgroundColor: '#DCFCE7',
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
  receiptDetails: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptKey: {
    fontSize: 11,
    color: '#64748B',
  },
  receiptVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  receiptTx: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'monospace',
    maxWidth: 160,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  modalSecondaryBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  modalPrimaryBtn: {
    flex: 1,
    backgroundColor: '#16A36A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
