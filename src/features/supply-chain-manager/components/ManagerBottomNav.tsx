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
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isBackendOnline } from '@/services/backendSync';

export type ManagerTab = 'overview' | 'network' | 'disruptions' | 'approvals' | 'more';

interface ManagerBottomNavProps {
  activeTab: ManagerTab;
}

export const ManagerBottomNav: React.FC<ManagerBottomNavProps> = ({ activeTab }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [moreVisible, setMoreVisible] = useState(false);

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

  // These still read sample data, so they stay out of the menu while live data is available.
  const SAMPLE_DATA_SCREENS = ['Risk & Business Impact', 'Reports & Analytics', 'Warehouse & Supplier Overview', 'Alternative Supplier Comparison', 'Suppliers Directory'];

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

            <View style={styles.moreList}>
              {moreItems.filter((item) => !isBackendOnline() || !SAMPLE_DATA_SCREENS.includes(item.title)).map((item, index) => {
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
            </View>
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
  moreList: {
    gap: 10,
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
