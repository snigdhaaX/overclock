import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', style }) => {
  const getTheme = () => {
    switch (status) {
      case 'Action Required':
      case 'At Risk':
      case 'Critical':
        return { bg: '#FEE2E2', text: '#DC2626', border: '#FCA5A5' };
      case 'Investigating':
      case 'Delayed':
      case 'Pending Approval':
        return { bg: '#FEF3C7', text: '#B45309', border: '#FCD34D' };
      case 'Approved':
      case 'Completed':
      case 'Mitigated':
      case 'On Schedule':
        return { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC' };
      case 'In Progress':
      case 'Plan Ready':
      case 'Simulation Complete':
        return { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const theme = getTheme();
  const isSm = size === 'sm';

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.bg, borderColor: theme.border },
        isSm && styles.containerSm,
        style,
      ]}
    >
      <Text style={[styles.text, { color: theme.text }, isSm && styles.textSm]}>
        {status}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  containerSm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textSm: {
    fontSize: 10,
  },
});

export default StatusBadge;
