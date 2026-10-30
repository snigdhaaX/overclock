import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Bell } from 'lucide-react-native';
import BrandLogo from '../../../components/BrandLogo';
import { procurementService } from '../services/procurementService';

interface ProcurementHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export function ProcurementHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}: ProcurementHeaderProps) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const update = () => {
      const notifs = procurementService.getNotifications('unread');
      setUnreadCount(notifs.length);
    };
    update();
    return procurementService.subscribe(update);
  }, []);

  return (
    <View style={styles.header}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          {showBack ? (
            <Pressable
              onPress={onBack || (() => router.back())}
              style={styles.backBtn}
              hitSlop={8}
            >
              <ArrowLeft size={20} color="#10234D" />
            </Pressable>
          ) : (
            <BrandLogo variant="dark" size="sm" layout="horizontal" />
          )}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>Procurement</Text>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {rightAction}

          <Pressable
            style={styles.iconBtn}
            onPress={() => router.push('/(protected)/procurement-approver/notifications')}
            hitSlop={8}
          >
            <Bell size={20} color="#10234D" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeCount}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={styles.avatarBtn}
            onPress={() => router.push('/(protected)/procurement-approver/profile')}
            hitSlop={6}
          >
            <Text style={styles.avatarText}>PS</Text>
          </Pressable>
        </View>
      </View>

      {/* Screen Title & Subtitle */}
      {title && (
        <View style={styles.titleSection}>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    padding: 6,
    marginRight: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  roleBadge: {
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E9D5FF',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
    letterSpacing: 0.3,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    position: 'relative',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC2626',
    borderRadius: 10,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeCount: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  titleSection: {
    marginTop: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.4,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
});

export default ProcurementHeader;

