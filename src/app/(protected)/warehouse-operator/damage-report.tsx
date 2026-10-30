import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Boxes,
  Camera,
  CheckCircle2,
  MapPin,
  Package,
  ShieldAlert,
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
import { PhotoEvidencePicker } from '../../../features/warehouse-operator/components/PhotoEvidencePicker';
import { QuantityStepper } from '../../../features/warehouse-operator/components/QuantityStepper';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { DamageReason, DamageReport, WarehouseProduct } from '../../../features/warehouse-operator/types';

export default function DamageReportScreen() {
  const router = useRouter();
  const products = warehouseService.getWarehouseInventory();

  const [selectedProduct, setSelectedProduct] = useState<WarehouseProduct>(products[0]);
  const [shipmentId, setShipmentId] = useState('SHP-101');
  const [damagedQty, setDamagedQty] = useState(5);
  const [damageReason, setDamageReason] = useState<DamageReason>('Physical Damage');
  const [description, setDescription] = useState(
    'Carton crush deformation and moisture infiltration observed during pallet unloading.'
  );
  const [photoUri, setPhotoUri] = useState<string | undefined>(
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600'
  );
  const [createdReport, setCreatedReport] = useState<DamageReport | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const reasons: DamageReason[] = [
    'Physical Damage',
    'Packaging Damage',
    'Water Damage',
    'Manufacturing Defect',
    'Missing Components',
    'Other',
  ];

  const handleSubmit = () => {
    if (damagedQty <= 0) {
      Alert.alert('Validation Error', 'Damaged quantity must be greater than zero.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Validation Error', 'Please describe the observed cargo damage.');
      return;
    }

    const res = warehouseService.createDamageReport({
      shipmentId: shipmentId.trim() || undefined,
      productSku: selectedProduct.sku,
      productName: selectedProduct.name,
      supplier: 'Global Silicon Fab Ltd',
      damagedQuantity: damagedQty,
      damageReason,
      description: description.trim(),
      photoUri,
      reportedBy: 'Rohit Verma (EMP-4029)',
      warehouseId: 'WH-MUM',
    });

    if (res.success && res.report) {
      setCreatedReport(res.report);
      setShowSuccessModal(true);
    } else {
      Alert.alert('Submission Error', res.error || 'Failed to submit damage report.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Report Damaged Goods"
        subtitle="Quarantine Segregation · Digital Evidence Dossier"
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Warning Banner */}
        <View style={styles.banner}>
          <ShieldAlert size={18} color="#DC4545" />
          <View style={styles.bannerTextWrap}>
            <Text style={styles.bannerTitle}>Mandatory Quarantine Protocol</Text>
            <Text style={styles.bannerDesc}>
              Reporting damage will immediately deduct units from available pick stock and allocate them to Quarantine Bay Q1 under QA hold.
            </Text>
          </View>
        </View>

        {/* Select Product Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Damaged Product / SKU</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.skuScroll}>
            {products.map((p) => (
              <Pressable
                key={p.sku}
                style={[
                  styles.skuChip,
                  selectedProduct.sku === p.sku && styles.skuChipSelected,
                ]}
                onPress={() => setSelectedProduct(p)}
              >
                <Text
                  style={[
                    styles.skuChipCode,
                    selectedProduct.sku === p.sku && styles.skuChipCodeSelected,
                  ]}
                >
                  {p.sku}
                </Text>
                <Text style={styles.skuChipName} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={styles.skuChipStock}>Avail: {p.availableQuantity}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.shipmentRefRow}>
            <Text style={styles.inputLabel}>Shipment / Inbound Ref (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. SHP-101 or PO-98421"
              placeholderTextColor="#94A3B8"
              value={shipmentId}
              onChangeText={setShipmentId}
            />
          </View>
        </View>

        {/* Quantity Stepper */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Damaged Quantity to Quarantine</Text>
          <QuantityStepper
            label="Damaged Units"
            value={damagedQty}
            onChange={setDamagedQty}
            min={1}
            max={selectedProduct.availableQuantity + 100}
            step={1}
            unit="units"
          />
          <View style={styles.quarantineTargetStrip}>
            <MapPin size={14} color="#DC4545" />
            <Text style={styles.quarantineTargetText}>
              Allocated Destination: <Text style={{ fontWeight: '800' }}>Quarantine Bay Q1</Text>
            </Text>
          </View>
        </View>

        {/* Damage Reason Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Root Cause / Defect Classification</Text>
          <View style={styles.reasonsGrid}>
            {reasons.map((reason) => (
              <Pressable
                key={reason}
                style={[
                  styles.reasonChip,
                  damageReason === reason && styles.reasonChipSelected,
                ]}
                onPress={() => setDamageReason(reason)}
              >
                <View
                  style={[
                    styles.reasonRadio,
                    damageReason === reason && styles.reasonRadioActive,
                  ]}
                >
                  {damageReason === reason && <View style={styles.radioDot} />}
                </View>
                <Text
                  style={[
                    styles.reasonText,
                    damageReason === reason && styles.reasonTextSelected,
                  ]}
                >
                  {reason}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Photo Evidence Picker */}
        <View style={styles.card}>
          <PhotoEvidencePicker
            photoUri={photoUri}
            onPhotoSelected={(uri) => setPhotoUri(uri)}
            label="Photographic Evidence"
          />
        </View>

        {/* Description Textarea */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Detailed Defect Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Record broken tamper tags, water staining, puncture marks, or pallet identifiers..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={3}
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Submit Button */}
        <Pressable style={styles.submitBtn} onPress={handleSubmit}>
          <ShieldAlert size={18} color="#FFFFFF" />
          <Text style={styles.submitBtnText}>Submit Damage Report & Quarantine Stock</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHazardIcon}>
              <ShieldAlert size={36} color="#DC4545" />
            </View>

            <Text style={styles.modalTitle}>Damage Logged & Quarantined</Text>
            <Text style={styles.modalSub}>
              Units isolated in Quarantine Bay Q1. Notification dispatched to Operations Analyst.
            </Text>

            {createdReport && (
              <View style={styles.reportSummary}>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>Incident ID</Text>
                  <Text style={styles.reportVal}>{createdReport.id}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>SKU</Text>
                  <Text style={styles.reportVal}>{createdReport.productSku}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>Quarantined Qty</Text>
                  <Text style={[styles.reportVal, { color: '#DC4545' }]}>
                    {createdReport.damagedQuantity} units
                  </Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>Reason</Text>
                  <Text style={styles.reportVal}>{createdReport.damageReason}</Text>
                </View>
                <View style={styles.reportRow}>
                  <Text style={styles.reportKey}>Ledger Tx</Text>
                  <Text style={styles.reportTx} numberOfLines={1}>
                    {createdReport.txHash}
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
                <Text style={styles.modalSecondaryBtnText}>View Stock</Text>
              </Pressable>

              <Pressable
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(protected)/warehouse-operator/home' as any);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>Close</Text>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 14,
  },
  bannerTextWrap: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 2,
  },
  bannerDesc: {
    fontSize: 11,
    color: '#7F1D1D',
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
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 12,
  },
  skuScroll: {
    marginHorizontal: -4,
    marginBottom: 12,
  },
  skuChip: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    marginRight: 8,
    width: 140,
  },
  skuChipSelected: {
    borderColor: '#DC4545',
    backgroundColor: '#FEF2F2',
  },
  skuChipCode: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  skuChipCodeSelected: {
    color: '#DC4545',
  },
  skuChipName: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  skuChipStock: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A36A',
    marginTop: 4,
  },
  shipmentRefRow: {
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    fontSize: 13,
    color: '#10234D',
  },
  quarantineTargetStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  quarantineTargetText: {
    fontSize: 12,
    color: '#991B1B',
  },
  reasonsGrid: {
    gap: 8,
  },
  reasonChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reasonChipSelected: {
    borderColor: '#DC4545',
    backgroundColor: '#FEF2F2',
  },
  reasonRadio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reasonRadioActive: {
    borderColor: '#DC4545',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC4545',
  },
  reasonText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  reasonTextSelected: {
    color: '#991B1B',
    fontWeight: '700',
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
    backgroundColor: '#DC4545',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DC4545',
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
  modalHazardIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
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
  reportSummary: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 6,
  },
  reportRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reportKey: {
    fontSize: 11,
    color: '#64748B',
  },
  reportVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  reportTx: {
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
    backgroundColor: '#DC4545',
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
