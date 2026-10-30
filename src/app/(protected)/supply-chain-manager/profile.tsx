import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  ChevronRight,
  FileCheck,
  Globe,
  HelpCircle,
  Info,
  Key,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ManagerBottomNav from '../../../features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '../../../features/supply-chain-manager/components/ManagerHeader';
import operationsService from '@/features/operations-analyst/services/operationsService';
import useAuth from '../../../hooks/useAuth';
import useSyncVersion from '@/hooks/useSyncVersion';

interface NotificationItem {
  id: string;
  type: 'approval' | 'disruption' | 'recovery';
  title: string;
  description: string;
  timestamp: string;
  isRead: boolean;
  priority: 'critical' | 'high' | 'normal';
  targetRoute: string;
}

export default function ProfileAndNotificationsScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const syncVersion = useSyncVersion();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications'>('profile');
  const [selectedNotifFilter, setSelectedNotifFilter] = useState<string>('all');

  const rawNotifs = operationsService.getNotifications();
  const notifications: NotificationItem[] = rawNotifs.map((n) => {
    let targetRoute = '/(protected)/supply-chain-manager/home';
    if (n.type === 'approval') {
      targetRoute = n.relatedEntityId
        ? `/(protected)/supply-chain-manager/approvals/${n.relatedEntityId}`
        : '/(protected)/supply-chain-manager/approvals';
    } else if (n.type === 'disruption') {
      targetRoute = n.relatedEntityId
        ? `/(protected)/supply-chain-manager/disruptions/${n.relatedEntityId}`
        : '/(protected)/supply-chain-manager/disruptions';
    } else {
      targetRoute = n.relatedEntityId
        ? `/(protected)/supply-chain-manager/recovery/${n.relatedEntityId}`
        : '/(protected)/supply-chain-manager/recovery';
    }

    const notifType: 'approval' | 'disruption' | 'recovery' =
      n.type === 'approval' || n.type === 'disruption' ? n.type : 'recovery';

    return {
      id: n.id,
      type: notifType,
      title: n.title,
      description: n.description,
      timestamp: n.timestamp,
      isRead: n.isRead,
      priority: n.severity === 'Critical' ? 'critical' : n.severity === 'High' ? 'high' : 'normal',
      targetRoute,
    };
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    operationsService.markAllNotificationsAsRead();
  };

  const markAsRead = (id: string, targetRoute?: string) => {
    operationsService.markNotificationAsRead(id);
    if (targetRoute) {
      router.push(targetRoute as any);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedNotifFilter === 'unread') return !n.isRead;
    if (selectedNotifFilter === 'critical') return n.priority === 'critical';
    if (selectedNotifFilter === 'approval') return n.type === 'approval';
    if (selectedNotifFilter === 'recovery') return n.type === 'recovery';
    if (selectedNotifFilter === 'disruption') return n.type === 'disruption';
    return true;
  });

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm('Are you sure you want to terminate your active Supply Chain Manager session?')
        : true;
      if (ok) {
        logout().then(() => {
          router.replace('/(public)/signin');
        });
      }
      return;
    }
    Alert.alert(
      'Sign Out of TRUSTCHAIN',
      'Are you sure you want to terminate your active Supply Chain Manager session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(public)/signin');
          },
        },
      ]
    );
  };

  const handleSettingPress = (title: string) => {
    Alert.alert(title, 'This enterprise governance setting is governed by central IT policy.');
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Command Profile & Settings"
        subtitle="Executive governance credentials, notification feed & security preferences"
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'profile' && styles.tabBtnActive]}
          onPress={() => setActiveTab('profile')}
        >
          <User size={15} color={activeTab === 'profile' ? '#0D9488' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'profile' && styles.tabBtnTextActive]}>
            Executive Profile
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === 'notifications' && styles.tabBtnActive]}
          onPress={() => setActiveTab('notifications')}
        >
          <Bell size={15} color={activeTab === 'notifications' ? '#0D9488' : '#64748B'} />
          <Text
            style={[styles.tabBtnText, activeTab === 'notifications' && styles.tabBtnTextActive]}
          >
            Notifications
          </Text>
          {unreadCount > 0 && (
            <View style={styles.unreadPill}>
              <Text style={styles.unreadPillText}>{unreadCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {activeTab === 'profile' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Executive Identity Card */}
          <View style={styles.profileCard}>
            <View style={styles.avatarRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {user?.name
                    ? user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase()
                    : 'SC'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.managerName}>{user?.name || 'Supply Chain Manager'}</Text>
                <View style={styles.roleTag}>
                  <Text style={styles.roleTagText}>Supply Chain Manager</Text>
                </View>
                <Text style={styles.orgText}>{user?.organization || 'TRUSTCHAIN Global Hub'}</Text>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailItem}>
                <Mail size={13} color="#64748B" style={{ marginRight: 6 }} />
                <Text style={styles.detailValue}>{user?.email || 'manager@trustchain.com'}</Text>
              </View>
              <View style={styles.detailItem}>
                <ShieldCheck size={13} color="#16A36A" style={{ marginRight: 6 }} />
                <Text style={styles.detailValue}>Approval Threshold: Up to $250,000</Text>
              </View>
            </View>
          </View>

          {/* Settings Section: Account & Governance */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>Governance & Preferences</Text>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('Personal Information')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#EFF6FF' }]}>
                <User size={16} color="#2563EB" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Personal Information</Text>
                <Text style={styles.settingSubtitle}>Corporate title, division & contact profile</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('Approval Notifications')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#CCFBF1' }]}>
                <FileCheck size={16} color="#0D9488" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Approval Notifications</Text>
                <Text style={styles.settingSubtitle}>Instant push alerts on analyst submissions</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('Notification Preferences')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#EEF2FF' }]}>
                <Bell size={16} color="#4F46E5" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Notification Preferences</Text>
                <Text style={styles.settingSubtitle}>SLA disruption escalations & telemetric alerts</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('Security & MFA')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Key size={16} color="#D97706" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Security & Change Password</Text>
                <Text style={styles.settingSubtitle}>Hardware FIDO2 token & biometric unlock</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('Language & Regional')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#F0FDFA' }]}>
                <Globe size={16} color="#0D9488" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Language & Regional Format</Text>
                <Text style={styles.settingSubtitle}>English (US) · Metric Kilometres · UTC+05:30</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Support & About */}
          <View style={styles.settingsGroup}>
            <Text style={styles.groupTitle}>Compliance & Platform</Text>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('Help & Command Center Support')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#E0F2FE' }]}>
                <HelpCircle size={16} color="#0284C7" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>Help & Support Hotline</Text>
                <Text style={styles.settingSubtitle}>24/7 Tier-3 operational incident support</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>

            <Pressable
              style={styles.settingItem}
              onPress={() => handleSettingPress('About TRUSTCHAIN')}
            >
              <View style={[styles.settingIconBox, { backgroundColor: '#F1F5F9' }]}>
                <Info size={16} color="#475569" />
              </View>
              <View style={styles.settingTextGroup}>
                <Text style={styles.settingTitle}>About TRUSTCHAIN Enterprise</Text>
                <Text style={styles.settingSubtitle}>Version 3.4.0 (Phase 3 Build) · Multi-Signature Policy Enforced</Text>
              </View>
              <ChevronRight size={16} color="#94A3B8" />
            </Pressable>
          </View>

          {/* Sign Out Button */}
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <LogOut size={16} color="#DC2626" style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Sign Out Securely</Text>
          </Pressable>

          <View style={{ height: 110 }} />
        </ScrollView>
      ) : (
        <View style={styles.notifContainer}>
          {/* Header Action Row */}
          <View style={styles.notifHeaderRow}>
            <Text style={styles.notifCountText}>
              {unreadCount} unread alert{unreadCount !== 1 ? 's' : ''}
            </Text>
            {unreadCount > 0 && (
              <Pressable style={styles.markAllBtn} onPress={markAllAsRead}>
                <CheckCheck size={14} color="#0D9488" style={{ marginRight: 4 }} />
                <Text style={styles.markAllText}>Mark all as read</Text>
              </Pressable>
            )}
          </View>

          {/* Filter Chips */}
          <View style={styles.filterChipRow}>
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: 'Unread' },
              { id: 'critical', label: 'Critical' },
              { id: 'approval', label: 'Approvals' },
              { id: 'recovery', label: 'Recovery' },
              { id: 'disruption', label: 'Disruptions' },
            ].map((f) => {
              const active = selectedNotifFilter === f.id;
              return (
                <Pressable
                  key={f.id}
                  style={[styles.nChip, active && styles.nChipActive]}
                  onPress={() => setSelectedNotifFilter(f.id)}
                >
                  <Text style={[styles.nChipText, active && styles.nChipTextActive]}>
                    {f.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Notifications Feed */}
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.notifList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyStateBox}>
                <BellOff size={36} color="#94A3B8" style={{ marginBottom: 12 }} />
                <Text style={styles.emptyStateTitle}>No Notifications</Text>
                <Text style={styles.emptyStateDesc}>
                  {selectedNotifFilter === 'all'
                    ? 'No operational alerts or approval requests at this time.'
                    : `No ${selectedNotifFilter} alerts matching this filter.`}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const isCrit = item.priority === 'critical';
              return (
                <Pressable
                  style={[
                    styles.notifCard,
                    !item.isRead && styles.notifCardUnread,
                    isCrit && styles.notifCardCritical,
                  ]}
                  onPress={() => markAsRead(item.id, item.targetRoute)}
                >
                  <View style={styles.notifTopRow}>
                    <View style={styles.notifIconGroup}>
                      {item.type === 'approval' ? (
                        <FileCheck size={16} color="#0D9488" />
                      ) : item.type === 'disruption' ? (
                        <AlertTriangle size={16} color="#DC2626" />
                      ) : (
                        <Truck size={16} color="#2563EB" />
                      )}
                      <Text style={styles.notifTime}>{item.timestamp}</Text>
                    </View>

                    {!item.isRead && <View style={styles.unreadDot} />}
                  </View>

                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifDesc}>{item.description}</Text>

                  <View style={styles.notifActionRow}>
                    <Text style={styles.notifActionText}>View Record</Text>
                    <ChevronRight size={13} color="#0D9488" />
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}

      <ManagerBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  tabBtnActive: {
    borderBottomColor: '#0D9488',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#0D9488',
  },
  unreadPill: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginLeft: 2,
  },
  unreadPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 130,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  managerName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  roleTag: {
    backgroundColor: '#CCFBF1',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 2,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  orgText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailGrid: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailValue: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  groupTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  settingTextGroup: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#17243B',
  },
  settingSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    paddingVertical: 14,
    borderRadius: 12,
  },
  signOutText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 14,
  },
  notifContainer: {
    flex: 1,
    padding: 16,
  },
  notifHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  notifCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
  },
  filterChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  nChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  nChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  nChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  nChipTextActive: {
    color: '#FFFFFF',
  },
  notifList: {
    gap: 10,
    paddingBottom: 24,
  },
  notifCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  notifCardUnread: {
    borderLeftWidth: 4,
    borderLeftColor: '#0D9488',
    backgroundColor: '#F8FAFC',
  },
  notifCardCritical: {
    borderLeftColor: '#DC2626',
  },
  notifTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  notifIconGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notifTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0D9488',
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  notifDesc: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 8,
  },
  notifActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  notifActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  emptyStateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 6,
  },
  emptyStateDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
