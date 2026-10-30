import { useRouter } from 'expo-router';
import { Bell, ShieldCheck, Wifi, WifiOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../../../components/BrandLogo';
import warehouseService from '../services/warehouseService';

interface WarehouseHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const WarehouseHeader: React.FC<WarehouseHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    const update = () => {
      const notifs = warehouseService.getNotifications('unread');
      setUnreadCount(notifs.length);
      setIsOnline(warehouseService.getConnectionStatus().isOnline);
    };
    update();
    return warehouseService.subscribe(update);
  }, []);

  return (
    <View style={styles.header}>
      {/* Top Branding Row */}
      <View style={styles.topRow}>
        <View style={styles.brandContainer}>
          <BrandLogo variant="dark" size="sm" layout="horizontal" />
          <View style={styles.roleBadge}>
            <ShieldCheck size={12} color="#16A36A" />
            <Text style={styles.roleBadgeText}>Operator</Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {/* Connectivity Status Indicator */}
          <Pressable
            style={[styles.statusPill, !isOnline && styles.statusPillOffline]}
            onPress={() => warehouseService.toggleConnectionStatus(!isOnline)}
          >
            {isOnline ? (
              <>
                <Wifi size={11} color="#16A36A" />
                <Text style={styles.statusPillText}>WH-MUM</Text>
              </>
            ) : (
              <>
                <WifiOff size={11} color="#DC4545" />
                <Text style={[styles.statusPillText, { color: '#DC4545' }]}>Offline</Text>
              </>
            )}
          </Pressable>

          {/* Notifications */}
          <Pressable
            style={styles.iconButton}
            onPress={() => router.push('/(protected)/warehouse-operator/notifications' as any)}
            accessibilityLabel="Notifications"
          >
            <Bell size={18} color="#17243B" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Profile Shortcut */}
          <Pressable
            style={styles.avatarButton}
            onPress={() => router.push('/(protected)/warehouse-operator/profile' as any)}
            accessibilityLabel="Profile"
          >
            <Text style={styles.avatarText}>RV</Text>
          </Pressable>
        </View>
      </View>

      {/* Screen Title & Subtitle / Context Header */}
      {(title || subtitle) && (
        <View style={styles.titleContainer}>
          {title && <Text style={styles.title}>{title}</Text>}
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillOffline: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FEE2E2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A36A',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#DC4545',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#10234D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  titleContainer: {
    marginTop: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});

export default WarehouseHeader;
