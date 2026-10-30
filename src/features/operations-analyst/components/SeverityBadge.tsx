import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SeverityLevel } from '../types';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({
  severity,
  size = 'md',
  style,
}) => {
  const getColors = () => {
    switch (severity) {
      case 'Critical':
        return { bg: '#FEE2E2', text: '#DC2626', dot: '#DC2626' };
      case 'High':
        return { bg: '#FFEDD5', text: '#EA580C', dot: '#EA580C' };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#D97706', dot: '#D97706' };
      case 'Low':
        return { bg: '#DCFCE7', text: '#16A34A', dot: '#16A34A' };
      default:
        return { bg: '#F1F5F9', text: '#64748B', dot: '#64748B' };
    }
  };

  const colors = getColors();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: colors.bg },
        isSm && styles.badgeSm,
        style,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: colors.dot }, isSm && styles.dotSm]} />
      <Text
        style={[
          styles.text,
          { color: colors.text },
          isSm && styles.textSm,
        ]}
      >
        {severity}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  dotSm: {
    width: 5,
    height: 5,
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  textSm: {
    fontSize: 10,
  },
});

export default SeverityBadge;
