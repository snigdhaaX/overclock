import {
  Activity,
  CheckCircle2,
  Cpu,
  Eye,
  Factory,
  Globe2,
  Lock,
  Package,
  Plane,
  Radar,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
} from 'lucide-react-native';
import React from 'react';
import {
  Dimensions,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import BrandLogo from './BrandLogo';
import Colors from '../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../constants/spacing';
import Typography from '../constants/typography';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingSlideProps {
  index: number;
  slideWidth?: number;
}

export const OnboardingSlide: React.FC<OnboardingSlideProps> = ({ index, slideWidth }) => {
  const containerStyle = slideWidth ? { width: slideWidth, paddingHorizontal: 16 } : styles.slideContainer;
  if (index === 0) {
    // SLIDE 1
    const features = [
      {
        title: 'Disruption Detection',
        subtitle: 'Identify risks early',
        icon: <Radar size={20} color={Colors.primary} />,
      },
      {
        title: 'Impact Analysis',
        subtitle: 'See the full picture',
        icon: <Eye size={20} color={Colors.primary} />,
      },
      {
        title: 'AI Recovery Plans',
        subtitle: 'Optimize and recover',
        icon: <Sparkles size={20} color={Colors.primary} />,
      },
      {
        title: 'Approval Governance',
        subtitle: 'Role-based workflow',
        icon: <ShieldCheck size={20} color={Colors.primary} />,
      },
      {
        title: 'Blockchain Audit',
        subtitle: 'Verifiable accountability',
        icon: <Lock size={20} color={Colors.primary} />,
      },
    ];

    return (
      <View style={containerStyle}>
        <View style={styles.headerArea}>
          <BrandLogo size="md" showWordmark={false} />
        </View>

        <Text style={styles.slideHeadline}>
          A smarter,{'\n'}more resilient{'\n'}supply chain
        </Text>

        <View style={styles.featureListContainer}>
          {features.map((item, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={styles.featureIconCircle}>{item.icon}</View>
              <View style={styles.featureTextWrapper}>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureSubtitle}>{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (index === 1) {
    // SLIDE 2: Connected supply chain. End to end.
    return (
      <View style={containerStyle}>
        <View style={styles.headerArea}>
          <BrandLogo size="md" showWordmark={false} />
        </View>

        <Text style={styles.slideHeadline}>
          Connected{'\n'}supply chain.{'\n'}End to end.
        </Text>

        {/* Central Connected Diagram */}
        <View style={styles.flowDiagramContainer}>
          {/* Background SVG curves */}
          <Svg
            width="100%"
            height="180"
            viewBox="0 0 280 180"
            style={styles.svgCurves}
          >
            {/* Curved dashed lines connecting nodes */}
            <Path
              d="M 60,40 Q 140,80 220,40"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
            <Path
              d="M 60,140 Q 140,100 220,140"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="2"
              strokeDasharray="4,4"
            />
            <Path
              d="M 60,40 Q 90,90 60,140"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
            <Path
              d="M 220,40 Q 190,90 220,140"
              fill="none"
              stroke="#93C5FD"
              strokeWidth="1.5"
              strokeDasharray="3,3"
            />
          </Svg>

          {/* Glowing Center Hub */}
          <View style={styles.centerHub}>
            <Globe2 size={32} color={Colors.primary} />
            <View style={styles.centerPulse} />
          </View>

          {/* 4 Connected Node Badges */}
          {/* Top Left: Supplier */}
          <View style={[styles.nodeBadge, styles.nodeTopLeft]}>
            <View style={[styles.nodeIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Factory size={16} color="#16A34A" />
            </View>
            <Text style={styles.nodeLabel}>Supplier</Text>
          </View>

          {/* Top Right: Shipment */}
          <View style={[styles.nodeBadge, styles.nodeTopRight]}>
            <View style={[styles.nodeIconCircle, { backgroundColor: '#F3E8FF' }]}>
              <Plane size={16} color="#9333EA" />
            </View>
            <Text style={styles.nodeLabel}>Shipment</Text>
          </View>

          {/* Bottom Left: Warehouse */}
          <View style={[styles.nodeBadge, styles.nodeBottomLeft]}>
            <View style={[styles.nodeIconCircle, { backgroundColor: '#E0F2FE' }]}>
              <Package size={16} color="#0284C7" />
            </View>
            <Text style={styles.nodeLabel}>Warehouse</Text>
          </View>

          {/* Bottom Right: Customer */}
          <View style={[styles.nodeBadge, styles.nodeBottomRight]}>
            <View style={[styles.nodeIconCircle, { backgroundColor: '#FFEDD5' }]}>
              <Store size={16} color="#EA580C" />
            </View>
            <Text style={styles.nodeLabel}>Customer</Text>
          </View>
        </View>

        <Text style={styles.slideDescription}>
          Real-time visibility across suppliers, shipments, warehouses and orders.
        </Text>
      </View>
    );
  }

  // SLIDE 3: Make better decisions, faster.
  const checklist = [
    'AI-powered recommendations',
    'Simulate recovery scenarios',
    'Multi-role collaboration',
    'Track execution in real time',
  ];

  return (
    <View style={containerStyle}>
      <View style={styles.headerArea}>
        <BrandLogo size="md" showWordmark={false} />
      </View>

      <Text style={styles.slideHeadline}>
        Make better{'\n'}decisions, faster.
      </Text>

      {/* Dashboard Illustration */}
      <View style={styles.dashboardImageContainer}>
        <Image
          source={require('../../assets/images/onboarding_dashboard.jpg')}
          style={styles.dashboardImage}
          resizeMode="contain"
        />
      </View>

      {/* 4 Feature Bullet Points */}
      <View style={styles.checklistContainer}>
        {checklist.map((item, i) => (
          <View key={i} style={styles.checkRow}>
            <View style={styles.checkCircle}>
              <CheckCircle2 size={18} color={Colors.primary} />
            </View>
            <Text style={styles.checkText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  slideContainer: {
    width: SCREEN_WIDTH > 540 ? 500 : SCREEN_WIDTH - 32,
    alignSelf: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  slideHeadline: {
    ...Typography.hero,
    fontSize: 26,
    lineHeight: 33,
    textAlign: 'center',
    color: Colors.deepNavy,
    marginBottom: Spacing.lg,
  },
  featureListContainer: {
    width: '100%',
    gap: 10,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  featureIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  featureTextWrapper: {
    flex: 1,
  },
  featureTitle: {
    ...Typography.labelLarge,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  featureSubtitle: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  flowDiagramContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.lg,
  },
  svgCurves: {
    position: 'absolute',
    top: 15,
  },
  centerHub: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#93C5FD',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...Shadows.card,
  },
  centerPulse: {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: 'rgba(23, 105, 245, 0.25)',
  },
  nodeBadge: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    zIndex: 10,
    ...Shadows.subtle,
  },
  nodeTopLeft: {
    top: 10,
    left: 8,
  },
  nodeTopRight: {
    top: 10,
    right: 8,
  },
  nodeBottomLeft: {
    bottom: 10,
    left: 8,
  },
  nodeBottomRight: {
    bottom: 10,
    right: 8,
  },
  nodeIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },
  nodeLabel: {
    ...Typography.labelMedium,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  slideDescription: {
    ...Typography.bodyLarge,
    textAlign: 'center',
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    lineHeight: 22,
    fontSize: 15,
  },
  dashboardImageContainer: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.subtle,
  },
  dashboardImage: {
    width: '94%',
    height: '94%',
  },
  checklistContainer: {
    width: '100%',
    gap: 12,
    paddingHorizontal: Spacing.sm,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkCircle: {
    marginRight: 12,
  },
  checkText: {
    ...Typography.bodyMedium,
    fontWeight: '500',
    color: Colors.textPrimary,
    fontSize: 14,
  },
});

export default OnboardingSlide;
