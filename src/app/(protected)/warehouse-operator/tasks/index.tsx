import { useRouter } from 'expo-router';
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Filter,
  Layers,
  MapPin,
  Package,
  QrCode,
  Search,
  Truck,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WarehouseBottomNav } from '../../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../../features/warehouse-operator/services/warehouseService';
import { TaskPriority, TaskStatus, WarehouseTask } from '../../../../features/warehouse-operator/types';

export default function MyTasksScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<WarehouseTask[]>(warehouseService.getWarehouseTasks());
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const update = () => {
      setTasks(warehouseService.getWarehouseTasks());
    };
    return warehouseService.subscribe(update);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTasks(warehouseService.getWarehouseTasks());
    setTimeout(() => setRefreshing(false), 500);
  };

  const filteredTasks = tasks.filter((t) => {
    if (selectedStatus !== 'all' && t.status !== selectedStatus) return false;
    if (selectedPriority !== 'all' && t.priority !== selectedPriority) return false;
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchId = t.id.toLowerCase().includes(q);
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchSku = t.productSku.toLowerCase().includes(q);
      const matchOrder = t.orderId ? t.orderId.toLowerCase().includes(q) : false;
      const matchShip = t.shipmentId ? t.shipmentId.toLowerCase().includes(q) : false;
      return matchId || matchTitle || matchSku || matchOrder || matchShip;
    }
    return true;
  });

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'pick_pack':
        return <Package size={14} color="#16A36A" />;
      case 'receive':
        return <Truck size={14} color="#2563EB" />;
      case 'transfer':
        return <Boxes size={14} color="#0D9488" />;
      case 'inspection':
        return <CheckCircle2 size={14} color="#DC4545" />;
      default:
        return <Layers size={14} color="#64748B" />;
    }
  };

  const pendingCount = tasks.filter((t) => t.status === 'pending').length;
  const inProgressCount = tasks.filter((t) => t.status === 'in_progress').length;
  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="My Shift Tasks"
        subtitle="Assigned Operations · Mumbai Hub WH-MUM"
      />

      <View style={styles.topControls}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Task ID, SKU, Order, or Cargo..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color="#64748B" />
            </Pressable>
          )}
        </View>

        {/* Status Filter Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusTabsScroll}>
          <Pressable
            style={[styles.statusTab, selectedStatus === 'all' && styles.statusTabActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.statusTabText, selectedStatus === 'all' && styles.statusTabTextActive]}>
              All ({tasks.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statusTab, selectedStatus === 'pending' && styles.statusTabActive]}
            onPress={() => setSelectedStatus('pending')}
          >
            <Text style={[styles.statusTabText, selectedStatus === 'pending' && styles.statusTabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statusTab, selectedStatus === 'in_progress' && styles.statusTabActive]}
            onPress={() => setSelectedStatus('in_progress')}
          >
            <Text style={[styles.statusTabText, selectedStatus === 'in_progress' && styles.statusTabTextActive]}>
              In Progress ({inProgressCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.statusTab, selectedStatus === 'completed' && styles.statusTabActive]}
            onPress={() => setSelectedStatus('completed')}
          >
            <Text style={[styles.statusTabText, selectedStatus === 'completed' && styles.statusTabTextActive]}>
              Completed ({completedCount})
            </Text>
          </Pressable>
        </ScrollView>

        {/* Priority Filter Chips */}
        <View style={styles.priorityRow}>
          <Text style={styles.filterPrefix}>Priority:</Text>
          {(['all', 'Urgent', 'High', 'Medium', 'Low'] as const).map((p) => (
            <Pressable
              key={p}
              style={[styles.priorityChip, selectedPriority === p && styles.priorityChipActive]}
              onPress={() => setSelectedPriority(p)}
            >
              <Text
                style={[
                  styles.priorityChipText,
                  selectedPriority === p && styles.priorityChipTextActive,
                ]}
              >
                {p === 'all' ? 'All' : p}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.taskList}
        contentContainerStyle={styles.taskListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A36A']} />}
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Package size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching tasks</Text>
            <Text style={styles.emptySubtitle}>Try adjusting your search query or filter chips</Text>
          </View>
        ) : (
          filteredTasks.map((task) => {
            const completedSteps = task.steps ? task.steps.filter((s) => s.completed).length : 0;
            const totalSteps = task.steps ? task.steps.length : 0;

            return (
              <Pressable
                key={task.id}
                style={styles.taskCard}
                onPress={() => router.push(`/(protected)/warehouse-operator/tasks/${task.id}` as any)}
              >
                <View style={styles.taskCardTop}>
                  <View style={styles.taskIdBlock}>
                    <Text style={styles.taskId}>{task.id}</Text>
                    <View style={styles.typeBadge}>
                      {getTaskTypeIcon(task.type)}
                      <Text style={styles.typeBadgeText}>
                        {task.type.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
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

                <Text style={styles.taskTitle}>{task.title}</Text>

                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <Package size={13} color="#64748B" />
                    <Text style={styles.detailText}>
                      {task.productSku} · <Text style={{ fontWeight: '700' }}>{task.quantity}</Text> units
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MapPin size={13} color="#64748B" />
                    <Text style={styles.detailText}>{task.warehouseLocation}</Text>
                  </View>
                </View>

                {task.steps && totalSteps > 0 && (
                  <View style={styles.stepsBarWrapper}>
                    <View style={styles.stepsHeader}>
                      <Text style={styles.stepsLabel}>Checklist Progress</Text>
                      <Text style={styles.stepsCount}>
                        {completedSteps}/{totalSteps} steps completed
                      </Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${(completedSteps / totalSteps) * 100}%`,
                            backgroundColor: completedSteps === totalSteps ? '#16A36A' : '#2563EB',
                          },
                        ]}
                      />
                    </View>
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.dueTimeBlock}>
                    <Clock size={12} color="#D97706" />
                    <Text style={styles.dueTimeText}>Due: {task.dueDate}</Text>
                  </View>

                  <View style={styles.cardActionRow}>
                    <Text style={styles.cardActionText}>
                      {task.status === 'completed' ? 'View Summary' : 'Open Details'}
                    </Text>
                    <ArrowRight size={13} color="#16A36A" />
                  </View>
                </View>
              </Pressable>
            );
          })
        )}

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
  topControls: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  statusTabsScroll: {
    marginBottom: 8,
  },
  statusTab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  statusTabActive: {
    backgroundColor: '#10234D',
  },
  statusTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  statusTabTextActive: {
    color: '#FFFFFF',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterPrefix: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    marginRight: 2,
  },
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#16A36A',
  },
  priorityChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  priorityChipTextActive: {
    color: '#16A36A',
    fontWeight: '700',
  },
  taskList: {
    flex: 1,
  },
  taskListContent: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  taskCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskIdBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  priorityPill: {
    paddingHorizontal: 7,
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
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 10,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748B',
  },
  stepsBarWrapper: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  stepsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  stepsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  stepsCount: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dueTimeBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dueTimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#D97706',
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A36A',
  },
  emptyContainer: {
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
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
