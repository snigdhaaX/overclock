import { usePathname, useRouter } from 'expo-router';
import {
  Activity,
  Building2,
  FileText,
  Home,
  Menu,
  Network,
  Shield,
  Sliders,
  UploadCloud,
  User,
  Users,
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

export const AdminBottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [showMoreModal, setShowMoreModal] = useState(false);

  const isHomeActive = pathname.includes('/administrator/home');
  const isUsersActive = pathname.includes('/administrator/users');
  const isRolesActive = pathname.includes('/administrator/roles');
  const isAuditActive = pathname.includes('/administrator/audit');

  const moreItems = [
    {
      title: 'Data Ingestion (CSV / JSON)',
      subtitle: 'Bulk upload suppliers, inventory & shipments (PRD Mod 4)',
      icon: <UploadCloud size={20} color="#EA580C" />,
      route: '/(protected)/administrator/data-import',
    },
    {
      title: 'Organisations & Facilities',
      subtitle: 'Multi-tenant enterprises, warehouses & capacities',
      icon: <Building2 size={20} color="#2563EB" />,
      route: '/(protected)/administrator/organizations',
    },
    {
      title: 'External Integrations',
      subtitle: 'FastAPI, PostgreSQL, ML engine, Polygon Amoy & WebSockets',
      icon: <Network size={20} color="#0D9488" />,
      route: '/(protected)/administrator/integrations',
    },
    {
      title: 'Global Risk Policies',
      subtitle: 'Thresholds, delegation caps & session security policies',
      icon: <Sliders size={20} color="#8B5CF6" />,
      route: '/(protected)/administrator/policies',
    },
    {
      title: 'System Health Diagnostics',
      subtitle: 'Live runtime uptime, latency & service monitors',
      icon: <Activity size={20} color="#16A34A" />,
      route: '/(protected)/administrator/audit?tab=health',
    },
    {
      title: 'Administrator Profile',
      subtitle: 'Elena Rostova · Security & Governance Settings',
      icon: <User size={20} color="#475569" />,
      route: '/(protected)/administrator/profile',
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
          onPress={() => router.push('/(protected)/administrator/home')}
        >
          <Home
            size={22}
            color={isHomeActive ? '#475569' : '#94A3B8'}
            strokeWidth={isHomeActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isHomeActive && styles.navTextActive]}>
            Home
          </Text>
        </Pressable>

        {/* Tab 2: Users */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/administrator/users')}
        >
          <Users
            size={22}
            color={isUsersActive ? '#475569' : '#94A3B8'}
            strokeWidth={isUsersActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isUsersActive && styles.navTextActive]}>
            Users
          </Text>
        </Pressable>

        {/* Tab 3: Roles */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/administrator/roles')}
        >
          <Shield
            size={22}
            color={isRolesActive ? '#475569' : '#94A3B8'}
            strokeWidth={isRolesActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isRolesActive && styles.navTextActive]}>
            Roles
          </Text>
        </Pressable>

        {/* Tab 4: Audit */}
        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/(protected)/administrator/audit')}
        >
          <FileText
            size={22}
            color={isAuditActive ? '#475569' : '#94A3B8'}
            strokeWidth={isAuditActive ? 2.5 : 1.8}
          />
          <Text style={[styles.navText, isAuditActive && styles.navTextActive]}>
            Audit
          </Text>
        </Pressable>

        {/* Tab 5: More */}
        <Pressable
          style={styles.navItem}
          onPress={() => setShowMoreModal(true)}
        >
          <Menu size={22} color="#94A3B8" strokeWidth={1.8} />
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
                  <Text style={styles.sheetTitle}>Administration Modules</Text>
                  <Text style={styles.sheetSubtitle}>
                    Enterprise Governance, Integrations & Systems
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
    color: '#475569',
    fontWeight: '800',
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

export default AdminBottomNav;

