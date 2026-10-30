import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Info,
  Lock,
  Package,
  Shield,
  UserCheck,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ROLES, UserRole } from '../../../types/roles';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import RolePermissionCard from '../../../features/administrator/components/RolePermissionCard';
import adminService from '../../../features/administrator/services/adminService';
import { PermissionCategory, PermissionItem } from '../../../features/administrator/types';

export default function RoleManagementScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>('operations-analyst');
  const [permissions, setPermissions] = useState<PermissionItem[]>(
    adminService.getPermissions()
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setPermissions(adminService.getPermissions());
    });
    return unsubscribe;
  }, []);

  const handleToggle = (permissionId: string) => {
    try {
      const isGranted = adminService.toggleRolePermission(permissionId, selectedRole);
      setStatusMessage(
        `${isGranted ? 'Granted' : 'Revoked'} permission for ${ROLES[selectedRole].title}.`
      );
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (err: any) {
      Alert.alert('Privilege Safeguard', err?.message || 'Cannot modify permission.');
    }
  };

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: 'All Categories' },
    { id: 'Read', label: 'Read' },
    { id: 'Create', label: 'Create' },
    { id: 'Update', label: 'Update' },
    { id: 'Delete / Quarantine', label: 'Delete' },
    { id: 'Approval', label: 'Approval' },
    { id: 'Administrative', label: 'Admin' },
  ];

  const filteredPermissions = permissions.filter(
    (p) => selectedCategory === 'all' || p.category === selectedCategory
  );

  const activeRoleDef = ROLES[selectedRole];
  const grantedCount = permissions.filter((p) => p.roles.includes(selectedRole)).length;

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Roles & Permissions"
        subtitle="Configure role-based access control (RBAC)"
      />

      {/* Role Selection Tabs */}
      <View style={styles.roleTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleTabsContent}
        >
          {(Object.keys(ROLES) as UserRole[]).map((rk) => {
            const rDef = ROLES[rk];
            const isSelected = selectedRole === rk;
            return (
              <Pressable
                key={rk}
                style={[
                  styles.roleTab,
                  isSelected && {
                    backgroundColor: rDef.lightColor,
                    borderColor: rDef.badgeColor,
                  },
                ]}
                onPress={() => setSelectedRole(rk)}
              >
                <View style={[styles.roleTabDot, { backgroundColor: rDef.badgeColor }]} />
                <Text
                  style={[
                    styles.roleTabText,
                    isSelected && { color: rDef.badgeColor, fontWeight: '700' },
                  ]}
                >
                  {rDef.title}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Role Overview Card */}
        <View style={styles.roleOverviewCard}>
          <View style={styles.roleOverviewTop}>
            <View style={[styles.roleIconBox, { backgroundColor: activeRoleDef.lightColor }]}>
              <Shield size={20} color={activeRoleDef.badgeColor} />
            </View>
            <View style={styles.roleOverviewText}>
              <Text style={styles.roleTitle}>{activeRoleDef.title}</Text>
              <Text style={styles.roleDescription}>{activeRoleDef.description}</Text>
            </View>
          </View>

          <View style={styles.roleStatsRow}>
            <View style={styles.roleStatItem}>
              <Text style={styles.roleStatLabel}>Assigned Permissions</Text>
              <Text style={[styles.roleStatValue, { color: activeRoleDef.badgeColor }]}>
                {grantedCount} of {permissions.length} Active
              </Text>
            </View>
            <View style={styles.roleStatDivider} />
            <View style={styles.roleStatItem}>
              <Text style={styles.roleStatLabel}>Admin Sign-off Required</Text>
              <Text style={styles.roleStatValue}>
                {activeRoleDef.adminApprovalRequired ? 'Yes (Strict)' : 'No (Standard)'}
              </Text>
            </View>
          </View>
        </View>

        {/* Status Alert if toggled */}
        {statusMessage && (
          <View style={styles.statusToast}>
            <CheckCircle size={14} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.statusToastText}>{statusMessage}</Text>
          </View>
        )}

        {/* Governance Notice */}
        <View style={styles.noticeBox}>
          <Info size={16} color="#0D9488" style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.noticeText}>
            Governance Notice: This matrix configures application-tier permission scopes. In production, backend authorization tokens enforce cryptographic permission checks.
          </Text>
        </View>

        {/* Category Filter Chips */}
        <View style={styles.categoryFilters}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryChipsContent}
          >
            {categories.map((c) => {
              const isSelected = selectedCategory === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(c.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Permissions List */}
        <View style={styles.permissionsList}>
          {filteredPermissions.map((item) => (
            <RolePermissionCard
              key={item.id}
              permission={item}
              selectedRole={selectedRole}
              onToggle={handleToggle}
            />
          ))}
        </View>
      </ScrollView>

      <AdminBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  roleTabsContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingVertical: 8,
  },
  roleTabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  roleTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  roleTabDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  roleTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  roleOverviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  roleOverviewTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  roleOverviewText: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  roleDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  roleStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  roleStatLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  roleStatValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  roleStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: '#E2E8F0',
  },
  statusToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statusToastText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16A34A',
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
  },
  noticeText: {
    fontSize: 11,
    color: '#0D9488',
    lineHeight: 15,
    flex: 1,
  },
  categoryFilters: {
    marginBottom: 12,
  },
  categoryChipsContent: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  categoryChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  permissionsList: {
    gap: 4,
  },
});

