import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Building,
  Check,
  CheckCheck,
  ChevronRight,
  FileCheck,
  FileText,
  ShieldAlert,
  Tag,
  User,
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
import { ProcurementBottomNav } from '../../../features/procurement-approver/components/ProcurementBottomNav';
import { ProcurementHeader } from '../../../features/procurement-approver/components/ProcurementHeader';
import { procurementService } from '../../../features/procurement-approver/services/procurementService';
import { ProcurementNotification } from '../../../features/procurement-approver/types';

export default function ProcurementNotificationsScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [, setDataVersion] = useState(0);

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const notifications = procurementService.getNotifications(filter);

  const handleMarkAllRead = () => {
    procurementService.markAllNotificationsRead();
  };

  const handleSelectNotif = (notif: ProcurementNotification) => {
    procurementService.markNotificationRead(notif.id);

    // Deep link based on entity type
    if (notif.relatedEntityType === 'request') {
      router.push(
        `/(protected)/procurement-approver/requests/${notif.relatedEntityId}` as any
      );
    } else if (notif.relatedEntityType === 'supplier') {
      router.push(
        `/(protected)/procurement-approver/suppliers/${notif.relatedEntityId}` as any
      );
    } else if (notif.relatedEntityType === 'purchase_order') {
      router.push('/(protected)/procurement-approver/purchase-orders' as any);
    }
  };

  const getNotifIcon = (type: ProcurementNotification['type']) => {
    switch (type) {
      case 'approval_required':
      case 'new_request':
        return <FileCheck size={18} color="#8B5CF6" />;
      case 'risk_alert':
        return <AlertTriangle size={18} color="#DC2626" />;
      case 'price_alert':
        return <Tag size={18} color="#2563EB" />;
      case 'po_created':
        return <FileText size={18} color="#15803D" />;
      case 'qualification_update':
        return <Building size={18} color="#D97706" />;
      default:
        return <Bell size={18} color="#64748B" />;
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Notifications & Alerts"
        subtitle="Live Procurement & Risk Broadcasts"
        showBack
        onBack={() => router.back()}
      />

      {/* Action Bar & Tabs */}
      <View style={styles.topBar}>
        <View style={styles.tabsRow}>
          <Pressable
            style={[styles.tab, filter === 'all' && styles.tabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.tabText, filter === 'all' && styles.tabTextActive]}>
              All
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, filter === 'unread' && styles.tabActive]}
            onPress={() => setFilter('unread')}
          >
            <Text
              style={[styles.tabText, filter === 'unread' && styles.tabTextActive]}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, filter === 'critical' && styles.tabActive]}
            onPress={() => setFilter('critical')}
          >
            <Text
              style={[styles.tabText, filter === 'critical' && styles.tabTextActive]}
            >
              Critical
            </Text>
          </Pressable>
        </View>

        {unreadCount > 0 && (
          <Pressable style={styles.markAllBtn} onPress={handleMarkAllRead}>
            <CheckCheck size={14} color="#8B5CF6" />
            <Text style={styles.markAllText}>Mark all read</Text>
          </Pressable>
        )}
      </View>

      {/* Notifications List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Bell size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You have no active notifications under the &quot;{filter}&quot; filter.
            </Text>
          </View>
        ) : (
          notifications.map((notif) => (
            <Pressable
              key={notif.id}
              style={[styles.notifCard, !notif.isRead && styles.notifCardUnread]}
              onPress={() => handleSelectNotif(notif)}
            >
              <View style={styles.iconBox}>{getNotifIcon(notif.type)}</View>

              <View style={styles.notifBody}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.notifTitle,
                      !notif.isRead && styles.notifTitleBold,
                    ]}
                  >
                    {notif.title}
                  </Text>
                  {!notif.isRead && <View style={styles.unreadDot} />}
                </View>

                <Text style={styles.notifDesc} numberOfLines={2}>
                  {notif.description}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.timestampText}>{notif.timestamp}</Text>
                  <View style={styles.entityPill}>
                    <Text style={styles.entityText}>
                      {notif.relatedEntityId}
                    </Text>
                  </View>
                </View>
              </View>

              <ChevronRight size={16} color="#CBD5E1" />
            </Pressable>
          ))
        )}
      </ScrollView>

      <ProcurementBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 95,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
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
    textAlign: 'center',
    marginTop: 6,
  },
  notifCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  notifCardUnread: {
    borderColor: '#DDD6FE',
    backgroundColor: '#FAFAFF',
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  notifBody: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10234D',
    flex: 1,
  },
  notifTitleBold: {
    fontWeight: '800',
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
    marginLeft: 6,
  },
  notifDesc: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 15,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timestampText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  entityPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  entityText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
});
