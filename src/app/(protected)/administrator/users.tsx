import { useRouter } from 'expo-router';
import { AlertCircle, Filter, Plus, Search, UserCheck, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ROLES, UserRole } from '../../../types/roles';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import UserCard from '../../../features/administrator/components/UserCard';
import UserFormModal from '../../../features/administrator/components/UserFormModal';
import adminService from '../../../features/administrator/services/adminService';
import { AccountStatus, AdminUser } from '../../../features/administrator/types';

export default function UserManagementScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUser[]>(adminService.getUsers());
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setUsers(adminService.getUsers());
    });
    return unsubscribe;
  }, []);

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.organization.toLowerCase().includes(search.toLowerCase());

    const matchesRole = selectedRole === 'all' || u.assignedRole === selectedRole;
    const matchesStatus = selectedStatus === 'all' || u.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCreateOrUpdate = (formData: {
    name: string;
    email: string;
    organization: string;
    assignedRole: UserRole;
    phoneNumber?: string;
    status?: AccountStatus;
  }) => {
    try {
      if (userToEdit) {
        adminService.updateUser(userToEdit.id, formData);
        setFeedback({ message: `Successfully updated ${formData.name}`, type: 'success' });
      } else {
        adminService.createUser(formData);
        setFeedback({ message: `Successfully provisioned ${formData.name}`, type: 'success' });
      }
      setIsModalVisible(false);
      setUserToEdit(null);
    } catch (err: any) {
      Alert.alert('Action Failed', err?.message || 'Failed to save user.');
    }
  };

  const handleToggleStatus = (targetUser: AdminUser) => {
    if (targetUser.status === 'active') {
      Alert.alert(
        'Confirm Deactivation',
        `Are you sure you want to suspend access for ${targetUser.name} (${targetUser.email})?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Deactivate',
            style: 'destructive',
            onPress: () => {
              try {
                adminService.deactivateUser(targetUser.id);
                setFeedback({
                  message: `Deactivated ${targetUser.name}. Session credentials revoked.`,
                  type: 'success',
                });
              } catch (err: any) {
                Alert.alert('Governance Restriction', err?.message || 'Cannot deactivate user.');
              }
            },
          },
        ]
      );
    } else {
      try {
        adminService.activateUser(targetUser.id);
        setFeedback({
          message: `Activated account for ${targetUser.name}.`,
          type: 'success',
        });
      } catch (err: any) {
        Alert.alert('Action Failed', err?.message || 'Cannot activate user.');
      }
    }
  };

  const rolesList: { id: string; label: string }[] = [
    { id: 'all', label: 'All Roles' },
    { id: 'operations-analyst', label: 'Analyst' },
    { id: 'supply-chain-manager', label: 'Manager' },
    { id: 'warehouse-operator', label: 'Operator' },
    { id: 'procurement-approver', label: 'Approver' },
    { id: 'administrator', label: 'Admin' },
  ];

  const statusList: { id: string; label: string }[] = [
    { id: 'all', label: 'All Status' },
    { id: 'active', label: 'Active' },
    { id: 'pending_approval', label: 'Pending' },
    { id: 'suspended', label: 'Deactivated' },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader
        title="User Management"
        subtitle={`${users.length} enterprise accounts registered`}
        showBack={false}
        rightAction={
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && styles.btnPressed]}
            onPress={() => {
              setUserToEdit(null);
              setIsModalVisible(true);
            }}
          >
            <Plus size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.addBtnText}>Add User</Text>
          </Pressable>
        }
      />

      {/* Feedback Banner */}
      {feedback && (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
          ]}
        >
          <Text
            style={[
              styles.feedbackText,
              feedback.type === 'success' ? styles.feedbackSuccessText : styles.feedbackErrorText,
            ]}
          >
            {feedback.message}
          </Text>
          <Pressable onPress={() => setFeedback(null)}>
            <X size={16} color="#64748B" />
          </Pressable>
        </View>
      )}

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by user name, work email or organization..."
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

      {/* Filter Chips: Roles */}
      <View style={styles.filtersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={rolesList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterChipsContainer}
          renderItem={({ item }) => {
            const isSelected = selectedRole === item.id;
            return (
              <Pressable
                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                onPress={() => setSelectedRole(item.id)}
              >
                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Filter Chips: Status */}
      <View style={styles.statusFiltersWrapper}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={statusList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterChipsContainer}
          renderItem={({ item }) => {
            const isSelected = selectedStatus === item.id;
            return (
              <Pressable
                style={[styles.statusChip, isSelected && styles.statusChipActive]}
                onPress={() => setSelectedStatus(item.id)}
              >
                <Text style={[styles.statusChipText, isSelected && styles.statusChipTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Users List */}
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onEdit={(u) => {
              setUserToEdit(u);
              setIsModalVisible(true);
            }}
            onToggleStatus={handleToggleStatus}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={40} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>No Users Found</Text>
            <Text style={styles.emptyText}>
              No enterprise accounts match your active search and filter criteria.
            </Text>
          </View>
        }
      />

      {/* Add / Edit User Modal */}
      <UserFormModal
        visible={isModalVisible}
        userToEdit={userToEdit}
        onClose={() => {
          setIsModalVisible(false);
          setUserToEdit(null);
        }}
        onSubmit={handleCreateOrUpdate}
      />

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
  feedbackBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC',
  },
  feedbackSuccessText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  feedbackError: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  feedbackErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  feedbackText: {
    fontSize: 12,
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
  filtersWrapper: {
    paddingVertical: 4,
  },
  statusFiltersWrapper: {
    paddingBottom: 8,
  },
  filterChipsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  statusChipActive: {
    backgroundColor: '#CBD5E1',
  },
  statusChipText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  statusChipTextActive: {
    color: '#1E293B',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 110,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});

