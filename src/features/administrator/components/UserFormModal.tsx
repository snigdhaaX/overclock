import { Check, Info, X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ROLES, UserRole } from '../../../types/roles';
import { AccountStatus, AdminUser } from '../types';

interface UserFormModalProps {
  visible: boolean;
  userToEdit?: AdminUser | null;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    email: string;
    organization: string;
    assignedRole: UserRole;
    phoneNumber?: string;
    status?: AccountStatus;
  }) => void;
}

const UserFormContent: React.FC<{
  userToEdit?: AdminUser | null;
  onClose: () => void;
  onSubmit: (formData: {
    name: string;
    email: string;
    organization: string;
    assignedRole: UserRole;
    phoneNumber?: string;
    status?: AccountStatus;
  }) => void;
}> = ({ userToEdit, onClose, onSubmit }) => {
  const isEditing = Boolean(userToEdit);

  const [name, setName] = useState(userToEdit?.name || '');
  const [email, setEmail] = useState(userToEdit?.email || '');
  const [organization, setOrganization] = useState(
    userToEdit?.organization || 'Apex Global Logistics'
  );
  const [assignedRole, setAssignedRole] = useState<UserRole>(
    userToEdit?.assignedRole || 'operations-analyst'
  );
  const [phoneNumber, setPhoneNumber] = useState(userToEdit?.phoneNumber || '');
  const [status] = useState<AccountStatus>(userToEdit?.status || 'active');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full name is required';
    if (!email.trim()) {
      errs.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please provide a valid enterprise email';
    }
    if (!organization.trim()) errs.organization = 'Organization is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSubmit({
      name: name.trim(),
      email: email.trim(),
      organization: organization.trim(),
      assignedRole,
      phoneNumber: phoneNumber.trim() || undefined,
      status,
    });
  };

  const rolesList: UserRole[] = [
    'operations-analyst',
    'supply-chain-manager',
    'warehouse-operator',
    'procurement-approver',
    'administrator',
  ];

  return (
    <View style={styles.sheet}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{isEditing ? 'Edit User Account' : 'Provision New User'}</Text>
          <Text style={styles.subtitle}>
            {isEditing ? 'Update enterprise access permissions' : 'Create authorized account credentials'}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color="#64748B" />
        </Pressable>
      </View>

      <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
        {/* Full Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={(t) => {
              setName(t);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
            placeholder="e.g. Vikram Malhotra"
            placeholderTextColor="#94A3B8"
          />
          {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
        </View>

        {/* Email Address */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Work Email Address *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              if (errors.email) setErrors({ ...errors, email: '' });
            }}
            placeholder="vikram@company.com"
            placeholderTextColor="#94A3B8"
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!isEditing}
          />
          {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          {isEditing && (
            <Text style={styles.fieldNote}>Work email cannot be changed after account provisioning.</Text>
          )}
        </View>

        {/* Organization */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Tenant Organization *</Text>
          <TextInput
            style={[styles.input, errors.organization && styles.inputError]}
            value={organization}
            onChangeText={(t) => {
              setOrganization(t);
              if (errors.organization) setErrors({ ...errors, organization: '' });
            }}
            placeholder="e.g. Apex Global Logistics"
            placeholderTextColor="#94A3B8"
          />
          {errors.organization && <Text style={styles.errorText}>{errors.organization}</Text>}
        </View>

        {/* Phone Number */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number (Optional)</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="+91 98200 12345"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
          />
        </View>

        {/* Assigned Role Selector */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Assigned Enterprise Role *</Text>
          <View style={styles.roleGrid}>
            {rolesList.map((rk) => {
              const rDef = ROLES[rk];
              const isSelected = assignedRole === rk;
              return (
                <Pressable
                  key={rk}
                  style={[
                    styles.roleChip,
                    isSelected && {
                      backgroundColor: rDef.lightColor,
                      borderColor: rDef.badgeColor,
                    },
                  ]}
                  onPress={() => setAssignedRole(rk)}
                >
                  <View style={[styles.roleDot, { backgroundColor: rDef.badgeColor }]} />
                  <Text
                    style={[
                      styles.roleChipText,
                      isSelected && { color: rDef.badgeColor, fontWeight: '700' },
                    ]}
                  >
                    {rDef.title}
                  </Text>
                  {isSelected && <Check size={14} color={rDef.badgeColor} style={{ marginLeft: 'auto' }} />}
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Security Notice */}
        <View style={styles.securityBox}>
          <Info size={16} color="#0D9488" style={{ marginRight: 8, marginTop: 2 }} />
          <Text style={styles.securityText}>
            Enterprise Security: Passwords and tokens are never shown or stored in plain-text. A secure invitation token is dispatched to the user&apos;s verified email.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </Pressable>

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{isEditing ? 'Save Changes' : 'Provision User'}</Text>
        </Pressable>
      </View>
    </View>
  );
};

export const UserFormModal: React.FC<UserFormModalProps> = ({
  visible,
  userToEdit,
  onClose,
  onSubmit,
}) => {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {visible && (
          <UserFormContent
            key={userToEdit ? userToEdit.id : 'new_user'}
            userToEdit={userToEdit}
            onClose={onClose}
            onSubmit={onSubmit}
          />
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  formScroll: {
    maxHeight: 460,
  },
  formGroup: {
    marginBottom: 14,
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
    fontSize: 14,
    color: '#0F172A',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    fontWeight: '600',
  },
  fieldNote: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  roleGrid: {
    gap: 8,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  roleChipText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '500',
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
  },
  securityText: {
    fontSize: 11,
    color: '#0D9488',
    lineHeight: 16,
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
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
    backgroundColor: '#FFFFFF',
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

export default UserFormModal;
