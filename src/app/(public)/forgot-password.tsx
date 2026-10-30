import { useRouter } from 'expo-router';
import { CheckCircle2, KeyRound, Mail } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import FormInput from '../../components/FormInput';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import Colors from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';
import authService from '../../services/auth';
import { validateEmail } from '../../services/validation';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleReset = async () => {
    const err = validateEmail(email);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await authService.resetPassword(email);
      setIsLoading(false);
      setSuccessMessage(res.message);
    } catch {
      setIsLoading(false);
      setError('Unable to process password reset. Please try again.');
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
      <View style={styles.iconHeader}>
        <View style={styles.iconCircle}>
          <KeyRound size={28} color={Colors.primary} />
        </View>
        <Text style={styles.heading}>Reset your password</Text>
        <Text style={styles.subtitle}>
          Enter your enterprise work email and we&apos;ll transmit a secure recovery link.
        </Text>
      </View>

      {successMessage ? (
        <View style={styles.successCard}>
          <CheckCircle2 size={36} color={Colors.success} style={{ marginBottom: 12 }} />
          <Text style={styles.successTitle}>Recovery Link Dispatched</Text>
          <Text style={styles.successDesc}>{successMessage}</Text>

          <PrimaryButton
            title="Return to Sign In"
            onPress={() => router.replace('/(public)/signin')}
            size="lg"
            style={{ width: '100%', marginTop: 20 }}
          />
        </View>
      ) : (
        <View style={styles.formSection}>
          <FormInput
            label="Work Email"
            value={email}
            onChangeText={(val) => {
              setEmail(val);
              if (error) setError(null);
            }}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            error={error}
            leftIcon={<Mail size={18} color={Colors.textSecondary} />}
          />

          <PrimaryButton
            title="Send Recovery Link"
            onPress={handleReset}
            isLoading={isLoading}
            size="lg"
            style={{ width: '100%', marginTop: 8 }}
          />

          <Pressable
            onPress={() => router.replace('/(public)/signin')}
            style={styles.backToSignBtn}
          >
            <Text style={styles.backToSignText}>Back to Sign In</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  iconHeader: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  heading: {
    ...Typography.h1,
    fontSize: 22,
    color: Colors.deepNavy,
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.md,
  },
  formSection: {
    width: '100%',
  },
  backToSignBtn: {
    alignSelf: 'center',
    marginTop: Spacing.lg,
    padding: Spacing.xs,
  },
  backToSignText: {
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
  },
  successTitle: {
    ...Typography.h2,
    fontSize: 18,
    color: Colors.deepNavy,
    marginBottom: 8,
  },
  successDesc: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
