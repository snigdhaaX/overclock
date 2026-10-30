import { useRouter } from 'expo-router';
import {
  AlertCircle,
  Apple,
  Check,
  Lock,
  Mail,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import BrandLogo from '../../components/BrandLogo';
import FormInput from '../../components/FormInput';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import Colors from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';
import useAuth from '../../hooks/useAuth';
import { validateLoginForm } from '../../services/validation';
import { ROLES } from '../../types/roles';

// Custom SVG Icons for Google and Microsoft SSO
const GoogleIcon = () => (
  <Svg width="20" height="20" viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

const MicrosoftIcon = () => (
  <Svg width="18" height="18" viewBox="0 0 23 23">
    <Rect x="1" y="1" width="10" height="10" fill="#F25022" />
    <Rect x="12" y="1" width="10" height="10" fill="#7FBA00" />
    <Rect x="1" y="12" width="10" height="10" fill="#00A4EF" />
    <Rect x="12" y="12" width="10" height="10" fill="#FFB900" />
  </Svg>
);

export default function SignInScreen() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('anish@company.com');
  const [password, setPassword] = useState('password123');
  const [rememberMe, setRememberMe] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  const handleSignIn = async () => {
    clearError();
    setAuthErrorMsg(null);

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
        rememberMe,
      });

      // Role-based navigation based on actual backend-assigned role
      const userRole = session.user.assignedRole;
      router.replace(`/(protected)/dashboard?role=${userRole}`);
    } catch (err: any) {
      setAuthErrorMsg(err?.message || 'Authentication failed. Please verify credentials.');
    }
  };

  return (
    <ScreenContainer
      backgroundColor="#FFFFFF"
      statusBarStyle="dark-content"
      onBack={() => router.back()}
      contentContainerStyle={styles.container}
    >
      {/* Top TRUSTCHAIN Brand Logo */}
      <View style={styles.brandHeader}>
        <BrandLogo variant="dark" size="md" layout="stacked" />
      </View>

      {/* Heading & Subtitle */}
      <View style={styles.titleSection}>
        <Text style={styles.welcomeTitle}>Welcome back!</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>
      </View>

      {/* Auth Error Banner if needed */}
      {(authErrorMsg || error) && (
        <View style={styles.errorBanner}>
          <AlertCircle size={18} color={Colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.errorBannerText}>{authErrorMsg || error?.message}</Text>
        </View>
      )}

      {/* Form Fields */}
      <View style={styles.formSection}>
        <FormInput
          label="Email"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (formErrors.email) setFormErrors({ ...formErrors, email: '' });
          }}
          placeholder="anish@company.com"
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
          placeholder="Enter your password"
          secureTextEntry
          error={formErrors.password}
          leftIcon={<Lock size={18} color={Colors.textSecondary} />}
        />

        {/* Remember Me and Forgot Password Row */}
        <View style={styles.optionsRow}>
          <Pressable
            onPress={() => setRememberMe(!rememberMe)}
            hitSlop={8}
            style={styles.rememberMeContainer}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Check size={12} color={Colors.white} strokeWidth={3} />}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(public)/forgot-password')}
            hitSlop={8}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </Pressable>
        </View>

        {/* Primary Sign In Button */}
        <PrimaryButton
          title="Sign In"
          onPress={handleSignIn}
          isLoading={isLoading}
          size="lg"
          style={styles.signInButton}
        />

        {/* Role Portal Selector Button */}
        <Pressable
          onPress={() => router.push('/(public)/choose-workspace')}
          style={({ pressed }) => [
            styles.workspaceSelectorBtn,
            pressed && styles.workspaceSelectorBtnPressed,
          ]}
        >
          <View style={styles.workspaceSelectorLeft}>
            <View style={styles.workspaceDot} />
            <Text style={styles.workspaceSelectorText}>Access Role Workspace Portal</Text>
          </View>
          <Text style={styles.workspaceArrow}>→</Text>
        </Pressable>

        {/* Divider with "or" */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* SSO / Identity Providers */}
        <View style={styles.ssoRow}>
          <Pressable
            onPress={() => handleSignIn()}
            style={({ pressed }) => [styles.ssoButton, pressed && styles.ssoButtonPressed]}
          >
            <GoogleIcon />
          </Pressable>

          <Pressable
            onPress={() => handleSignIn()}
            style={({ pressed }) => [styles.ssoButton, pressed && styles.ssoButtonPressed]}
          >
            <MicrosoftIcon />
          </Pressable>

          <Pressable
            onPress={() => handleSignIn()}
            style={({ pressed }) => [styles.ssoButton, pressed && styles.ssoButtonPressed]}
          >
            <Apple size={20} color={Colors.deepNavy} />
          </Pressable>
        </View>

        {/* Create Account Link */}
        <View style={styles.signupFooter}>
          <Text style={styles.signupFooterText}>Don&apos;t have an account? </Text>
          <Pressable
            onPress={() => router.push('/(public)/signup')}
            hitSlop={8}
          >
            <Text style={styles.signupLink}>Sign up</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xxl,
  },
  brandHeader: {
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeTitle: {
    ...Typography.h1,
    fontSize: 24,
    color: Colors.deepNavy,
    marginBottom: 4,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
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
  formSection: {
    width: '100%',
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
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
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rememberMeText: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  forgotPasswordText: {
    ...Typography.labelMedium,
    fontSize: 13,
    color: Colors.primary,
  },
  signInButton: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  workspaceSelectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0F7FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: BorderRadius.md,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: Spacing.md,
  },
  workspaceSelectorBtnPressed: {
    backgroundColor: '#E0EFFF',
  },
  workspaceSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  workspaceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 8,
  },
  workspaceSelectorText: {
    ...Typography.labelMedium,
    color: Colors.primary,
    fontWeight: '600',
    fontSize: 13,
  },
  workspaceArrow: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '700',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
    textTransform: 'lowercase',
  },
  ssoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: Spacing.xl,
  },
  ssoButton: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  ssoButtonPressed: {
    backgroundColor: Colors.lightBlue,
    transform: [{ scale: 0.98 }],
  },
  signupFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  signupFooterText: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
  },
  signupLink: {
    ...Typography.labelMedium,
    color: Colors.primary,
    fontWeight: '700',
  },
});
