import React from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  isPositiveChange?: boolean;
  icon: React.ReactNode;
  iconBgColor?: string;
  accentColor?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  change,
  isPositiveChange,
  icon,
  iconBgColor = '#EFF6FF',
  accentColor = '#2563EB',
  onPress,
  style,
}) => {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.card,
        pressed && styles.cardPressed,
        style,
      ]}
    >
      <View style={styles.topRow}>
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          {icon}
        </View>
        {change && (
          <View
            style={[
              styles.changeBadge,
              {
                backgroundColor:
                  isPositiveChange === true
                    ? '#DCFCE7'
                    : isPositiveChange === false
                    ? '#FEE2E2'
                    : '#F1F5F9',
              },
            ]}
          >
            <Text
              style={[
                styles.changeText,
                {
                  color:
                    isPositiveChange === true
                      ? '#16A34A'
                      : isPositiveChange === false
                      ? '#DC2626'
                      : '#64748B',
                },
              ]}
            >
              {change}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: '#10234D' }]}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    flex: 1,
    minWidth: 140,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  changeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
  },
});

export default MetricCard;
