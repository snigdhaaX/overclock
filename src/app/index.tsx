import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  Menu,
  Shield,
  Sparkles,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import BrandLogo from '../components/BrandLogo';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import Colors from '../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../constants/spacing';
import Typography from '../constants/typography';
import { ROLES, UserRole } from '../types/roles';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function LandingScreen() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exploreModalVisible, setExploreModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Full Background Container Image with atmospheric container ship & glowing nodes */}
      <View style={styles.backgroundImageWrapper}>
        <Image
          source={require('../../assets/images/landing_hero.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Balanced Gradient: subtle dark top for readability, clear vibrant ship in center, and soft navy shade at bottom */}
        <LinearGradient
          colors={[
            'rgba(10, 23, 51, 0.75)',
            'rgba(10, 23, 51, 0.35)',
            'transparent',
            'rgba(10, 23, 51, 0.45)',
            'rgba(6, 14, 33, 0.85)',
          ]}
          locations={[0, 0.32, 0.52, 0.78, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <BrandLogo variant="light" size="sm" layout="horizontal" />

          <Pressable
            onPress={() => setMenuOpen(true)}
            hitSlop={12}
            style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
          >
            <Menu size={22} color={Colors.white} />
          </Pressable>
        </View>

        {/* Scrollable Content for mobile responsiveness */}
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero Section */}
          <View style={styles.heroSection}>
            {/* Live Indicator Pill */}
            <View style={styles.liveBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBadgeText}>ENTERPRISE AI PLATFORM</Text>
            </View>

            <Text style={styles.headline}>
              Don&apos;t just detect{'\n'}disruptions.{'\n'}
              <Text style={styles.headlineAccent}>Resolve their{'\n'}consequences.</Text>
            </Text>

            <Text style={styles.description}>
              AI-powered supply chain intelligence, recovery and accountability platform.
            </Text>
          </View>

          {/* Flexible Spacer to expose the dramatic container ship visual */}
          <View style={styles.visualSpacer} />

          {/* Actions & Credibility Footer */}
          <View style={styles.bottomSection}>
            <PrimaryButton
              title="Get Started"
              onPress={() => router.push('/(public)/onboarding')}
              size="lg"
              style={styles.primaryCta}
            />

            <SecondaryButton
              title="Explore Platform"
              onPress={() => setExploreModalVisible(true)}
              variant="glass"
              size="lg"
              style={styles.secondaryCta}
            />

            {/* Credibility Indicators */}
            <View style={styles.credibilityRow}>
              <View style={styles.credibilityItem}>
                <Zap size={13} color="#38BDF8" style={styles.credIcon} />
                <Text style={styles.credibilityText}>Supply-chain visibility</Text>
              </View>

              <View style={styles.credibilityDot} />

              <View style={styles.credibilityItem}>
                <TrendingUp size={13} color="#38BDF8" style={styles.credIcon} />
                <Text style={styles.credibilityText}>Faster recovery</Text>
              </View>

              <View style={styles.credibilityDot} />

              <View style={styles.credibilityItem}>
                <Shield size={13} color="#38BDF8" style={styles.credIcon} />
                <Text style={styles.credibilityText}>Accountability</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Explore Platform Feature Modal */}
      <Modal
        visible={exploreModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setExploreModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>TRUSTCHAIN Architecture</Text>
              <Pressable
                onPress={() => setExploreModalVisible(false)}
                hitSlop={10}
                style={styles.modalCloseButton}
              >
                <X size={20} color={Colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSubtitle}>
                Enterprise AI-driven disruption management designed for mission-critical supply networks:
              </Text>

              <View style={styles.modalFeature}>
                <Text style={styles.modalFeatureTitle}>• Autonomous Disruption Detection</Text>
                <Text style={styles.modalFeatureDesc}>
                  Real-time telemetry ingestion across AIS shipping data, port congestions, and weather disruptions.
                </Text>
              </View>

              <View style={styles.modalFeature}>
                <Text style={styles.modalFeatureTitle}>• Dynamic Impact Assessment</Text>
                <Text style={styles.modalFeatureDesc}>
                  Downstream cascading risk modeling from raw materials to final customer order delivery.
                </Text>
              </View>

              <View style={styles.modalFeature}>
                <Text style={styles.modalFeatureTitle}>• Governed Role Workflows</Text>
                <Text style={styles.modalFeatureDesc}>
                  Granular role permissions with verifiable cryptographic audit trails.
                </Text>
              </View>
            </ScrollView>

            <PrimaryButton
              title="Continue to Onboarding"
              onPress={() => {
                setExploreModalVisible(false);
                router.push('/(public)/onboarding');
              }}
              style={{ marginTop: 16 }}
            />
          </View>
        </View>
      </Modal>

      {/* Hamburger Navigation Modal */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuOpen(false)}
      >
        <View style={styles.menuBackdrop}>
          <SafeAreaView style={styles.menuSafeArea} edges={['top', 'bottom']}>
            <View style={styles.menuHeader}>
              <BrandLogo variant="dark" size="sm" />
              <Pressable
                onPress={() => setMenuOpen(false)}
                hitSlop={12}
                style={styles.menuCloseBtn}
              >
                <X size={22} color={Colors.deepNavy} />
              </Pressable>
            </View>

            <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.menuSectionHeader}>PUBLIC EXPERIENCE</Text>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/(public)/onboarding');
                }}
              >
                <Text style={styles.menuItemText}>Onboarding Experience (3 Slides)</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/(public)/signin');
                }}
              >
                <Text style={styles.menuItemText}>Sign In</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/(public)/choose-workspace');
                }}
              >
                <Text style={styles.menuItemText}>Choose Your Workspace</Text>
              </Pressable>

              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push('/(public)/signup');
                }}
              >
                <Text style={styles.menuItemText}>Create Account / Sign Up</Text>
              </Pressable>

              <Text style={[styles.menuSectionHeader, { marginTop: 20 }]}>
                ROLE-SPECIFIC AUTHENTICATION
              </Text>

              {Object.values(ROLES).map((role) => (
                <Pressable
                  key={role.id}
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    router.push(role.route as any);
                  }}
                >
                  <View style={[styles.roleDot, { backgroundColor: role.badgeColor }]} />
                  <Text style={styles.menuItemText}>{role.title}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A1733',
  },
  backgroundImageWrapper: {
    ...StyleSheet.absoluteFill,
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    zIndex: 10,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  menuButtonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xl,
  },
  heroSection: {
    marginTop: Spacing.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.45)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.md,
  },
  livePulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#38BDF8',
    marginRight: 6,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E0F2FE',
    letterSpacing: 0.8,
  },
  headline: {
    ...Typography.hero,
    fontSize: 30,
    lineHeight: 38,
    color: Colors.white,
    letterSpacing: -0.6,
  },
  headlineAccent: {
    color: '#38BDF8',
    fontWeight: '800',
  },
  description: {
    ...Typography.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: '#CBD5E1',
    marginTop: Spacing.md,
    maxWidth: 340,
  },
  visualSpacer: {
    flex: 1,
    minHeight: 40,
  },
  bottomSection: {
    width: '100%',
    alignItems: 'center',
  },
  primaryCta: {
    width: '100%',
    marginBottom: Spacing.sm,
  },
  secondaryCta: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  credibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  credibilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  credIcon: {
    marginRight: 4,
  },
  credibilityText: {
    ...Typography.caption,
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
  credibilityDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 23, 51, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    ...Shadows.elevated,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  modalTitle: {
    ...Typography.h2,
    fontSize: 20,
    color: Colors.deepNavy,
  },
  modalCloseButton: {
    padding: Spacing.xs,
  },
  modalSubtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  modalFeature: {
    marginBottom: Spacing.sm,
    backgroundColor: Colors.lightBlue,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  modalFeatureTitle: {
    ...Typography.labelMedium,
    color: Colors.primary,
    marginBottom: 2,
  },
  modalFeatureDesc: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
  },
  // Menu styles
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuSafeArea: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: SCREEN_HEIGHT * 0.85,
    paddingBottom: Spacing.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  menuCloseBtn: {
    padding: 6,
  },
  menuScroll: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  menuSectionHeader: {
    ...Typography.labelSmall,
    color: Colors.textSecondary,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemText: {
    ...Typography.bodyLarge,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  roleDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
});
