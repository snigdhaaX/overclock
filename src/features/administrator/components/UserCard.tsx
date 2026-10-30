import { Building, CheckCircle, Clock, Edit2, Shield, Slash, UserCheck, XCircle } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ROLES, UserRole } from '../../../types/roles';
import { AdminUser } from '../types';

interface UserCardProps {
  user: AdminUser;
  onEdit: (user: AdminUser) => void;
  onToggleStatus: (user: AdminUser) => void;
}

export const UserCard: React.FC<UserCardProps> = ({
  user,
  onEdit,
  onToggleStatus,
}) => {
  const roleDef = ROLES[user.assignedRole] || {
    title: user.assignedRole,
    badgeColor: '#475569',
    lightColor: '#F1F5F9',
  };

  const getStatusBadge = () => {
    switch (user.status) {
      case 'active':
        return {
          label: 'Active',
          color: '#16A34A',
          bg: '#DCFCE7',
          icon: <CheckCircle size={12} color="#16A34A" />,
        };
      case 'pending_approval':
        return {
          label: 'Pending Approval',
          color: '#D97706',
          bg: '#FEF3C7',
          icon: <Clock size={12} color="#D97706" />,
        };
      case 'suspended':
        return {
          label: 'Deactivated',
          color: '#DC2626',
          bg: '#FEE2E2',
          icon: <XCircle size={12} color="#DC2626" />,
        };
    }
  };

  const statusBadge = getStatusBadge();

  return (
    <View style={styles.card}>
      {/* Top Header: Avatar, Name, Email, Status */}
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </Text>
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusBadge.bg }]}>
              {statusBadge.icon}
              <Text style={[styles.statusText, { color: statusBadge.color }]}>
                {statusBadge.label}
              </Text>
            </View>
          </View>
          <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
        </View>
      </View>

      {/* Role & Organization Row */}
      <View style={styles.metaRow}>
        <View style={[styles.roleBadge, { backgroundColor: roleDef.lightColor }]}>
          <Shield size={12} color={roleDef.badgeColor} style={{ marginRight: 4 }} />
          <Text style={[styles.roleText, { color: roleDef.badgeColor }]}>
            {roleDef.title}
          </Text>
        </View>

        <View style={styles.orgBadge}>
          <Building size={12} color="#64748B" style={{ marginRight: 4 }} />
          <Text style={styles.orgText} numberOfLines={1}>{user.organization}</Text>
        </View>
      </View>

      {/* Facilities / Warehouses Access Tags */}
      {user.warehouseAccess && user.warehouseAccess.length > 0 && (
        <View style={styles.facilityRow}>
          <Text style={styles.facilityLabel}>Facility Access:</Text>
          <View style={styles.facilityTags}>
            {user.warehouseAccess.map((wh) => (
              <View key={wh} style={styles.facilityTag}>
                <Text style={styles.facilityTagText}>{wh}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Footer Actions */}
      <View style={styles.footerRow}>
        <Text style={styles.loginTimestamp}>
          {user.lastLoginAt
            ? `Active ${new Date(user.lastLoginAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}`
            : 'No login recorded'}
        </Text>

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
            onPress={() => onEdit(user)}
          >
            <Edit2 size={14} color="#2563EB" />
            <Text style={styles.editBtnText}>Edit</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.statusToggleBtn,
              user.status === 'active' ? styles.deactivateBtn : styles.activateBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => onToggleStatus(user)}
          >
            {user.status === 'active' ? (
              <>
                <Slash size={13} color="#DC2626" />
                <Text style={styles.deactivateBtnText}>Deactivate</Text>
              </>
            ) : (
              <>
                <UserCheck size={13} color="#16A34A" />
                <Text style={styles.activateBtnText}>Activate</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
    flex: 1,
  },
  email: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  orgBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '55%',
  },
  orgText: {
    fontSize: 11,
    color: '#475569',
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingTop: 4,
  },
  facilityLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginRight: 6,
  },
  facilityTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  facilityTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  facilityTagText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  loginTimestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  editBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  deactivateBtn: {
    backgroundColor: '#FEF2F2',
  },
  deactivateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  activateBtn: {
    backgroundColor: '#F0FDF4',
  },
  activateBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});

export default UserCard;

