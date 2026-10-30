import {
  Activity,
  Check,
  CheckCircle2,
  Globe,
  Package,
  Shield,
  ShoppingCart,
} from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../constants/spacing';
import Typography from '../constants/typography';
import { RoleDefinition } from '../types/roles';

interface RoleCardProps {
  role: RoleDefinition;
  isSelected: boolean;
  onSelect: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, isSelected, onSelect }) => {
  const renderIcon = () => {
    const size = 22;
    const color = role.badgeColor;

    switch (role.iconName) {
      case 'activity':
        return <Activity size={size} color={color} />;
      case 'globe':
        return <Globe size={size} color={color} />;
      case 'package':
        return <Package size={size} color={color} />;
      case 'clipboard-check':
        return <ShoppingCart size={size} color={color} />;
      case 'shield':
        return <Shield size={size} color={color} />;
      default:
        return <Activity size={size} color={color} />;
    }
  };

  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.card,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.iconWrapper, { backgroundColor: role.lightColor }]}>
        {renderIcon()}
      </View>

      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{role.title}</Text>
          {role.adminApprovalRequired && (
            <View style={styles.governanceBadge}>
              <Text style={styles.governanceBadgeText}>Approval Req.</Text>
            </View>
          )}
        </View>
        <Text style={styles.description} numberOfLines={2}>
          {role.description}
        </Text>
      </View>

      <View
        style={[
          styles.radioCircle,
          isSelected && styles.radioCircleSelected,
        ]}
      >
        {isSelected && <Check size={14} color={Colors.white} strokeWidth={3} />}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.subtle,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#F7FAFF',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  cardPressed: {
    transform: [{ scale: 0.99 }],
    opacity: 0.95,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  textContainer: {
    flex: 1,
    marginRight: Spacing.xs,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 2,
  },
  title: {
    ...Typography.labelLarge,
    color: Colors.textPrimary,
  },
  governanceBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  governanceBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  description: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  radioCircleSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});

export default RoleCard;
