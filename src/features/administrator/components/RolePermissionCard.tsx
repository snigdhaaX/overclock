import { Check, Lock } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { UserRole } from '../../../types/roles';
import { PermissionItem } from '../types';

interface RolePermissionCardProps {
  permission: PermissionItem;
  selectedRole: UserRole;
  onToggle: (permissionId: string) => void;
}

export const RolePermissionCard: React.FC<RolePermissionCardProps> = ({
  permission,
  selectedRole,
  onToggle,
}) => {
  const isGranted = permission.roles.includes(selectedRole);
  const isProtectedAdminPerm =
    selectedRole === 'administrator' &&
    (permission.id === 'perm_admin_users' ||
      permission.id === 'perm_admin_policies' ||
      permission.id === 'perm_admin_integrations');

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isGranted && styles.cardGranted,
        isProtectedAdminPerm && styles.cardLocked,
        pressed && !isProtectedAdminPerm && styles.cardPressed,
      ]}
      onPress={() => !isProtectedAdminPerm && onToggle(permission.id)}
      disabled={isProtectedAdminPerm}
    >
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.label}>{permission.label}</Text>
          {isProtectedAdminPerm ? (
            <View style={styles.lockBadge}>
              <Lock size={12} color="#475569" />
              <Text style={styles.lockText}>Required</Text>
            </View>
          ) : (
            <View
              style={[
                styles.checkbox,
                isGranted && styles.checkboxChecked,
              ]}
            >
              {isGranted && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
            </View>
          )}
        </View>
        <Text style={styles.description}>{permission.description}</Text>
        <Text style={styles.permissionCode}>{permission.id}</Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  cardGranted: {
    borderColor: '#94A3B8',
    backgroundColor: '#F8FAFC',
  },
  cardLocked: {
    backgroundColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
  cardPressed: {
    opacity: 0.85,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    flex: 1,
    marginRight: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  lockText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 4,
  },
  permissionCode: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#94A3B8',
  },
});

export default RolePermissionCard;

