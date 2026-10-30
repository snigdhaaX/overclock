import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  BarChart2,
  Building,
  CheckCircle2,
  ChevronRight,
  FileText,
  Globe2,
  Home,
  LayoutDashboard,
  LogOut,
  MoreHorizontal,
  PieChart,
  RotateCcw,
  Scale,
  Shield,
  Truck,
  User,
  Warehouse,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import useAuth from '../../../hooks/useAuth';

export type ManagerTab = 'overview' | 'network' | 'disruptions' | 'approvals' | 'more';

interface ManagerBottomNavProps {
  activeTab: ManagerTab;
}

export const ManagerBottomNav: React.FC<ManagerBottomNavProps> = ({ activeTab }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const [moreVisible, setMoreVisible] = useState(false);

  const handleSignOut = () => {
    setMoreVisible(false);
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

  const handleTabPress = (tab: ManagerTab) => {
    if (tab === 'overview') {
      router.push('/(protected)/supply-chain-manager/home' as any);
    } else if (tab === 'network') {
      router.push('/(protected)/supply-chain-manager/network' as any);
    } else if (tab === 'disruptions') {
      router.push('/(protected)/supply-chain-manager/disruptions' as any);
    } else if (tab === 'approvals') {
      router.push('/(protected)/supply-chain-manager/approvals' as any);
    } else if (tab === 'more') {
      setMoreVisible(true);
    }
  };

  const moreItems = [
    {
      title: 'Risk & Business Impact',
      subtitle: 'Order-level risks, financial exposure & supply pillars',
      icon: AlertTriangle,
      route: '/(protected)/supply-chain-manager/risk-analysis',
      color: '#DC2626',
    },
    {
      title: 'Reports & Analytics',
      subtitle: 'OTD delivery trends, disruption patterns & recovery',
      icon: BarChart2,
      route: '/(protected)/supply-chain-manager/analytics',
      color: '#2563EB',
    },
    {
      title: 'Warehouse & Supplier Overview',
      subtitle: 'Combined multi-echelon network inventory & vendor hub',
      icon: Warehouse,
      route: '/(protected)/supply-chain-manager/warehouse-supplier',
      color: '#0D9488',
    },
    {
      title: 'Alternative Supplier Comparison',
      subtitle: 'Side-by-side sourcing metrics & qualification audits',
      icon: Scale,
      route: '/(protected)/supply-chain-manager/suppliers/compare',
      color: '#D97706',
    },
    {
      title: 'Recovery Monitoring',
      subtitle: 'Live plan execution & milestone tracking',
      icon: RotateCcw,
      route: '/(protected)/supply-chain-manager/recovery',
      color: '#0D9488',
    },
    {
      title: 'Suppliers Directory',
      subtitle: 'Tier-1 vendor ratings & risk history',
      icon: Building,
      route: '/(protected)/supply-chain-manager/suppliers',
      color: '#4F46E5',
    },
    {
      title: 'Audit & Activity Log',
      subtitle: 'Immutable cryptographic governance trail',
      icon: Shield,
      route: '/(protected)/supply-chain-manager/audit',
      color: '#16A36A',
    },
    {
      title: 'Profile & Settings',
      subtitle: 'Manager credentials, RBAC & notifications',
      icon: User,
      route: '/(protected)/supply-chain-manager/profile',
      color: '#10234D',
    },
  ];

  return (
    <>
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {/* Overview Tab */}
        <Pressable
          style={styles.tabItem}
          onPress={() => handleTabPress('overview')}
        >
          <View style={[styles.iconWrapper, activeTab === 'overview' && styles.iconWrapperActive]}>
            <LayoutDashboard
              size={20}
              color={activeTab === 'overview' ? '#0D9488' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'overview' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Overview
          </Text>
        </Pressable>

        {/* Network Map Tab */}
        <Pressable
          style={styles.tabItem}
          onPress={() => handleTabPress('network')}
        >
          <View style={[styles.iconWrapper, activeTab === 'network' && styles.iconWrapperActive]}>
            <Globe2
              size={20}
              color={activeTab === 'network' ? '#0D9488' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'network' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Network
          </Text>
        </Pressable>

        {/* Disruptions Tab */}
        <Pressable
          style={styles.tabItem}
          onPress={() => handleTabPress('disruptions')}
        >
          <View style={[styles.iconWrapper, activeTab === 'disruptions' && styles.iconWrapperActive]}>
            <AlertTriangle
              size={20}
              color={activeTab === 'disruptions' ? '#0D9488' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'disruptions' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Disruptions
          </Text>
        </Pressable>

        {/* Approvals Tab */}
        <Pressable
          style={styles.tabItem}
          onPress={() => handleTabPress('approvals')}
        >
          <View style={[styles.iconWrapper, activeTab === 'approvals' && styles.iconWrapperActive]}>
            <CheckCircle2
              size={20}
              color={activeTab === 'approvals' ? '#0D9488' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'approvals' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            Approvals
          </Text>
        </Pressable>

        {/* More Tab */}
        <Pressable
          style={styles.tabItem}
          onPress={() => handleTabPress('more')}
        >
          <View style={[styles.iconWrapper, activeTab === 'more' && styles.iconWrapperActive]}>
            <MoreHorizontal
              size={20}
              color={activeTab === 'more' ? '#0D9488' : '#64748B'}
            />
          </View>
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'more' ? styles.tabLabelActive : styles.tabLabelInactive,
            ]}
          >
            More
          </Text>
        </Pressable>
      </View>

      {/* More Options Modal Sheet */}
      <Modal
        visible={moreVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMoreVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setMoreVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Command Navigation</Text>
                <Text style={styles.modalSubtitle}>Supply Chain Manager Modules</Text>
              </View>
              <Pressable
                onPress={() => setMoreVisible(false)}
                style={styles.closeButton}
                hitSlop={8}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView
              style={styles.moreScroll}
              contentContainerStyle={styles.moreList}
              showsVerticalScrollIndicator={false}
            >
              {moreItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Pressable
                    key={index}
                    style={({ pressed }) => [
                      styles.moreItem,
                      pressed && styles.moreItemPressed,
                    ]}
                    onPress={() => {
                      setMoreVisible(false);
                      router.push(item.route as any);
                    }}
                  >
                    <View style={[styles.moreItemIcon, { backgroundColor: item.color + '15' }]}>
                      <Icon size={18} color={item.color} />
                    </View>
                    <View style={styles.moreItemTexts}>
                      <Text style={styles.moreItemTitle}>{item.title}</Text>
                      <Text style={styles.moreItemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <ChevronRight size={16} color="#94A3B8" />
                  </Pressable>
                );
              })}

              {/* Divider */}
              <View style={styles.moreDivider} />

              {/* Direct Sign Out Button */}
              <Pressable
                style={({ pressed }) => [
                  styles.signOutItem,
                  pressed && styles.signOutItemPressed,
                ]}
                onPress={handleSignOut}
              >
                <View style={[styles.moreItemIcon, { backgroundColor: '#FEE2E2' }]}>
                  <LogOut size={18} color="#DC2626" />
                </View>
                <View style={styles.moreItemTexts}>
                  <Text style={[styles.moreItemTitle, { color: '#DC2626', fontWeight: '800' }]}>
                    Sign Out Session
                  </Text>
                  <Text style={styles.moreItemSubtitle}>
                    Exit Supply Chain Manager and return to sign in
                  </Text>
                </View>
                <ChevronRight size={16} color="#DC2626" />
              </Pressable>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingTop: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 38,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapperActive: {
    backgroundColor: '#F0FDFA',
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  tabLabelInactive: {
    color: '#64748B',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    maxHeight: '82%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreScroll: {
    maxHeight: 460,
  },
  moreList: {
    gap: 10,
    paddingBottom: 16,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  moreItemPressed: {
    backgroundColor: '#F1F5F9',
  },
  moreDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  signOutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  signOutItemPressed: {
    backgroundColor: '#FEE2E2',
  },
  moreItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moreItemTexts: {
    flex: 1,
  },
  moreItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  moreItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
});

export default ManagerBottomNav;
