import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

interface AdminMetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: React.ReactNode;
  statusColor?: string;
  onPress?: () => void;
}

export const AdminMetricCard: React.FC<AdminMetricCardProps> = ({
  label,
  value,
  change,
  icon,
  statusColor = '#475569',
  onPress,
}) => {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && onPress && styles.cardPressed,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {icon && <View style={[styles.iconBox, { backgroundColor: `${statusColor}14` }]}>{icon}</View>}
      </View>
      <Text style={[styles.value, { color: '#10234D' }]}>{value}</Text>
      {change && (
        <View style={styles.changeRow}>
          <Text style={[styles.changeText, { color: statusColor }]}>{change}</Text>
        </View>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.99 }],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  changeRow: {
    marginTop: 4,
  },
  changeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AdminMetricCard;

