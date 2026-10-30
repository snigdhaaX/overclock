import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Boxes,
  CheckCheck,
  CheckCircle2,
  Package,
  ShieldAlert,
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
  View,
} from 'react-native';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { WarehouseNotification } from '../../../features/warehouse-operator/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [notifications, setNotifications] = useState<WarehouseNotification[]>(
    warehouseService.getNotifications(filter)
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const update = () => {
      setNotifications(warehouseService.getNotifications(filter));
    };
    return warehouseService.subscribe(update);
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    setNotifications(warehouseService.getNotifications(filter));
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleMarkAllRead = () => {
    warehouseService.markAllNotificationsRead();
  };

  const handlePressNotification = (notif: WarehouseNotification) => {
    warehouseService.markNotificationRead(notif.id);

    if (notif.relatedEntityType === 'task' && notif.relatedEntityId) {
      router.push(`/(protected)/warehouse-operator/tasks/${notif.relatedEntityId}` as any);
    } else if (notif.relatedEntityType === 'shipment') {
      router.push('/(protected)/warehouse-operator/incoming-shipments' as any);
    } else if (notif.relatedEntityType === 'product' && notif.relatedEntityId) {
      router.push(`/(protected)/warehouse-operator/product/${notif.relatedEntityId}` as any);
    } else if (notif.relatedEntityType === 'transfer') {
      router.push('/(protected)/warehouse-operator/stock-transfer' as any);
    }
  };

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'damage_reported':
      case 'discrepancy':
        return <ShieldAlert size={16} color="#DC4545" />;
      case 'shipment_arrived':
        return <Truck size={16} color="#2563EB" />;
      case 'low_stock':
        return <AlertTriangle size={16} color="#D97706" />;
      case 'task_assigned':
      default:
        return <Package size={16} color="#16A36A" />;
    }
  };

  const unreadCount = warehouseService.getNotifications('unread').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Warehouse Alerts"
        subtitle="Real-Time Cargo & Disruption Notifications"
      />

      <View style={styles.container}>
        {/* Top Controls Strip */}
        <View style={styles.topStrip}>
          <View style={styles.tabsRow}>
            {(['all', 'unread', 'critical'] as const).map((t) => (
              <Pressable
                key={t}
                style={[styles.tabBtn, filter === t && styles.tabBtnActive]}
                onPress={() => setFilter(t)}
              >
                <Text
                  style={[styles.tabBtnText, filter === t && styles.tabBtnTextActive]}
                >
                  {t === 'all'
                    ? 'All'
                    : t === 'unread'
                    ? `Unread (${unreadCount})`
                    : 'Critical'}
                </Text>
              </Pressable>
            ))}
          </View>

          {unreadCount > 0 && (
            <Pressable style={styles.markAllBtn} onPress={handleMarkAllRead}>
              <CheckCheck size={14} color="#16A36A" />
              <Text style={styles.markAllBtnText}>Mark Read</Text>
            </Pressable>
          )}
        </View>

        {/* Notifications List */}
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#16A36A']} />}
        >
          {notifications.length === 0 ? (
            <View style={styles.emptyBox}>
              <Bell size={40} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySub}>All operational alerts have been cleared.</Text>
            </View>
          ) : (
            notifications.map((n) => (
              <Pressable
                key={n.id}
                style={[styles.notifCard, !n.isRead && styles.notifCardUnread]}
                onPress={() => handlePressNotification(n)}
              >
                <View style={styles.notifLeft}>
                  <View
                    style={[
                      styles.iconCircle,
                      n.priority === 'Critical' || n.priority === 'High'
                        ? styles.iconCircleAlert
                        : styles.iconCircleNormal,
                    ]}
                  >
                    {getNotifIcon(n.type)}
                  </View>
                </View>

                <View style={styles.notifBody}>
                  <View style={styles.notifTitleRow}>
                    <Text style={[styles.notifTitle, !n.isRead && styles.notifTitleUnread]}>
                      {n.title}
                    </Text>
                    {!n.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.notifDesc}>{n.description}</Text>

                  <View style={styles.notifFooter}>
                    <Text style={styles.notifTime}>{n.timestamp}</Text>
                    <View
                      style={[
                        styles.priorityTag,
                        n.priority === 'Critical'
                          ? styles.priorityCritical
                          : n.priority === 'High'
                          ? styles.priorityHigh
                          : styles.priorityNormal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityTagText,
                          n.priority === 'Critical'
                            ? styles.priorityCriticalText
                            : n.priority === 'High'
                            ? styles.priorityHighText
                            : styles.priorityNormalText,
                        ]}
                      >
                        {n.priority}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            ))
          )}

          <View style={{ height: 100 }} />
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
  topStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#10234D',
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notifCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    gap: 12,
  },
  notifCardUnread: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  notifLeft: {
    paddingTop: 2,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleAlert: {
    backgroundColor: '#FEE2E2',
  },
  iconCircleNormal: {
    backgroundColor: '#F1F5F9',
  },
  notifBody: {
    flex: 1,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
    flex: 1,
  },
  notifTitleUnread: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A36A',
    marginLeft: 6,
  },
  notifDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  notifFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  notifTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  priorityTag: {
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
  priorityNormal: {
    backgroundColor: '#F1F5F9',
  },
  priorityTagText: {
    fontSize: 9,
    fontWeight: '800',
  },
  priorityCriticalText: {
    color: '#DC4545',
  },
  priorityHighText: {
    color: '#D97706',
  },
  priorityNormalText: {
    color: '#475569',
  },
  emptyBox: {
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
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});
