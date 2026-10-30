import { usePathname, useRouter } from 'expo-router';
import {
  ArrowRightLeft,
  Bell,
  Building2,
  FileCheck,
  FileText,
  History,
  Home,
  Menu,
  ShieldAlert,
  User,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export const ProcurementBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showMoreModal, setShowMoreModal] = useState(false);

  const isHomeActive = pathname.includes('/procurement-approver/home');
  const isRequestsActive = pathname.includes('/procurement-approver/requests');
  const isSuppliersActive =
    pathname.includes('/procurement-approver/suppliers') && !pathname.includes('/suppliers/compare');
  const isRiskActive = pathname.includes('/procurement-approver/risk-analysis');

  const moreItems = [
    {
      title: 'Purchase Orders',
      subtitle: 'Issued orders, production status & line items',
      icon: <FileText size={20} color="#2563EB" />,
      route: '/(protected)/procurement-approver/purchase-orders',
    },
    {
      title: 'Alternative Supplier Comparison',
      subtitle: 'Head-to-head sourcing metrics evaluation',
      icon: <ArrowRightLeft size={20} color="#8B5CF6" />,
      route: '/(protected)/procurement-approver/suppliers/compare',
    },
    {
      title: 'Approval History & Audit',
      subtitle: 'Immutable timeline of procurement actions',
      icon: <History size={20} color="#0D9488" />,
      route: '/(protected)/procurement-approver/approval-history',
    },
    {
      title: 'Notifications & Alerts',
      subtitle: 'Sourcing requests, pricing & qualification feeds',
      icon: <Bell size={20} color="#F59E0B" />,
      route: '/(protected)/procurement-approver/notifications',
    },
    {
      title: 'Profile & Settings',
      subtitle: 'Priya Sharma · Enterprise Delegation Limits',
      icon: <User size={20} color="#475569" />,
      route: '/(protected)/procurement-approver/profile',
    },
  ];

  const handleNavigate = (route: string) => {
    setShowMoreModal(false);
    router.push(route as any);
  };

  return (
    <>
      <View style={styles.navBar}>
        {/* Tab 1: Home */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/procurement-approver/home')}
        >
          <Home
            size={22}
            color={isHomeActive ? '#8B5CF6' : '#64748B'}
            strokeWidth={isHomeActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isHomeActive && styles.navTextActive]}>
            Home
          </Text>
        </Pressable>

        {/* Tab 2: Requests */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/procurement-approver/requests')}
        >
          <FileCheck
            size={22}
            color={isRequestsActive ? '#8B5CF6' : '#64748B'}
            strokeWidth={isRequestsActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isRequestsActive && styles.navTextActive]}>
            Requests
          </Text>
        </Pressable>

        {/* Tab 3: Suppliers */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/procurement-approver/suppliers')}
        >
          <Building2
            size={22}
            color={isSuppliersActive ? '#8B5CF6' : '#64748B'}
            strokeWidth={isSuppliersActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isSuppliersActive && styles.navTextActive]}>
            Suppliers
          </Text>
        </Pressable>

        {/* Tab 4: Analytics / Risk */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/procurement-approver/risk-analysis')}
        >
          <ShieldAlert
            size={22}
            color={isRiskActive ? '#8B5CF6' : '#64748B'}
            strokeWidth={isRiskActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isRiskActive && styles.navTextActive]}>
            Analytics
          </Text>
        </Pressable>

        {/* Tab 5: More */}
        <Pressable
          style={styles.navItem}
          onPress={() => setShowMoreModal(true)}
        >
          <Menu size={22} color="#64748B" strokeWidth={1.8} />
          <Text style={styles.navText}>More</Text>
        </Pressable>
      </View>

      {/* More Options Modal */}
      <Modal
        visible={showMoreModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoreModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMoreModal(false)}
        >
          <SafeAreaView style={styles.sheetContainer}>
            <Pressable
              style={styles.sheetContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View>
                  <Text style={styles.sheetTitle}>Procurement Modules</Text>
                  <Text style={styles.sheetSubtitle}>
                    Additional Purchasing & Governance Stations
                  </Text>
                </View>
                <Pressable
                  style={styles.closeBtn}
                  onPress={() => setShowMoreModal(false)}
                >
                  <X size={20} color="#64748B" />
                </Pressable>
              </View>

              <View style={styles.moreList}>
                {moreItems.map((item, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.moreItem}
                    onPress={() => handleNavigate(item.route)}
                  >
                    <View style={styles.itemIconBox}>{item.icon}</View>
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  navText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  navTextActive: {
    color: '#8B5CF6',
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  moreList: {
    gap: 12,
  },
  moreItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});

export default ProcurementBottomNav;

