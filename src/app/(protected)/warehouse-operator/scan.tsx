import {
  BarcodeScanningResult,
  CameraType,
  CameraView,
  useCameraPermissions,
} from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Boxes,
  Camera,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Keyboard,
  MapPin,
  Package,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { WarehouseProduct } from '../../../features/warehouse-operator/types';

export default function BarcodeScanScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<WarehouseProduct | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const testBarcodes = [
    { code: '8901234567890', sku: 'PRD-012', label: 'PRD-012 (Microcontroller)' },
    { code: '8902345678901', sku: 'PRD-034', label: 'PRD-034 (RAM 16GB)' },
    { code: '8903456789012', sku: 'PRD-056', label: 'PRD-056 (SSD Controller)' },
    { code: '8905678901234', sku: 'PRD-014', label: 'PRD-014 (Power Regulator)' },
    { code: '9999999999999', sku: 'UNKNOWN', label: 'Unknown Code (Error Test)' },
  ];

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (!isScanning) return;
    processBarcode(result.data);
  };

  const processBarcode = (barcodeVal: string) => {
    setIsScanning(false);
    setScannedData(barcodeVal);
    setScanError(null);

    const product =
      warehouseService.getProductByBarcode(barcodeVal) ||
      warehouseService.getProductBySku(barcodeVal);

    if (product) {
      setMatchedProduct(product);
    } else {
      setMatchedProduct(null);
      setScanError(`No item matching barcode / SKU "${barcodeVal}" registered in warehouse ledger.`);
    }
  };

  const handleManualLookup = () => {
    if (!manualCode.trim()) return;
    processBarcode(manualCode.trim());
  };

  const resetScanner = () => {
    setScannedData(null);
    setMatchedProduct(null);
    setScanError(null);
    setIsScanning(true);
    setManualCode('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Barcode / QR Scanner"
        subtitle="Industrial Optical Decoders · Camera & Manual Input"
      />

      <View style={styles.container}>
        {/* Viewfinder Area */}
        <View style={styles.cameraBox}>
          {permission && permission.granted ? (
            <CameraView
              style={styles.camera}
              facing={facing}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                  'datamatrix',
                ],
              }}
              onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
            >
              {/* Reticle Overlay */}
              <View style={styles.viewfinderOverlay}>
                <View style={styles.targetFrame}>
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />
                  {isScanning && <View style={styles.laserLine} />}
                </View>
                <Text style={styles.hintText}>
                  {isScanning ? 'Align barcode or QR within frame' : 'Scan processed'}
                </Text>
              </View>
            </CameraView>
          ) : (
            <View style={styles.permissionFallback}>
              <Camera size={44} color="#64748B" />
              <Text style={styles.permTitle}>Camera Access Required</Text>
              <Text style={styles.permDesc}>
                Enable camera to scan pallet labels, cartons, and bin barcodes.
              </Text>
              <Pressable style={styles.permBtn} onPress={requestPermission}>
                <Text style={styles.permBtnText}>Grant Camera Permission</Text>
              </Pressable>
            </View>
          )}

          {/* Floating Camera Controls */}
          <View style={styles.cameraTools}>
            <Pressable
              style={styles.toolBtn}
              onPress={() => setTorchEnabled(!torchEnabled)}
              hitSlop={8}
            >
              {torchEnabled ? (
                <FlashlightOff size={18} color="#F59E0B" />
              ) : (
                <Flashlight size={18} color="#FFFFFF" />
              )}
            </Pressable>

            <Pressable
              style={styles.toolBtn}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
              hitSlop={8}
            >
              <RefreshCw size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.toolBtn, showManualInput && styles.toolBtnActive]}
              onPress={() => setShowManualInput(!showManualInput)}
              hitSlop={8}
            >
              <Keyboard size={18} color={showManualInput ? '#16A36A' : '#FFFFFF'} />
            </Pressable>
          </View>
        </View>

        {/* Manual Barcode / SKU Input Row */}
        {showManualInput && (
          <View style={styles.manualInputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="Type SKU (e.g. PRD-012) or barcode..."
              placeholderTextColor="#94A3B8"
              value={manualCode}
              onChangeText={setManualCode}
              onSubmitEditing={handleManualLookup}
              autoCapitalize="characters"
            />
            <Pressable style={styles.manualLookupBtn} onPress={handleManualLookup}>
              <Search size={16} color="#FFFFFF" />
              <Text style={styles.manualLookupBtnText}>Search</Text>
            </Pressable>
          </View>
        )}

        {/* Emulator Test Barcodes Scroll */}
        <View style={styles.testSection}>
          <View style={styles.testHeader}>
            <Sparkles size={12} color="#16A36A" />
            <Text style={styles.testTitle}>EMULATOR SIMULATION PRESETS</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.testScroll}>
            {testBarcodes.map((item) => (
              <Pressable
                key={item.code}
                style={styles.testChip}
                onPress={() => processBarcode(item.code)}
              >
                <Text style={styles.testChipText}>{item.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Scanned Result / Match Card */}
        <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent}>
          {matchedProduct && (
            <View style={styles.matchCard}>
              <View style={styles.matchCardHeader}>
                <View style={styles.matchBadge}>
                  <CheckCircle2 size={14} color="#16A36A" />
                  <Text style={styles.matchBadgeText}>PRODUCT IDENTIFIED</Text>
                </View>
                <Text style={styles.barcodeRef}>Barcode: {matchedProduct.barcode}</Text>
              </View>

              <Text style={styles.matchName}>{matchedProduct.name}</Text>
              <Text style={styles.matchSku}>SKU: {matchedProduct.sku} · {matchedProduct.category}</Text>

              <View style={styles.matchStatsGrid}>
                <View style={styles.matchStat}>
                  <Text style={styles.matchStatVal}>{matchedProduct.availableQuantity}</Text>
                  <Text style={styles.matchStatLabel}>Available Units</Text>
                </View>
                <View style={styles.matchStat}>
                  <Text style={styles.matchStatVal}>{matchedProduct.reservedQuantity}</Text>
                  <Text style={styles.matchStatLabel}>Reserved Units</Text>
                </View>
                <View style={styles.matchStat}>
                  <Text style={[styles.matchStatVal, { color: '#DC4545' }]}>
                    {matchedProduct.quarantinedQuantity}
                  </Text>
                  <Text style={styles.matchStatLabel}>Quarantined</Text>
                </View>
              </View>

              <View style={styles.binLocationBox}>
                <MapPin size={14} color="#16A36A" />
                <Text style={styles.binLocationText}>{matchedProduct.storageLocation}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.matchActions}>
                <Pressable
                  style={styles.primaryActionBtn}
                  onPress={() => {
                    router.push(`/(protected)/warehouse-operator/product/${matchedProduct.sku}` as any);
                  }}
                >
                  <Text style={styles.primaryActionBtnText}>View Product Details</Text>
                  <ArrowRight size={15} color="#FFFFFF" />
                </Pressable>

                <View style={styles.secondaryActionRow}>
                  <Pressable style={styles.resetScanBtn} onPress={resetScanner}>
                    <RefreshCw size={14} color="#10234D" />
                    <Text style={styles.resetScanBtnText}>Scan Again</Text>
                  </Pressable>

                  <Pressable
                    style={styles.damageQuickBtn}
                    onPress={() =>
                      router.push('/(protected)/warehouse-operator/damage-report' as any)
                    }
                  >
                    <ShieldAlert size={14} color="#DC4545" />
                    <Text style={styles.damageQuickBtnText}>Report Damage</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          )}

          {scanError && (
            <View style={styles.errorCard}>
              <View style={styles.errorHeader}>
                <AlertCircle size={18} color="#DC4545" />
                <Text style={styles.errorTitle}>Unrecognized Barcode</Text>
              </View>
              <Text style={styles.errorDesc}>{scanError}</Text>
              <Pressable style={styles.errorRetryBtn} onPress={resetScanner}>
                <Text style={styles.errorRetryText}>Retry Scanning</Text>
              </Pressable>
            </View>
          )}

          {!matchedProduct && !scanError && (
            <View style={styles.idleState}>
              <QrCode size={36} color="#CBD5E1" />
              <Text style={styles.idleText}>
                Point camera at product label or tap a preset simulation chip above
              </Text>
            </View>
          )}
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
  cameraBox: {
    height: 240,
    backgroundColor: '#0A1733',
    position: 'relative',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
  },
  viewfinderOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetFrame: {
    width: 220,
    height: 140,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#16A36A',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#DC4545',
    shadowColor: '#DC4545',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  hintText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
  },
  cameraTools: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
  },
  toolBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 35, 77, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolBtnActive: {
    backgroundColor: '#FFFFFF',
  },
  permissionFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  permTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  permDesc: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  permBtn: {
    backgroundColor: '#16A36A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  permBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  manualInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    gap: 8,
  },
  manualInput: {
    flex: 1,
    height: 38,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    fontSize: 13,
    color: '#10234D',
    fontWeight: '600',
  },
  manualLookupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#10234D',
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  manualLookupBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  testSection: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  testTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A36A',
    letterSpacing: 0.5,
  },
  testScroll: {
    flexGrow: 0,
    paddingHorizontal: 14,
  },
  testChip: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    marginRight: 8,
  },
  testChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  resultScroll: {
    flex: 1,
  },
  resultContent: {
    padding: 16,
    paddingBottom: 100,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A36A',
  },
  barcodeRef: {
    fontSize: 11,
    color: '#64748B',
  },
  matchName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  matchSku: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 12,
  },
  matchStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  matchStat: {
    alignItems: 'center',
  },
  matchStatVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  matchStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  binLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    marginBottom: 14,
  },
  binLocationText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A36A',
  },
  matchActions: {
    gap: 8,
  },
  primaryActionBtn: {
    backgroundColor: '#16A36A',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resetScanBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetScanBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  damageQuickBtn: {
    flex: 1,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 8,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  damageQuickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC4545',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC4545',
  },
  errorDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorRetryBtn: {
    backgroundColor: '#DC4545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  errorRetryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  idleState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  idleText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 240,
  },
});
