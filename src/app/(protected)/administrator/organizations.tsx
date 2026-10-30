import { useRouter } from 'expo-router';
import { Building2, Check, MapPin, Package, Plus, Search, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import OrganizationCard from '../../../features/administrator/components/OrganizationCard';
import adminService from '../../../features/administrator/services/adminService';
import { OrganizationRecord, WarehouseRecord } from '../../../features/administrator/types';

export default function OrganizationManagementScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'warehouses' | 'organizations'>('warehouses');
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>(adminService.getWarehouses());
  const [organizations, setOrganizations] = useState<OrganizationRecord[]>(
    adminService.getOrganizations()
  );
  const [search, setSearch] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);

  // Form states for adding Warehouse
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whCity, setWhCity] = useState('');
  const [whCountry, setWhCountry] = useState('');
  const [whCapacity, setWhCapacity] = useState('6000');
  const [whSupervisor, setWhSupervisor] = useState('');
  const [selectedOrgId, setSelectedOrgId] = useState(organizations[0]?.id || 'org_001');

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setWarehouses(adminService.getWarehouses());
      setOrganizations(adminService.getOrganizations());
    });
    return unsubscribe;
  }, []);

  const handleCreateWarehouse = () => {
    if (!whCode.trim() || !whName.trim() || !whCity.trim() || !whCountry.trim()) {
      Alert.alert('Required Fields', 'Please complete warehouse code, name, city and country.');
      return;
    }

    const org = organizations.find((o) => o.id === selectedOrgId) || organizations[0];
    const cap = parseInt(whCapacity, 10) || 5000;

    adminService.createWarehouse({
      code: whCode.trim().toUpperCase(),
      name: whName.trim(),
      organizationId: org.id,
      organizationName: org.name,
      type: 'Distribution Center',
      city: whCity.trim(),
      country: whCountry.trim(),
      capacityPallets: cap,
      utilizedPallets: Math.round(cap * 0.4),
      status: 'Operational',
      supervisor: whSupervisor.trim() || 'Assigned Operator',
    });

    setIsAddModalVisible(false);
    setWhCode('');
    setWhName('');
    setWhCity('');
    setWhCountry('');
    setWhSupervisor('');
  };

  const filteredWarehouses = warehouses.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.code.toLowerCase().includes(search.toLowerCase()) ||
      w.city.toLowerCase().includes(search.toLowerCase()) ||
      w.organizationName.toLowerCase().includes(search.toLowerCase())
  );

  const filteredOrgs = organizations.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.code.toLowerCase().includes(search.toLowerCase()) ||
      o.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Facilities & Enterprises"
        subtitle={`${warehouses.length} Regional Hubs · ${organizations.length} Organizations`}
        rightAction={
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
            onPress={() => setIsAddModalVisible(true)}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add Hub</Text>
          </Pressable>
        }
      />

      {/* Tabs Row */}
      <View style={styles.tabsRow}>
        <Pressable
          style={[styles.tab, activeTab === 'warehouses' && styles.tabActive]}
          onPress={() => setActiveTab('warehouses')}
        >
          <Package size={15} color={activeTab === 'warehouses' ? '#10234D' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'warehouses' && styles.tabTextActive]}>
            Warehouses & Hubs ({warehouses.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === 'organizations' && styles.tabActive]}
          onPress={() => setActiveTab('organizations')}
        >
          <Building2 size={15} color={activeTab === 'organizations' ? '#10234D' : '#64748B'} />
          <Text style={[styles.tabText, activeTab === 'organizations' && styles.tabTextActive]}>
            Organizations ({organizations.length})
          </Text>
        </Pressable>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === 'warehouses'
                ? 'Search warehouses by code, city or organization...'
                : 'Search organizations by name or code...'
            }
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* List */}
      {activeTab === 'warehouses' ? (
        <FlatList
          data={filteredWarehouses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OrganizationCard warehouse={item} />}
        />
      ) : (
        <FlatList
          data={filteredOrgs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <OrganizationCard organization={item} />}
        />
      )}

      {/* Add Warehouse Modal */}
      <Modal visible={isAddModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Register Regional Facility</Text>
                <Text style={styles.modalSubtitle}>Provision warehouse terminal into supply chain topology</Text>
              </View>
              <Pressable onPress={() => setIsAddModalVisible(false)} style={styles.closeBtn}>
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Facility Code *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. WH-DXB-05"
                  placeholderTextColor="#94A3B8"
                  value={whCode}
                  onChangeText={setWhCode}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Facility Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Dubai Logistics City Hub"
                  placeholderTextColor="#94A3B8"
                  value={whName}
                  onChangeText={setWhName}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>City *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Dubai"
                    placeholderTextColor="#94A3B8"
                    value={whCity}
                    onChangeText={setWhCity}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Country *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="UAE"
                    placeholderTextColor="#94A3B8"
                    value={whCountry}
                    onChangeText={setWhCountry}
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Pallet Capacity *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="7500"
                    placeholderTextColor="#94A3B8"
                    value={whCapacity}
                    onChangeText={setWhCapacity}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.label}>Supervisor Name</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Tariq Mansoor"
                    placeholderTextColor="#94A3B8"
                    value={whSupervisor}
                    onChangeText={setWhSupervisor}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setIsAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={handleCreateWarehouse}>
                <Text style={styles.saveBtnText}>Save Facility</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <AdminBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  tabActive: {
    borderBottomColor: '#10234D',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#10234D',
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
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
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  modalScroll: {
    maxHeight: 380,
  },
  formGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

