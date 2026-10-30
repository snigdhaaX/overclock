import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowRightLeft,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  MapPin,
  Package,
  QrCode,
  ShieldAlert,
  TrendingUp,
  Truck,
  User,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { WarehouseKpis, WarehouseTask } from '../../../features/warehouse-operator/types';

export default function WarehouseHomeScreen() {
  const router = useRouter();
  const [kpis, setKpis] = useState<WarehouseKpis>(warehouseService.getWarehouseKpis());
  const [tasks, setTasks] = useState<WarehouseTask[]>(warehouseService.getWarehouseTasks());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const update = () => {
      setKpis(warehouseService.getWarehouseKpis());
      setTasks(warehouseService.getWarehouseTasks());
    };
    return warehouseService.subscribe(update);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setKpis(warehouseService.getWarehouseKpis());
    setTasks(warehouseService.getWarehouseTasks());
    setTimeout(() => setRefreshing(false), 600);
  };

  const urgentTasks = tasks.filter((t) => t.status !== 'completed').slice(0, 3);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Warehouse Control"
        subtitle="Mumbai Central Hub (WH-MUM) · Operational Telemetry"
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A36A']} />}
      >
        {/* Operator Shift Header Card */}
        <View style={styles.shiftCard}>
          <View style={styles.shiftCardLeft}>
            <View style={styles.avatarCircle}>
              <User size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.operatorName}>Rohit Verma</Text>
              <Text style={styles.shiftDetail}>Shift A (06:00 - 14:30) · Dock Bay 02</Text>
            </View>
          </View>
          <View style={styles.shiftBadge}>
            <Clock size={12} color="#16A36A" />
            <Text style={styles.shiftBadgeText}>On Duty</Text>
          </View>
        </View>

        {/* Priority SLA Disruption Alert Banner */}
        <Pressable
          style={styles.alertBanner}
          onPress={() => router.push('/(protected)/warehouse-operator/tasks/TSK-101' as any)}
        >
          <View style={styles.alertBannerHeader}>
            <View style={styles.alertIconPill}>
              <Flame size={14} color="#DC4545" />
              <Text style={styles.alertIconText}>CRITICAL DISRUPTION</Text>
            </View>
            <Text style={styles.alertTime}>SLA: 11:30 AM</Text>
          </View>
          <Text style={styles.alertTitle}>Pick & Stage ORD-445 (80 Units)</Text>
          <Text style={styles.alertDesc}>
            Singapore port berth backlog. Emergency inventory pull required from Aisle B3 to protect EduTech SLA.
          </Text>
          <View style={styles.alertFooter}>
            <Text style={styles.alertActionText}>Open Task Execution</Text>
            <ArrowRight size={14} color="#DC4545" />
          </View>
        </Pressable>

        {/* Warehouse KPIs Strip */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Warehouse Key Metrics</Text>
          <Text style={styles.sectionSubtext}>Live Inventory</Text>
        </View>

        <View style={styles.kpiGrid}>
          {/* 1. Available */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Boxes size={18} color="#16A36A" />
            </View>
            <Text style={styles.kpiValue}>{kpis.availableUnits.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Available Units</Text>
            <Text style={[styles.kpiChange, { color: '#16A36A' }]}>Active Stock</Text>
          </View>

          {/* 2. Incoming */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <ArrowDownToLine size={18} color="#2563EB" />
            </View>
            <Text style={styles.kpiValue}>{kpis.incomingUnits.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Incoming Consignments</Text>
            <Text style={[styles.kpiChange, { color: '#2563EB' }]}>Dock Scheduled</Text>
          </View>

          {/* 3. Outgoing */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FAF5FF' }]}>
              <ArrowUpFromLine size={18} color="#9333EA" />
            </View>
            <Text style={styles.kpiValue}>{kpis.outgoingUnits.toLocaleString()}</Text>
            <Text style={styles.kpiLabel}>Ready for Dispatch</Text>
            <Text style={[styles.kpiChange, { color: '#9333EA' }]}>4 Orders</Text>
          </View>

          {/* 4. Capacity */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FFFBEB' }]}>
              <Layers size={18} color="#D97706" />
            </View>
            <Text style={styles.kpiValue}>{kpis.capacityUsedPercent}%</Text>
            <Text style={styles.kpiLabel}>Storage Capacity</Text>
            <Text style={[styles.kpiChange, { color: '#D97706' }]}>High Utilization</Text>
          </View>
        </View>

        {/* Quick Actions Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Quick Operations</Text>
          <Text style={styles.sectionSubtext}>Direct Station Entry</Text>
        </View>

        <View style={styles.quickGrid}>
          <Pressable
            style={styles.quickCard}
            onPress={() => router.push('/(protected)/warehouse-operator/scan' as any)}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#F0FDF4' }]}>
              <QrCode size={22} color="#16A36A" />
            </View>
            <Text style={styles.quickCardTitle}>Scan Barcode</Text>
            <Text style={styles.quickCardSub}>Lookup SKU & Bin</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() => router.push('/(protected)/warehouse-operator/receiving' as any)}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Truck size={22} color="#2563EB" />
            </View>
            <Text style={styles.quickCardTitle}>Goods Receipt</Text>
            <Text style={styles.quickCardSub}>Dock Cargo Inbound</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() => router.push('/(protected)/warehouse-operator/damage-report' as any)}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#FEF2F2' }]}>
              <ShieldAlert size={22} color="#DC4545" />
            </View>
            <Text style={styles.quickCardTitle}>Report Damage</Text>
            <Text style={styles.quickCardSub}>Quarantine & Photos</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() => router.push('/(protected)/warehouse-operator/stock-transfer' as any)}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#F0FDFA' }]}>
              <ArrowRightLeft size={22} color="#0D9488" />
            </View>
            <Text style={styles.quickCardTitle}>Stock Transfer</Text>
            <Text style={styles.quickCardSub}>Inter-Depot Move</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() => router.push('/(protected)/warehouse-operator/warehouse-map' as any)}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#FFF1F2' }]}>
              <MapPin size={22} color="#E11D48" />
            </View>
            <Text style={styles.quickCardTitle}>Floor Map</Text>
            <Text style={styles.quickCardSub}>Aisles & Bins</Text>
          </Pressable>

          <Pressable
            style={styles.quickCard}
            onPress={() => router.push('/(protected)/warehouse-operator/inventory' as any)}
          >
            <View style={[styles.quickIconCircle, { backgroundColor: '#FAF5FF' }]}>
              <Boxes size={22} color="#7C3AED" />
            </View>
            <Text style={styles.quickCardTitle}>Inventory</Text>
            <Text style={styles.quickCardSub}>Search All SKUs</Text>
          </Pressable>
        </View>

        {/* Today's Tasks Priority Section */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Assigned Shift Tasks</Text>
            <Text style={styles.sectionSubtext}>
              {completedCount} of {tasks.length} tasks completed today
            </Text>
          </View>
          <Pressable onPress={() => router.push('/(protected)/warehouse-operator/tasks' as any)}>
            <Text style={styles.viewAllText}>View All ({tasks.length})</Text>
          </Pressable>
        </View>

        {urgentTasks.map((task) => (
          <Pressable
            key={task.id}
            style={styles.taskCard}
            onPress={() => router.push(`/(protected)/warehouse-operator/tasks/${task.id}` as any)}
          >
            <View style={styles.taskCardHeader}>
              <View style={styles.taskIdRow}>
                <Text style={styles.taskId}>{task.id}</Text>
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

              <View style={styles.taskStatusPill}>
                <Text style={styles.taskStatusText}>{task.status.replace('_', ' ').toUpperCase()}</Text>
              </View>
            </View>

            <Text style={styles.taskTitle}>{task.title}</Text>

            <View style={styles.taskMetaRow}>
              <View style={styles.taskMetaItem}>
                <Package size={13} color="#64748B" />
                <Text style={styles.taskMetaText}>
                  {task.productSku} · {task.quantity} units
                </Text>
              </View>
              <View style={styles.taskMetaItem}>
                <MapPin size={13} color="#64748B" />
                <Text style={styles.taskMetaText}>{task.warehouseLocation}</Text>
              </View>
            </View>

            <View style={styles.taskFooter}>
              <View style={styles.dueDateBadge}>
                <Clock size={12} color="#D97706" />
                <Text style={styles.dueDateText}>Due: {task.dueDate}</Text>
              </View>
              <View style={styles.actionPrompt}>
                <Text style={styles.actionPromptText}>Start Task</Text>
                <ArrowRight size={13} color="#16A36A" />
              </View>
            </View>
          </Pressable>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

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
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 12,
  },
  shiftCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#10234D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  operatorName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  shiftDetail: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  shiftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  shiftBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  alertBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  alertBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  alertIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  alertIconText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC4545',
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC4545',
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#991B1B',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    lineHeight: 17,
    marginBottom: 10,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'flex-end',
  },
  alertActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC4545',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  sectionSubtext: {
    fontSize: 12,
    color: '#64748B',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#16A36A',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  kpiIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  kpiValue: {
    fontSize: 19,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  kpiChange: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  quickIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    textAlign: 'center',
  },
  quickCardSub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 10,
  },
  taskCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  taskIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskId: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  priorityPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
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
    fontSize: 9,
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
  taskStatusPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  taskStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 8,
  },
  taskMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 10,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  taskMetaText: {
    fontSize: 11,
    color: '#64748B',
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueDateText: {
    fontSize: 11,
    color: '#D97706',
    fontWeight: '600',
  },
  actionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionPromptText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
});
