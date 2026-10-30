import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Barcode,
  Boxes,
  CheckCircle2,
  ExternalLink,
  Layers,
  MapPin,
  Package,
  QrCode,
  ShieldAlert,
  Truck,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import warehouseService from '../../../../features/warehouse-operator/services/warehouseService';
import { WarehouseProduct, WarehouseTask } from '../../../../features/warehouse-operator/types';

export default function ProductDetailsScreen() {
  const { sku } = useLocalSearchParams<{ sku: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<WarehouseProduct | undefined>(
    warehouseService.getProductBySku(sku || '')
  );
  const [tasks, setTasks] = useState<WarehouseTask[]>([]);

  useEffect(() => {
    const update = () => {
      const p = warehouseService.getProductBySku(sku || '');
      setProduct(p);
      if (p) {
        const related = warehouseService
          .getWarehouseTasks()
          .filter((t) => t.productSku.toLowerCase() === p.sku.toLowerCase());
        setTasks(related);
      }
    };
    update();
    return warehouseService.subscribe(update);
  }, [sku]);

  if (!product) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Product Not Found</Text>
          <Text style={styles.notFoundDesc}>No item found for SKU: {sku}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const totalStock =
    product.availableQuantity + product.reservedQuantity + product.quarantinedQuantity;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#10234D" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerSku}>{product.sku}</Text>
          <Text style={styles.headerSub}>Inventory Master Record</Text>
        </View>
        <View
          style={[
            styles.statusPill,
            product.stockStatus === 'in_stock'
              ? styles.statusInStock
              : product.stockStatus === 'low_stock'
              ? styles.statusLowStock
              : styles.statusQuarantine,
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              product.stockStatus === 'in_stock'
                ? styles.statusInStockText
                : product.stockStatus === 'low_stock'
                ? styles.statusLowStockText
                : styles.statusQuarantineText,
            ]}
          >
            {product.stockStatus.replace('_', ' ').toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Product Identity Card */}
        <View style={styles.card}>
          <View style={styles.prodTopRow}>
            <View style={styles.prodIconCircle}>
              <Package size={26} color="#16A36A" />
            </View>
            <View style={styles.prodMainText}>
              <Text style={styles.prodName}>{product.name}</Text>
              <Text style={styles.prodCategory}>{product.category}</Text>
            </View>
          </View>

          <Text style={styles.prodDesc}>{product.description}</Text>

          <View style={styles.prodMetaRow}>
            <View style={styles.prodMetaItem}>
              <Text style={styles.prodMetaLabel}>Unit Price</Text>
              <Text style={styles.prodMetaValue}>₹{product.unitPrice.toLocaleString()}</Text>
            </View>
            <View style={styles.prodMetaItem}>
              <Text style={styles.prodMetaLabel}>Assigned Hub</Text>
              <Text style={styles.prodMetaValue}>{product.assignedWarehouse}</Text>
            </View>
            <View style={styles.prodMetaItem}>
              <Text style={styles.prodMetaLabel}>Packaging Unit</Text>
              <Text style={styles.prodMetaValue}>{product.unit || 'units'}</Text>
            </View>
          </View>
        </View>

        {/* Optical Barcode Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Barcode size={18} color="#10234D" />
            <Text style={styles.cardTitle}>Barcode Specifications</Text>
          </View>

          <View style={styles.barcodeVisualBox}>
            {/* Visual barcode mockup bars */}
            <View style={styles.barcodeBars}>
              {[2, 4, 1, 3, 2, 5, 2, 1, 4, 2, 3, 1, 5, 2, 4, 1, 3, 2, 5, 2, 1, 4, 3, 2, 4, 2].map(
                (w, i) => (
                  <View
                    key={i}
                    style={{
                      width: w,
                      height: 48,
                      backgroundColor: '#10234D',
                      marginHorizontal: 1,
                    }}
                  />
                )
              )}
            </View>
            <Text style={styles.barcodeDigits}>{product.barcode}</Text>
            <Text style={styles.barcodeTypeBadge}>Type: {product.barcodeType}</Text>
          </View>
        </View>

        {/* Stock Breakdown Grid */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Boxes size={18} color="#10234D" />
            <Text style={styles.cardTitle}>Inventory Breakdown</Text>
          </View>

          <View style={styles.breakdownGrid}>
            <View style={[styles.breakdownBox, { backgroundColor: '#F0FDF4' }]}>
              <Text style={[styles.breakdownVal, { color: '#16A36A' }]}>
                {product.availableQuantity}
              </Text>
              <Text style={styles.breakdownLabel}>Available Stock</Text>
              <Text style={styles.breakdownHint}>Ready for Pick</Text>
            </View>

            <View style={[styles.breakdownBox, { backgroundColor: '#EFF6FF' }]}>
              <Text style={[styles.breakdownVal, { color: '#2563EB' }]}>
                {product.reservedQuantity}
              </Text>
              <Text style={styles.breakdownLabel}>Reserved Stock</Text>
              <Text style={styles.breakdownHint}>Allocated to Orders</Text>
            </View>

            <View style={[styles.breakdownBox, { backgroundColor: '#FEF2F2' }]}>
              <Text style={[styles.breakdownVal, { color: '#DC4545' }]}>
                {product.quarantinedQuantity}
              </Text>
              <Text style={styles.breakdownLabel}>Quarantined</Text>
              <Text style={styles.breakdownHint}>Damaged / QA Hold</Text>
            </View>

            <View style={[styles.breakdownBox, { backgroundColor: '#F8FAFC' }]}>
              <Text style={[styles.breakdownVal, { color: '#10234D' }]}>{totalStock}</Text>
              <Text style={styles.breakdownLabel}>Total On-Hand</Text>
              <Text style={styles.breakdownHint}>Physical Depot Units</Text>
            </View>
          </View>
        </View>

        {/* Storage Location Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MapPin size={18} color="#16A36A" />
            <Text style={styles.cardTitle}>Depot Storage Bin Location</Text>
          </View>

          <View style={styles.locationHighlightBox}>
            <View>
              <Text style={styles.locPrimary}>{product.storageLocation}</Text>
              <Text style={styles.locSub}>Zone B · Standard Ambient Racks</Text>
            </View>
            <Pressable
              style={styles.mapNavBtn}
              onPress={() => router.push('/(protected)/warehouse-operator/warehouse-map' as any)}
            >
              <Text style={styles.mapNavBtnText}>View Map</Text>
              <ExternalLink size={12} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>

        {/* Associated Shift Tasks */}
        {tasks.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <CheckCircle2 size={18} color="#2563EB" />
              <Text style={styles.cardTitle}>Associated Active Tasks ({tasks.length})</Text>
            </View>

            {tasks.map((task) => (
              <Pressable
                key={task.id}
                style={styles.taskItem}
                onPress={() => router.push(`/(protected)/warehouse-operator/tasks/${task.id}` as any)}
              >
                <View>
                  <Text style={styles.taskItemTitle}>{task.title}</Text>
                  <Text style={styles.taskItemSub}>
                    {task.id} · Due: {task.dueDate} · {task.quantity} units
                  </Text>
                </View>
                <ArrowRight size={16} color="#16A36A" />
              </Pressable>
            ))}
          </View>
        )}

        {/* Operational Actions */}
        <View style={styles.actionsWrap}>
          <Pressable
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(protected)/warehouse-operator/stock-transfer' as any)}
          >
            <ArrowRightLeft size={16} color="#FFFFFF" />
            <Text style={styles.actionBtnPrimaryText}>Initiate Stock Transfer</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtnSecondary}
            onPress={() => router.push('/(protected)/warehouse-operator/damage-report' as any)}
          >
            <ShieldAlert size={16} color="#DC4545" />
            <Text style={[styles.actionBtnSecondaryText, { color: '#DC4545' }]}>
              Report Damaged Units
            </Text>
          </Pressable>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: 12,
  },
  headerSku: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusInStock: {
    backgroundColor: '#DCFCE7',
  },
  statusLowStock: {
    backgroundColor: '#FEF3C7',
  },
  statusQuarantine: {
    backgroundColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusInStockText: {
    color: '#16A36A',
  },
  statusLowStockText: {
    color: '#D97706',
  },
  statusQuarantineText: {
    color: '#DC4545',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  prodTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  prodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  prodMainText: {
    flex: 1,
  },
  prodName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  prodCategory: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  prodDesc: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    marginBottom: 14,
  },
  prodMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
  },
  prodMetaItem: {
    alignItems: 'center',
  },
  prodMetaLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  prodMetaValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  barcodeVisualBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  barcodeDigits: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: 2,
  },
  barcodeTypeBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 4,
  },
  breakdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  breakdownBox: {
    width: '48%',
    borderRadius: 10,
    padding: 12,
  },
  breakdownVal: {
    fontSize: 18,
    fontWeight: '800',
  },
  breakdownLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 4,
  },
  breakdownHint: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  locationHighlightBox: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locPrimary: {
    fontSize: 14,
    fontWeight: '800',
    color: '#16A36A',
  },
  locSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  mapNavBtn: {
    backgroundColor: '#16A36A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  mapNavBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  taskItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  actionsWrap: {
    gap: 10,
    marginTop: 4,
  },
  actionBtnPrimary: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  actionBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 8,
  },
  notFoundDesc: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  backBtnText: {
    color: '#10234D',
    fontWeight: '700',
  },
});
