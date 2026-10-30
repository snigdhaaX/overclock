import { useRouter } from 'expo-router';
import { AlertCircle, Check, Lock, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from './BrandLogo';
import FormInput from './FormInput';
import IllustrationPanel from './IllustrationPanel';
import PrimaryButton from './PrimaryButton';
import ScreenContainer from './ScreenContainer';
import Colors from '../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../constants/spacing';
import Typography from '../constants/typography';
import useAuth from '../hooks/useAuth';
import { validateLoginForm } from '../services/validation';
import { ROLES, UserRole } from '../types/roles';

interface RoleLoginTemplateProps {
  roleId: UserRole;
  defaultEmail?: string;
}

export const RoleLoginTemplate: React.FC<RoleLoginTemplateProps> = ({
  roleId,
  defaultEmail,
}) => {
  const router = useRouter();
  const role = ROLES[roleId];
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSignIn = async () => {
    clearError();
    setErrorMessage(null);

    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      return;
    }
    setFormErrors({});

    try {
      const session = await login({
        email,
        password,
        requestedRole: roleId,
        rememberMe,
      });

      // Navigate to authorized role dashboard
      if (session.user.assignedRole === 'operations-analyst') {
        router.replace('/(protected)/operations-analyst/home');
      } else if (session.user.assignedRole === 'supply-chain-manager') {
        router.replace('/(protected)/supply-chain-manager/home' as any);
      } else if (session.user.assignedRole === 'warehouse-operator') {
        router.replace('/(protected)/warehouse-operator/home' as any);
      } else if (session.user.assignedRole === 'procurement-approver') {
        router.replace('/(protected)/procurement-approver/home' as any);
      } else if (session.user.assignedRole === 'administrator') {
        router.replace('/(protected)/administrator/home' as any);
      } else {
        router.replace(`/(protected)/dashboard?role=${session.user.assignedRole}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Authentication failed. Please verify credentials.');
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
      {/* Role Title Section matching the screenshot */}
      <View style={styles.headerSection}>
        <Text style={styles.roleTitle}>{role.title}</Text>
        <Text style={styles.roleSubtitle}>{role.description}</Text>
      </View>

      {/* Role-Specific Authorization Error Banner */}
      {(errorMessage || error) && (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={Colors.danger} style={{ marginRight: 8, flexShrink: 0 }} />
          <Text style={styles.errorBannerText}>{errorMessage || error?.message}</Text>
        </View>
      )}

      {/* Login Card */}
      <View style={styles.loginCard}>
        <FormInput
          label="Work Email"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
          }}
          placeholder="Enter enterprise email"
          keyboardType="email-address"
          autoCapitalize="none"
          error={formErrors.email}
          leftIcon={<Mail size={18} color={Colors.textSecondary} />}
        />

        <FormInput
          label="Password"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (formErrors.password) setFormErrors({ ...formErrors, password: '' });
          }}
          placeholder="Enter password"
          secureTextEntry
          error={formErrors.password}
          leftIcon={<Lock size={18} color={Colors.textSecondary} />}
        />

        {/* Options Row: Remember Me & Forgot Password */}
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => setRememberMe(!rememberMe)}
            hitSlop={8}
            style={styles.rememberMeContainer}
          >
            <View
              style={[
                styles.checkbox,
                rememberMe && {
                  backgroundColor: role.badgeColor,
                  borderColor: role.badgeColor,
                },
              ]}
            >
              {rememberMe && <Check size={12} color={Colors.white} strokeWidth={3} />}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(public)/forgot-password')}
            hitSlop={8}
          >
            <Text style={[styles.forgotPasswordText, { color: role.badgeColor }]}>
              Forgot password?
            </Text>
          </Pressable>
        </View>

        {/* Role-Accented Sign In Button */}
        <PrimaryButton
          title="Sign In"
          onPress={handleSignIn}
          isLoading={isLoading}
          size="lg"
          style={[styles.signInButton, { backgroundColor: role.badgeColor }]}
        />
      </View>

      {/* Role-Specific Artwork Panel Directly Below Login Card */}
      <IllustrationPanel role={roleId} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  roleTitle: {
    ...Typography.h1,
    fontSize: 22,
    fontWeight: '700',
    color: Colors.deepNavy,
    textAlign: 'center',
    marginBottom: 4,
  },
  roleSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
    paddingHorizontal: Spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  errorBannerText: {
    ...Typography.bodySmall,
    color: Colors.danger,
    flex: 1,
  },
  loginCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    ...Shadows.subtle,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    marginTop: 2,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rememberMeText: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  forgotPasswordText: {
    ...Typography.labelMedium,
    fontSize: 13,
    fontWeight: '600',
  },
  signInButton: {
    width: '100%',
  },
});

export default RoleLoginTemplate;
