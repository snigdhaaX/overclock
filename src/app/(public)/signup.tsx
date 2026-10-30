import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  Building,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  Phone,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import FormInput from '../../components/FormInput';
import PrimaryButton from '../../components/PrimaryButton';
import RoleCard from '../../components/RoleCard';
import ScreenContainer from '../../components/ScreenContainer';
import Colors from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';
import useAuth from '../../hooks/useAuth';
import { validateRegistrationForm } from '../../services/validation';
import { ROLES, UserRole } from '../../types/roles';

export default function SignUpScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestedRole?: string }>();
  const initialRole: UserRole =
    (params.requestedRole as UserRole) || 'operations-analyst';

  const [requestedRole, setRequestedRole] = useState<UserRole>(initialRole);
  const roleDef = ROLES[requestedRole] || ROLES['operations-analyst'];
  const { register, isLoading, error } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [organization, setOrganization] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitationCode, setInvitationCode] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [successInfo, setSuccessInfo] = useState<{
    message: string;
    requiresApproval: boolean;
  } | null>(null);

  const handleRegister = async () => {
    const validation = validateRegistrationForm(name, email, password, organization);
    const newErrors = { ...validation.errors };

    if (!phone || phone.trim().length < 7) {
      newErrors.phone = 'Valid phone number is required';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password';
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setFormErrors(newErrors);
      return;
    }
    setFormErrors({});

    try {
      const res = await register({
        name,
        email,
        organization,
        password,
        requestedRole,
        invitationCode,
      });

      setSuccessInfo({
        message: res.message,
        requiresApproval: res.requiresApproval,
      });
    } catch (err) {
      // Handled via useAuth error state
    }
  };

  return (
    <ScreenContainer
      backgroundColor="#FFFFFF"
      statusBarStyle="dark-content"
      onBack={() => router.back()}
      headerTitle={<BrandLogo variant="dark" size="sm" layout="horizontal" />}
      contentContainerStyle={styles.container}
    >
      {/* Title */}
      <View style={styles.titleSection}>
        <Text style={styles.mainHeading}>Create your account</Text>
        <Text style={styles.subtitle}>Join TRUSTCHAIN and be part of a smarter, more resilient supply chain.</Text>
      </View>

      {/* Success View */}
      {successInfo ? (
        <View style={styles.successCard}>
          <CheckCircle2 size={44} color={Colors.success} style={{ marginBottom: 12 }} />
          <Text style={styles.successHeading}>
            {successInfo.requiresApproval ? 'Request Submitted' : 'Registration Complete'}
          </Text>
          <Text style={styles.successDesc}>{successInfo.message}</Text>

          <PrimaryButton
            title="Proceed to Sign In"
            onPress={() => router.replace('/(public)/signin')}
            size="lg"
            style={{ width: '100%', marginTop: 20 }}
          />
        </View>
      ) : (
        <View style={styles.formSection}>
          {error && (
            <View style={styles.errorBanner}>
              <AlertCircle size={18} color={Colors.danger} style={{ marginRight: 8 }} />
              <Text style={styles.errorBannerText}>{error.message}</Text>
            </View>
          )}

          <FormInput
            label="Full Name"
            value={name}
            onChangeText={(val) => {
              setName(val);
              if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
            }}
            placeholder="Jane Doe"
            error={formErrors.name}
            leftIcon={<UserIcon size={18} color={Colors.textSecondary} />}
          />

          <FormInput
            label="Work Email"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
            }}
            placeholder="jane@organization.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={formErrors.email}
            leftIcon={<Mail size={18} color={Colors.textSecondary} />}
          />

          <FormInput
            label="Phone Number"
            value={phone}
            onChangeText={(val) => {
              setPhone(val);
              if (formErrors.phone) setFormErrors({ ...formErrors, phone: '' });
            }}
            placeholder="+1 (555) 019-2834"
            keyboardType="phone-pad"
            error={formErrors.phone}
            leftIcon={<Phone size={18} color={Colors.textSecondary} />}
          />

          <FormInput
            label="Organization"
            value={organization}
            onChangeText={(val) => {
              setOrganization(val);
              if (formErrors.organization) setFormErrors({ ...formErrors, organization: '' });
            }}
            placeholder="Acme Supply Chain Logistics"
            error={formErrors.organization}
            leftIcon={<Building size={18} color={Colors.textSecondary} />}
          />

          <FormInput
            label="Password"
            value={password}
            onChangeText={(val) => {
              setPassword(val);
              if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
            }}
            placeholder="At least 6 characters"
            secureTextEntry
            error={formErrors.password}
            leftIcon={<Lock size={18} color={Colors.textSecondary} />}
          />

          <FormInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(val) => {
              setConfirmPassword(val);
              if (formErrors.confirmPassword) setFormErrors({ ...formErrors, confirmPassword: '' });
            }}
            placeholder="Re-enter your password"
            secureTextEntry
            error={formErrors.confirmPassword}
            leftIcon={<Lock size={18} color={Colors.textSecondary} />}
          />

          {/* Requested Role Picker Section */}
          <View style={styles.rolePickerHeader}>
            <Text style={styles.rolePickerTitle}>Select Requested Role</Text>
            <Text style={styles.rolePickerSubtitle}>
              Choose the workspace authority level you are requesting:
            </Text>
          </View>

          <View style={styles.rolesList}>
            {(Object.keys(ROLES) as UserRole[]).map((roleKey) => {
              const r = ROLES[roleKey];
              return (
                <RoleCard
                  key={roleKey}
                  role={r}
                  isSelected={requestedRole === roleKey}
                  onSelect={() => setRequestedRole(roleKey)}
                />
              );
            })}
          </View>

          {roleDef.adminApprovalRequired && (
            <FormInput
              label="Enterprise Invitation Code (Optional)"
              value={invitationCode}
              onChangeText={setInvitationCode}
              placeholder="e.g. TC-INV-9821"
              leftIcon={<KeyRound size={18} color={Colors.textSecondary} />}
            />
          )}

          {roleDef.adminApprovalRequired && (
            <View style={styles.governanceNotice}>
              <ShieldAlert size={18} color="#D97706" style={{ marginRight: 8, flexShrink: 0 }} />
              <Text style={styles.governanceNoticeText}>
                Governance Compliance: As a {roleDef.title}, this registration represents a request and requires administrator verification prior to elevated authority enablement.
              </Text>
            </View>
          )}

          <PrimaryButton
            title="Create Account"
            onPress={handleRegister}
            isLoading={isLoading}
            size="lg"
            style={styles.submitBtn}
          />

          <View style={styles.loginLinkRow}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <Pressable onPress={() => router.push('/(public)/signin')}>
              <Text style={styles.loginLinkAction}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  titleSection: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  mainHeading: {
    ...Typography.h1,
    fontSize: 22,
    color: Colors.deepNavy,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  stepperContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  stepBar: {
    height: 4,
    borderRadius: 2,
  },
  stepBarDone: {
    width: 24,
    backgroundColor: '#93C5FD',
  },
  stepBarActive: {
    width: 36,
    backgroundColor: Colors.primary,
  },
  stepBarInactive: {
    width: 20,
    backgroundColor: '#E2E8F0',
  },
  roleBadgeContainer: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    marginTop: 6,
  },
  roleBadgeText: {
    ...Typography.labelMedium,
    fontSize: 12,
  },
  rolePickerHeader: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  rolePickerTitle: {
    ...Typography.labelLarge,
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  rolePickerSubtitle: {
    ...Typography.bodySmall,
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    marginBottom: Spacing.xs,
  },
  rolesList: {
    width: '100%',
    marginBottom: Spacing.md,
    gap: 8,
  },
  formSection: {
    width: '100%',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  errorBannerText: {
    ...Typography.bodySmall,
    color: Colors.danger,
    flex: 1,
  },
  governanceNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  governanceNoticeText: {
    ...Typography.bodySmall,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  submitBtn: {
    width: '100%',
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  loginLinkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  loginLinkText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  loginLinkAction: {
    ...Typography.labelMedium,
    color: Colors.primary,
  },
  successCard: {
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
    marginVertical: Spacing.lg,
  },
  successHeading: {
    ...Typography.h2,
    color: Colors.deepNavy,
    marginBottom: 8,
  },
  successDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});
