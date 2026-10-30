import { useRouter } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  Bell,
  ChevronRight,
  LogOut,
  PlayCircle,
  Shield,
  User,
  X,
} from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import useAuth from '../../../hooks/useAuth';
import operationsService from '../services/operationsService';

interface MoreOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const MoreOptionsSheet: React.FC<MoreOptionsSheetProps> = ({ visible, onClose }) => {
  const router = useRouter();
  const { logout } = useAuth();
  const unreadCount = operationsService.getUnreadNotificationsCount();

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 150);
  };

  const handleSignOut = async () => {
    onClose();
    await logout();
    router.replace('/(public)/signin');
  };

  const menuItems = [
    {
      title: 'Risk Intelligence',
      subtitle: 'Order, inventory & supplier exposure scoring',
      icon: <AlertTriangle size={20} color="#D97706" />,
      bg: '#FEF3C7',
      route: '/(protected)/operations-analyst/risk',
    },
    {
      title: 'Execution Tracking',
      subtitle: 'Monitor active recovery plan milestones',
      icon: <PlayCircle size={20} color="#2563EB" />,
      bg: '#EFF6FF',
      route: '/(protected)/operations-analyst/recovery/execution',
    },
    {
      title: 'Notifications & Alerts',
      subtitle: `${unreadCount} unread operational updates`,
      icon: <Bell size={20} color="#4F46E5" />,
      bg: '#EEF2FF',
      badge: unreadCount > 0 ? unreadCount : undefined,
      route: '/(protected)/operations-analyst/notifications',
    },
    {
      title: 'Profile & Settings',
      subtitle: 'Account, notifications, security & app info',
      icon: <User size={20} color="#0D9488" />,
      bg: '#CCFBF1',
      route: '/(protected)/operations-analyst/profile',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.dragHandle} />

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>More Operations</Text>
              <Text style={styles.subtitle}>Extended analyst intelligence & management</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X size={18} color="#64748B" />
            </Pressable>
          </View>

          <View style={styles.itemsList}>
            {menuItems.map((item, i) => (
              <Pressable
                key={i}
                onPress={() => handleNavigate(item.route)}
                style={({ pressed }) => [styles.menuItem, pressed && styles.itemPressed]}
              >
                <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
                  {item.icon}
                </View>
                <View style={styles.itemText}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                </View>
                {item.badge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{item.badge}</Text>
                  </View>
                )}
                <ChevronRight size={18} color="#94A3B8" />
              </Pressable>
            ))}

            <View style={styles.divider} />

            <Pressable
              onPress={handleSignOut}
              style={({ pressed }) => [styles.signOutBtn, pressed && styles.itemPressed]}
            >
              <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                <LogOut size={18} color="#DC2626" />
              </View>
              <View style={styles.itemText}>
                <Text style={styles.signOutText}>Sign Out Session</Text>
                <Text style={styles.itemSubtitle}>Securely exit current Operations Analyst workspace</Text>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 34,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10234D',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemsList: {
    gap: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemPressed: {
    backgroundColor: '#EEF2F6',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10234D',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
    marginRight: 6,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC2626',
  },
});

export default MoreOptionsSheet;
