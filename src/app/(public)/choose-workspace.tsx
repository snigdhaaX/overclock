import { useRouter } from 'expo-router';
import {
  Activity,
  ChevronRight,
  Globe,
  Info,
  Package,
  Shield,
  ShoppingCart,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import ScreenContainer from '../../components/ScreenContainer';
import Colors from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';
import { ROLES, UserRole } from '../../types/roles';

const ROLE_THUMBNAILS: Record<UserRole, ImageSourcePropType> = {
  'operations-analyst': require('../../../assets/images/operations_analyst.jpg'),
  'supply-chain-manager': require('../../../assets/images/supply_chain_manager.jpg'),
  'warehouse-operator': require('../../../assets/images/warehouse_operator.jpg'),
  'procurement-approver': require('../../../assets/images/procurement_approver.jpg'),
  administrator: require('../../../assets/images/administrator.jpg'),
};

export default function ChooseWorkspaceScreen() {
  const router = useRouter();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const renderRoleIcon = (roleKey: UserRole, color: string) => {
    switch (roleKey) {
      case 'operations-analyst':
        return <Activity size={22} color={color} />;
      case 'supply-chain-manager':
        return <Globe size={22} color={color} />;
      case 'warehouse-operator':
        return <Package size={22} color={color} />;
      case 'procurement-approver':
        return <ShoppingCart size={22} color={color} />;
      case 'administrator':
        return <Shield size={22} color={color} />;
    }
  };

  const handleSelectRole = (roleKey: UserRole) => {
    setSelectedRole(roleKey);
    const roleDef = ROLES[roleKey];
    router.push(roleDef.route as any);
  };

  return (
    <ScreenContainer
      backgroundColor="#FFFFFF"
      statusBarStyle="dark-content"
      onBack={() => router.back()}
      headerTitle={<BrandLogo variant="dark" size="sm" layout="horizontal" />}
      contentContainerStyle={styles.container}
    >
      {/* Title & Subtitle */}
      <View style={styles.titleSection}>
        <Text style={styles.heading}>Choose Your Workspace</Text>
        <Text style={styles.subtitle}>
          Select your role to continue to the TRUSTCHAIN portal.
        </Text>
      </View>

      {/* 5 Large Role Cards */}
      <View style={styles.cardsList}>
        {(Object.keys(ROLES) as UserRole[]).map((roleKey) => {
          const role = ROLES[roleKey];
          const isSelected = selectedRole === roleKey;
          const thumbnail = ROLE_THUMBNAILS[roleKey];

          return (
            <Pressable
              key={roleKey}
              onPress={() => handleSelectRole(roleKey)}
              style={({ pressed }) => [
                styles.roleCard,
                { borderLeftColor: role.badgeColor },
                pressed && styles.roleCardPressed,
                isSelected && styles.roleCardSelected,
              ]}
            >
              {/* Left Icon Badge */}
              <View style={[styles.iconCircle, { backgroundColor: role.lightColor }]}>
                {renderRoleIcon(roleKey, role.badgeColor)}
              </View>

              {/* Middle Info */}
              <View style={styles.infoWrapper}>
                <View style={styles.titleRow}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <View
                    style={[
                      styles.accentIndicator,
                      { backgroundColor: role.badgeColor },
                    ]}
                  />
                </View>
                <Text style={styles.roleDescription} numberOfLines={2}>
                  {role.description}
                </Text>
              </View>

              {/* Right Thumbnail & Arrow */}
              <View style={styles.rightActionArea}>
                <Image
                  source={thumbnail}
                  style={styles.thumbnailImage}
                  resizeMode="cover"
                />
                <ChevronRight size={18} color="#94A3B8" style={{ marginLeft: 6 }} />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Compliance / Security Note */}
      <View style={styles.complianceNote}>
        <Info size={16} color={Colors.primary} style={styles.complianceIcon} />
        <Text style={styles.complianceText}>
          Portal selection directs you to your dedicated role workspace. Access permissions are verified by the backend upon authentication.
        </Text>
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
    marginTop: Spacing.xs,
    marginBottom: Spacing.md,
  },
  heading: {
    ...Typography.h1,
    fontSize: 23,
    color: Colors.deepNavy,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 13,
  },
  cardsList: {
    width: '100%',
    gap: 10,
    marginVertical: Spacing.xs,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderLeftWidth: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    ...Shadows.subtle,
  },
  roleCardPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: '#F8FAFF',
  },
  roleCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F0F7FF',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  infoWrapper: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    gap: 6,
  },
  roleTitle: {
    ...Typography.labelLarge,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  accentIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  roleDescription: {
    ...Typography.bodySmall,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  rightActionArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  thumbnailImage: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  complianceNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.lightBlue,
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  complianceIcon: {
    marginRight: 8,
    flexShrink: 0,
  },
  complianceText: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.deepNavy,
    lineHeight: 16,
    flex: 1,
  },
});
