import { useRouter } from 'expo-router';
import { ArrowLeft, Info } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import PrimaryButton from '../../components/PrimaryButton';
import RoleCard from '../../components/RoleCard';
import ScreenContainer from '../../components/ScreenContainer';
import Colors from '../../constants/colors';
import { BorderRadius, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';
import { ROLES, UserRole } from '../../types/roles';

export default function RoleSelectionScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole>('operations-analyst');

  const handleContinue = () => {
    // Navigate to registration form with the requested role parameter
    router.push(`/(public)/signup?requestedRole=${selectedRole}`);
  };

  return (
    <ScreenContainer
      backgroundColor="#FFFFFF"
      statusBarStyle="dark-content"
      onBack={() => router.back()}
      headerTitle={<BrandLogo variant="dark" size="sm" layout="horizontal" />}
      contentContainerStyle={styles.container}
    >
      {/* Title & Description */}
      <View style={styles.titleSection}>
        <Text style={styles.mainHeading}>Create your account</Text>
        <Text style={styles.subtitle}>
          Join TRUSTCHAIN and be part of a smarter, more resilient supply chain.
        </Text>

        {/* 3-Step Stepper Progress Bar matching screenshot */}
        <View style={styles.stepperContainer}>
          <View style={[styles.stepBar, styles.stepBarActive]} />
          <View style={[styles.stepBar, styles.stepBarInactive]} />
          <View style={[styles.stepBar, styles.stepBarInactive]} />
        </View>
      </View>

      {/* Role Selection Cards */}
      <View style={styles.rolesList}>
        {(Object.keys(ROLES) as UserRole[]).map((roleKey) => {
          const roleDef = ROLES[roleKey];
          return (
            <RoleCard
              key={roleKey}
              role={roleDef}
              isSelected={selectedRole === roleKey}
              onSelect={() => setSelectedRole(roleKey)}
            />
          );
        })}
      </View>

      {/* Governance Notice */}
      <View style={styles.governanceNote}>
        <Info size={16} color={Colors.primary} style={styles.govIcon} />
        <Text style={styles.governanceText}>
          Roles with administrative or financial authority require enterprise invitation or administrator verification before activation.
        </Text>
      </View>

      {/* Continue CTA */}
      <View style={styles.footer}>
        <PrimaryButton
          title="Continue"
          onPress={handleContinue}
          size="lg"
          style={styles.continueButton}
        />
      </View>
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
    fontSize: 24,
    color: Colors.deepNavy,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing.sm,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  stepBar: {
    height: 4,
    borderRadius: 2,
  },
  stepBarActive: {
    width: 36,
    backgroundColor: Colors.primary,
  },
  stepBarInactive: {
    width: 20,
    backgroundColor: '#E2E8F0',
  },
  rolesList: {
    width: '100%',
    marginVertical: Spacing.xs,
  },
  governanceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  govIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  governanceText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.deepNavy,
    lineHeight: 16,
    flex: 1,
  },
  footer: {
    width: '100%',
    marginTop: Spacing.sm,
  },
  continueButton: {
    width: '100%',
  },
});
