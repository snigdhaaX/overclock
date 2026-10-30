import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock,
  Layers,
  Package,
  Sparkles,
  Warehouse,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EmptyState from '../../../features/operations-analyst/components/EmptyState';
import OperationsBottomNav from '../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../features/operations-analyst/components/OperationsHeader';
import SeverityBadge from '../../../features/operations-analyst/components/SeverityBadge';
import operationsService from '../../../features/operations-analyst/services/operationsService';
import { NotificationItem } from '../../../features/operations-analyst/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'critical'>('all');
  const [refreshKey, setRefreshKey] = useState(0);

  const notifications = operationsService.getNotifications(activeTab);
  const unreadCount = operationsService.getUnreadNotificationsCount();

  const handleMarkAllRead = () => {
    operationsService.markAllNotificationsAsRead();
    setRefreshKey((k) => k + 1);
  };

  const handleNotificationPress = (notif: NotificationItem) => {
    operationsService.markNotificationAsRead(notif.id);
    setRefreshKey((k) => k + 1);

    if (notif.relatedEntityType === 'disruption' && notif.relatedEntityId) {
      router.push(`/(protected)/operations-analyst/disruptions/${notif.relatedEntityId}`);
    } else if (notif.relatedEntityType === 'order' && notif.relatedEntityId) {
      router.push('/(protected)/operations-analyst/orders');
    } else if (notif.relatedEntityType === 'plan') {
      router.push('/(protected)/operations-analyst/recovery/recommendations');
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'disruption':
        return <AlertTriangle size={18} color="#DC2626" />;
      case 'inventory':
        return <Warehouse size={18} color="#D97706" />;
      case 'approval':
        return <Sparkles size={18} color="#2563EB" />;
      case 'supplier':
        return <AlertCircle size={18} color="#EA580C" />;
      case 'order':
        return <Package size={18} color="#7C3AED" />;
      default:
        return <Bell size={18} color="#64748B" />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Notifications"
        subtitle={`${unreadCount} unread operational telemetry alerts`}
        showBack
        onBack={() => router.back()}
        rightAction={
          unreadCount > 0 ? (
            <Pressable onPress={handleMarkAllRead} style={styles.markAllBtn}>
              <CheckCheck size={16} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.markAllText}>Mark Read</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('all')}
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('unread')}
          style={[styles.tabBtn, activeTab === 'unread' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'unread' && styles.tabTextActive]}>
            Unread ({unreadCount})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('critical')}
          style={[styles.tabBtn, activeTab === 'critical' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'critical' && styles.tabTextActive]}>
            Critical Alerts
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => handleNotificationPress(item)}
            style={({ pressed }) => [
              styles.card,
              !item.isRead && styles.cardUnread,
              pressed && styles.cardPressed,
            ]}
          >
            <View style={styles.leftCol}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: item.isRead ? '#F1F5F9' : '#EFF6FF' },
                ]}
              >
                {getNotificationIcon(item.type)}
              </View>
            </View>

            <View style={styles.contentCol}>
              <View style={styles.headerRow}>
                <Text
                  style={[styles.title, !item.isRead && styles.titleUnread]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <SeverityBadge severity={item.severity} size="sm" />
              </View>

              <Text style={styles.description}>{item.description}</Text>

              <View style={styles.footerRow}>
                <View style={styles.timeRow}>
                  <Clock size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                  <Text style={styles.timeText}>{item.timestamp}</Text>
                </View>

                {!item.isRead && (
                  <View style={styles.unreadPill}>
                    <View style={styles.unreadDot} />
                    <Text style={styles.unreadText}>New</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.arrowCol}>
              <ChevronRight size={16} color="#CBD5E1" />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <EmptyState
            title="All Caught Up"
            description="You have no notifications in this category."
          />
        }
      />

      <OperationsBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'flex-start',
  },
  cardUnread: {
    borderColor: '#BFDBFE',
    backgroundColor: '#FAFCFF',
  },
  cardPressed: {
    opacity: 0.85,
  },
  leftCol: {
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentCol: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10234D',
    flex: 1,
    marginRight: 8,
  },
  titleUnread: {
    fontWeight: '800',
    color: '#10234D',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  unreadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unreadDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#2563EB',
    marginRight: 4,
  },
  unreadText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
  arrowCol: {
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 6,
  },
});
