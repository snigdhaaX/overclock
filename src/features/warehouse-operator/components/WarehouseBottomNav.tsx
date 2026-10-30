import { usePathname, useRouter } from 'expo-router';
import {
  ArrowDownToLine,
  ArrowRightLeft,
  ArrowUpFromLine,
  Boxes,
  CheckSquare,
  Home,
  MapPin,
  Menu,
  QrCode,
  User,
  X,
  Bell,
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

export const WarehouseBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showMoreModal, setShowMoreModal] = useState(false);

  const isHomeActive = pathname.includes('/warehouse-operator/home');
  const isTasksActive = pathname.includes('/warehouse-operator/tasks');
  const isScanActive = pathname.includes('/warehouse-operator/scan');
  const isInventoryActive = pathname.includes('/warehouse-operator/inventory');

  const moreItems = [
    {
      title: 'Incoming Shipments',
      subtitle: 'Inbound consignments & dock check-in',
      icon: <ArrowDownToLine size={20} color="#16A36A" />,
      route: '/(protected)/warehouse-operator/incoming-shipments',
    },
    {
      title: 'Outgoing Shipments',
      subtitle: 'Outbound dispatch & carrier handoff',
      icon: <ArrowUpFromLine size={20} color="#2563EB" />,
      route: '/(protected)/warehouse-operator/outgoing-shipments',
    },
    {
      title: 'Stock Transfer',
      subtitle: 'Intra-depot stock rebalancing',
      icon: <ArrowRightLeft size={20} color="#0D9488" />,
      route: '/(protected)/warehouse-operator/stock-transfer',
    },
    {
      title: 'Warehouse Map',
      subtitle: 'Top-down indoor layout & bay locator',
      icon: <MapPin size={20} color="#E11D48" />,
      route: '/(protected)/warehouse-operator/warehouse-map',
    },
    {
      title: 'Notifications',
      subtitle: 'Real-time task and cargo telemetry alerts',
      icon: <Bell size={20} color="#F59E0B" />,
      route: '/(protected)/warehouse-operator/notifications',
    },
    {
      title: 'Profile & Settings',
      subtitle: 'Rohit Verma · Mumbai Central Hub',
      icon: <User size={20} color="#475569" />,
      route: '/(protected)/warehouse-operator/profile',
    },
  ];

  return (
    <>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* 1. Home */}
          <Pressable
            style={styles.tab}
            onPress={() => router.replace('/(protected)/warehouse-operator/home' as any)}
          >
            <Home size={20} color={isHomeActive ? '#16A36A' : '#64748B'} />
            <Text style={[styles.tabLabel, isHomeActive && styles.activeTabLabel]}>
              Home
            </Text>
          </Pressable>

          {/* 2. Tasks */}
          <Pressable
            style={styles.tab}
            onPress={() => router.replace('/(protected)/warehouse-operator/tasks' as any)}
          >
            <CheckSquare size={20} color={isTasksActive ? '#16A36A' : '#64748B'} />
            <Text style={[styles.tabLabel, isTasksActive && styles.activeTabLabel]}>
              Tasks
            </Text>
          </Pressable>

          {/* 3. Scan - Prominent Center Button */}
          <Pressable
            style={styles.scanButtonContainer}
            onPress={() => router.push('/(protected)/warehouse-operator/scan' as any)}
            accessibilityLabel="Scan Barcode or QR"
          >
            <View style={[styles.scanButton, isScanActive && styles.scanButtonActive]}>
              <QrCode size={24} color="#FFFFFF" />
            </View>
            <Text style={[styles.scanLabel, isScanActive && styles.scanLabelActive]}>
              Scan
            </Text>
          </Pressable>

          {/* 4. Inventory */}
          <Pressable
            style={styles.tab}
            onPress={() => router.replace('/(protected)/warehouse-operator/inventory' as any)}
          >
            <Boxes size={20} color={isInventoryActive ? '#16A36A' : '#64748B'} />
            <Text style={[styles.tabLabel, isInventoryActive && styles.activeTabLabel]}>
              Inventory
            </Text>
          </Pressable>

          {/* 5. More */}
          <Pressable
            style={styles.tab}
            onPress={() => setShowMoreModal(true)}
          >
            <Menu size={20} color="#64748B" />
            <Text style={styles.tabLabel}>More</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {/* More Options Modal Bottom Sheet */}
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
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Warehouse Operations</Text>
                <Text style={styles.sheetSubtitle}>Operational modules & navigation</Text>
              </View>
              <Pressable
                onPress={() => setShowMoreModal(false)}
                style={styles.closeButton}
              >
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.sheetGrid}>
              {moreItems.map((item, idx) => (
                <Pressable
                  key={idx}
                  style={styles.sheetCard}
                  onPress={() => {
                    setShowMoreModal(false);
                    router.push(item.route as any);
                  }}
                >
                  <View style={styles.sheetCardIcon}>{item.icon}</View>
                  <View style={styles.sheetCardContent}>
                    <Text style={styles.sheetCardTitle}>{item.title}</Text>
                    <Text style={styles.sheetCardSubtitle} numberOfLines={1}>
                      {item.subtitle}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 60,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
    marginTop: 3,
  },
  activeTabLabel: {
    color: '#16A36A',
    fontWeight: '700',
  },
  scanButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -12,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#16A36A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#16A36A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  scanButtonActive: {
    backgroundColor: '#0D9488',
  },
  scanLabel: {
    fontSize: 11,
    color: '#16A36A',
    fontWeight: '700',
    marginTop: 2,
  },
  scanLabelActive: {
    color: '#0D9488',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 77, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  closeButton: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  sheetGrid: {
    gap: 10,
  },
  sheetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    borderRadius: 14,
    padding: 12,
  },
  sheetCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sheetCardContent: {
    flex: 1,
  },
  sheetCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  sheetCardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});

export default WarehouseBottomNav;
