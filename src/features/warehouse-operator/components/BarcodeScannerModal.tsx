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
  Camera,
  CheckCircle2,
  Flashlight,
  FlashlightOff,
  Keyboard,
  QrCode,
  RefreshCw,
  Search,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import warehouseService from '../services/warehouseService';
import { WarehouseProduct } from '../types';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onProductScanned?: (product: WarehouseProduct) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  visible,
  onClose,
  onProductScanned,
}) => {
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
      if (onProductScanned) {
        onProductScanned(product);
      }
    } else {
      setMatchedProduct(null);
      setScanError(`Product not found for barcode or SKU: "${barcodeVal}". Verify code and retry.`);
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

  const handleNavigateToProduct = (product: WarehouseProduct) => {
    onClose();
    resetScanner();
    router.push(`/(protected)/warehouse-operator/product/${product.sku}` as any);
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.header}>
          <View style={styles.headerTitleRow}>
            <QrCode size={20} color="#16A36A" />
            <Text style={styles.headerTitle}>Barcode & QR Scanner</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={onClose}>
            <X size={20} color="#FFFFFF" />
          </Pressable>
        </View>

        {/* Camera Area */}
        <View style={styles.cameraContainer}>
          {!permission ? (
            <View style={styles.centerMessage}>
              <ActivityIndicator size="large" color="#16A36A" />
              <Text style={styles.messageText}>Requesting camera access...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centerMessage}>
              <AlertCircle size={44} color="#F59E0B" />
              <Text style={styles.permissionTitle}>Camera Permission Required</Text>
              <Text style={styles.permissionSub}>
                To scan parcel barcodes, storage bins and consignment QR codes, please grant camera access.
              </Text>
              <Pressable style={styles.grantButton} onPress={requestPermission}>
                <Text style={styles.grantButtonText}>Grant Permission</Text>
              </Pressable>
            </View>
          ) : (
            <CameraView
              style={styles.camera}
              facing={facing}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                ],
              }}
              onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
            >
              {/* Scanner Viewfinder Overlay */}
              <View style={styles.overlay}>
                <View style={styles.unfocusedTop} />

                <View style={styles.middleRow}>
                  <View style={styles.unfocusedSide} />
                  <View style={styles.scannerFrame}>
                    {/* 4 Corner Markers */}
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />

                    {/* Animated laser line */}
                    {isScanning && <View style={styles.laserLine} />}
                  </View>
                  <View style={styles.unfocusedSide} />
                </View>

                <View style={styles.unfocusedBottom}>
                  <Text style={styles.instructionText}>
                    Align barcode or QR code inside the frame to scan
                  </Text>
                </View>
              </View>
            </CameraView>
          )}

          {/* Controls Bar (Flashlight, Camera Flip, Manual Entry) */}
          <View style={styles.controlsBar}>
            <Pressable
              style={[styles.controlBtn, torchEnabled && styles.activeControlBtn]}
              onPress={() => setTorchEnabled(!torchEnabled)}
            >
              {torchEnabled ? (
                <FlashlightOff size={18} color="#10234D" />
              ) : (
                <Flashlight size={18} color="#FFFFFF" />
              )}
            </Pressable>

            <Pressable
              style={styles.controlBtn}
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            >
              <RefreshCw size={18} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={[styles.controlBtn, showManualInput && styles.activeControlBtn]}
              onPress={() => setShowManualInput(!showManualInput)}
            >
              <Keyboard size={18} color={showManualInput ? '#10234D' : '#FFFFFF'} />
            </Pressable>
          </View>
        </View>

        {/* Quick Testing Bar on Emulator */}
        <View style={styles.testBarcodesBar}>
          <Text style={styles.testBarcodesTitle}>Quick Test Barcodes (1-Tap Simulation):</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.testList}>
            {testBarcodes.map((t, idx) => (
              <Pressable
                key={idx}
                style={styles.testBadge}
                onPress={() => processBarcode(t.code)}
              >
                <Text style={styles.testBadgeText}>{t.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Manual SKU Input Box */}
        {showManualInput && (
          <View style={styles.manualEntryContainer}>
            <TextInput
              style={styles.manualInput}
              placeholder="Enter SKU (e.g. PRD-012) or barcode number"
              placeholderTextColor="#94A3B8"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
            />
            <Pressable style={styles.manualSearchBtn} onPress={handleManualLookup}>
              <Search size={16} color="#FFFFFF" />
              <Text style={styles.manualSearchText}>Lookup</Text>
            </Pressable>
          </View>
        )}

        {/* Scan Result Panel */}
        {scannedData && (
          <View style={styles.resultPanel}>
            {matchedProduct ? (
              <View style={styles.successCard}>
                <View style={styles.successHeader}>
                  <View style={styles.successBadge}>
                    <CheckCircle2 size={16} color="#16A36A" />
                    <Text style={styles.successBadgeText}>PRODUCT IDENTIFIED</Text>
                  </View>
                  <Text style={styles.skuTag}>{matchedProduct.sku}</Text>
                </View>

                <Text style={styles.productName}>{matchedProduct.name}</Text>
                <Text style={styles.productLocation}>
                  Storage Location: {matchedProduct.storageLocation}
                </Text>

                <View style={styles.stockInfoRow}>
                  <View style={styles.stockCol}>
                    <Text style={styles.stockColLabel}>Available</Text>
                    <Text style={styles.stockColVal}>{matchedProduct.availableQuantity} u</Text>
                  </View>
                  <View style={styles.stockCol}>
                    <Text style={styles.stockColLabel}>Reserved</Text>
                    <Text style={styles.stockColVal}>{matchedProduct.reservedQuantity} u</Text>
                  </View>
                  <View style={styles.stockCol}>
                    <Text style={styles.stockColLabel}>Status</Text>
                    <Text style={styles.stockColVal}>{matchedProduct.stockStatus.toUpperCase()}</Text>
                  </View>
                </View>

                <View style={styles.actionBtnRow}>
                  <Pressable
                    style={styles.viewDetailBtn}
                    onPress={() => handleNavigateToProduct(matchedProduct)}
                  >
                    <Text style={styles.viewDetailText}>Open Product Details</Text>
                    <ArrowRight size={16} color="#FFFFFF" />
                  </Pressable>

                  <Pressable style={styles.rescanBtn} onPress={resetScanner}>
                    <Text style={styles.rescanText}>Scan Next</Text>
                  </Pressable>
                </View>
              </View>
            ) : scanError ? (
              <View style={styles.errorCard}>
                <View style={styles.errorHeader}>
                  <AlertCircle size={18} color="#DC4545" />
                  <Text style={styles.errorTitle}>Unknown Barcode</Text>
                </View>
                <Text style={styles.errorDescription}>{scanError}</Text>
                <Pressable style={styles.retryBtn} onPress={resetScanner}>
                  <Text style={styles.retryBtnText}>Scan Again</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  centerMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#0F172A',
  },
  messageText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 14,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  permissionSub: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  grantButton: {
    backgroundColor: '#16A36A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 20,
  },
  grantButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  overlay: {
    flex: 1,
  },
  unfocusedTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 240,
  },
  unfocusedSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scannerFrame: {
    width: 250,
    height: 240,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderColor: '#0D9488',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  laserLine: {
    position: 'absolute',
    top: '50%',
    left: 10,
    right: 10,
    height: 2,
    backgroundColor: '#16A36A',
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  unfocusedBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    paddingTop: 16,
  },
  instructionText: {
    color: '#E2E8F0',
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  controlsBar: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'column',
    gap: 10,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeControlBtn: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  testBarcodesBar: {
    backgroundColor: '#1E293B',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  testBarcodesTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  testList: {
    gap: 8,
  },
  testBadge: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  testBadgeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '600',
  },
  manualEntryContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1E293B',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  manualInput: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#475569',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 13,
    height: 42,
  },
  manualSearchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A36A',
    borderRadius: 10,
    paddingHorizontal: 14,
    gap: 6,
    height: 42,
  },
  manualSearchText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  resultPanel: {
    padding: 14,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
  },
  successHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  successBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A36A',
  },
  skuTag: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  productName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  productLocation: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 10,
  },
  stockInfoRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stockCol: {
    alignItems: 'center',
  },
  stockColLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  stockColVal: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 1,
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  viewDetailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#16A36A',
    borderRadius: 10,
    paddingVertical: 10,
    gap: 6,
  },
  viewDetailText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  rescanBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rescanText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    borderRadius: 12,
    padding: 12,
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#DC4545',
  },
  errorDescription: {
    fontSize: 12,
    color: '#7F1D1D',
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: '#DC4545',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});

export default BarcodeScannerModal;
