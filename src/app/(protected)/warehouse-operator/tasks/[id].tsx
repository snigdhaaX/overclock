import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Boxes,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Package,
  QrCode,
  ShieldAlert,
  Truck,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BarcodeScannerModal } from '../../../../features/warehouse-operator/components/BarcodeScannerModal';
import warehouseService from '../../../../features/warehouse-operator/services/warehouseService';
import { WarehouseProduct, WarehouseTask } from '../../../../features/warehouse-operator/types';

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<WarehouseTask | undefined>(
    warehouseService.getTaskById(id || '')
  );
  const [product, setProduct] = useState<WarehouseProduct | undefined>(
    task ? warehouseService.getProductBySku(task.productSku) : undefined
  );
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    const update = () => {
      const refreshedTask = warehouseService.getTaskById(id || '');
      setTask(refreshedTask);
      if (refreshedTask) {
        setProduct(warehouseService.getProductBySku(refreshedTask.productSku));
      }
    };
    return warehouseService.subscribe(update);
  }, [id]);

  if (!task) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Task Not Found</Text>
          <Text style={styles.notFoundText}>No warehouse task matches ID: {id}</Text>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Back to Tasks</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const completedSteps = task.steps ? task.steps.filter((s) => s.completed).length : 0;
  const totalSteps = task.steps ? task.steps.length : 0;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const handleToggleStep = (stepId: string) => {
    warehouseService.completeTaskStep(task.id, stepId);
  };

  const handleCompleteTask = () => {
    warehouseService.updateTaskStatus(task.id, 'completed', task.quantity);
    Alert.alert('Task Completed', `${task.title} has been logged as completed in the WMS ledger.`);
  };

  const handleStartTask = () => {
    warehouseService.updateTaskStatus(task.id, 'in_progress');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#10234D" />
        </Pressable>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerId}>{task.id}</Text>
          <Text style={styles.headerSub}>Warehouse Operation Task</Text>
        </View>
        <View
          style={[
            styles.priorityPill,
            task.priority === 'Urgent'
              ? styles.priorityUrgent
              : task.priority === 'High'
              ? styles.priorityHigh
              : styles.priorityNormal,
          ]}
        >
          <Text
            style={[
              styles.priorityPillText,
              task.priority === 'Urgent'
                ? styles.priorityUrgentText
                : task.priority === 'High'
                ? styles.priorityHighText
                : styles.priorityNormalText,
            ]}
          >
            {task.priority.toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Task Title & Status */}
        <View style={styles.mainInfoCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusBadge,
                task.status === 'completed'
                  ? styles.statusCompleted
                  : task.status === 'in_progress'
                  ? styles.statusInProgress
                  : styles.statusPending,
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  task.status === 'completed'
                    ? styles.statusCompletedText
                    : task.status === 'in_progress'
                    ? styles.statusInProgressText
                    : styles.statusPendingText,
                ]}
              >
                {task.status.replace('_', ' ').toUpperCase()}
              </Text>
            </View>

            <View style={styles.dueBadge}>
              <Clock size={13} color="#D97706" />
              <Text style={styles.dueBadgeText}>Due: {task.dueDate}</Text>
            </View>
          </View>

          <Text style={styles.taskTitle}>{task.title}</Text>

          {task.notes && (
            <View style={styles.notesBox}>
              <AlertCircle size={14} color="#2563EB" />
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          )}
        </View>

        {/* Product Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Required Product & SKU</Text>
            {product && (
              <Pressable
                onPress={() => router.push(`/(protected)/warehouse-operator/product/${product.sku}` as any)}
              >
                <Text style={styles.viewProductLink}>View SKU</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.productBlock}>
            <View style={styles.productIconBox}>
              <Package size={24} color="#16A36A" />
            </View>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{task.productName}</Text>
              <Text style={styles.productSku}>{task.productSku}</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{task.quantity}</Text>
              <Text style={styles.metricLabel}>Required Units</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{task.completedQuantity || 0}</Text>
              <Text style={styles.metricLabel}>Completed Units</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{product ? product.availableQuantity : '—'}</Text>
              <Text style={styles.metricLabel}>Stock Available</Text>
            </View>
          </View>

          <View style={styles.locationStrip}>
            <MapPin size={15} color="#16A36A" />
            <Text style={styles.locationStripText}>{task.warehouseLocation}</Text>
            <Pressable
              style={styles.mapShortcut}
              onPress={() => router.push('/(protected)/warehouse-operator/warehouse-map' as any)}
            >
              <Text style={styles.mapShortcutText}>Floor Map</Text>
              <ExternalLink size={12} color="#16A36A" />
            </Pressable>
          </View>
        </View>

        {/* Step-by-Step Execution Checklist */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardSectionTitle}>Execution Checklist</Text>
            <Text style={styles.checklistSummary}>
              {completedSteps}/{totalSteps} completed
            </Text>
          </View>

          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${progressPercent}%`,
                  backgroundColor: progressPercent === 100 ? '#16A36A' : '#2563EB',
                },
              ]}
            />
          </View>

          {task.steps?.map((step, idx) => (
            <Pressable
              key={step.id}
              style={[styles.stepRow, step.completed && styles.stepRowCompleted]}
              onPress={() => handleToggleStep(step.id)}
            >
              <View style={[styles.stepCheckbox, step.completed && styles.stepCheckboxActive]}>
                {step.completed && <Check size={14} color="#FFFFFF" />}
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepNumber, step.completed && styles.stepTextStrikethrough]}>
                  Step {idx + 1}
                </Text>
                <Text style={[styles.stepLabel, step.completed && styles.stepTextStrikethrough]}>
                  {step.label}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        {/* Action Controls */}
        <View style={styles.actionSection}>
          <Pressable style={styles.scanBtn} onPress={() => setShowScanner(true)}>
            <QrCode size={18} color="#FFFFFF" />
            <Text style={styles.scanBtnText}>Scan SKU Barcode</Text>
          </Pressable>

          {task.status !== 'completed' ? (
            <Pressable
              style={[
                styles.primaryActionBtn,
                task.status === 'pending' && styles.startActionBtn,
              ]}
              onPress={task.status === 'pending' ? handleStartTask : handleCompleteTask}
            >
              <CheckCircle2 size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionText}>
                {task.status === 'pending' ? 'Start Task' : 'Confirm Task Completion'}
              </Text>
            </Pressable>
          ) : (
            <View style={styles.completedNotice}>
              <CheckCircle2 size={18} color="#16A36A" />
              <Text style={styles.completedNoticeText}>
                Task completed at {task.completedAt || 'earlier today'}
              </Text>
            </View>
          )}

          {/* Secondary Quick Links */}
          <View style={styles.secondaryLinksRow}>
            <Pressable
              style={styles.secondaryLinkBtn}
              onPress={() => router.push('/(protected)/warehouse-operator/damage-report' as any)}
            >
              <ShieldAlert size={15} color="#DC4545" />
              <Text style={[styles.secondaryLinkText, { color: '#DC4545' }]}>Report Damage</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryLinkBtn}
              onPress={() => router.push('/(protected)/warehouse-operator/stock-transfer' as any)}
            >
              <Boxes size={15} color="#0D9488" />
              <Text style={[styles.secondaryLinkText, { color: '#0D9488' }]}>Transfer Stock</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        visible={showScanner}
        onClose={() => setShowScanner(false)}
        onProductScanned={(scannedProd) => {
          if (scannedProd.sku.toLowerCase() === task.productSku.toLowerCase()) {
            Alert.alert('Barcode Verified!', `Matches expected SKU: ${task.productSku}`);
          } else {
            Alert.alert(
              'SKU Mismatch Warning',
              `Scanned ${scannedProd.sku}, but task expects ${task.productSku}!`
            );
          }
        }}
      />
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
  backButton: {
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
  headerId: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  headerSub: {
    fontSize: 11,
    color: '#64748B',
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityUrgent: {
    backgroundColor: '#FEE2E2',
  },
  priorityHigh: {
    backgroundColor: '#FEF3C7',
  },
  priorityNormal: {
    backgroundColor: '#F1F5F9',
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  priorityUrgentText: {
    color: '#DC4545',
  },
  priorityHighText: {
    color: '#D97706',
  },
  priorityNormalText: {
    color: '#475569',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  mainInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusCompleted: {
    backgroundColor: '#DCFCE7',
  },
  statusInProgress: {
    backgroundColor: '#EFF6FF',
  },
  statusPending: {
    backgroundColor: '#F1F5F9',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusCompletedText: {
    color: '#16A36A',
  },
  statusInProgressText: {
    color: '#2563EB',
  },
  statusPendingText: {
    color: '#475569',
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 8,
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#1E40AF',
    lineHeight: 17,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  viewProductLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
  productBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  productIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  productSku: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  locationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    gap: 8,
  },
  locationStripText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#16A36A',
  },
  mapShortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapShortcutText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  checklistSummary: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 14,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 12,
  },
  stepRowCompleted: {
    opacity: 0.7,
  },
  stepCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCheckboxActive: {
    backgroundColor: '#16A36A',
    borderColor: '#16A36A',
  },
  stepContent: {
    flex: 1,
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  stepLabel: {
    fontSize: 13,
    color: '#10234D',
    fontWeight: '500',
    marginTop: 1,
  },
  stepTextStrikethrough: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  actionSection: {
    gap: 10,
    marginTop: 4,
  },
  scanBtn: {
    backgroundColor: '#10234D',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  scanBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  primaryActionBtn: {
    backgroundColor: '#16A36A',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startActionBtn: {
    backgroundColor: '#2563EB',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  completedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 12,
  },
  completedNoticeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A36A',
  },
  secondaryLinksRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryLinkBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryLinkText: {
    fontSize: 12,
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
  notFoundText: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#16A36A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
