import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ProcurementMetricCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  variant?: 'purple' | 'blue' | 'green' | 'amber' | 'red' | 'default';
}

export function ProcurementMetricCard({
  label,
  value,
  subtext,
  icon,
  variant = 'default',
}: ProcurementMetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'purple':
        return { iconBg: '#FAF5FF', iconBorder: '#E9D5FF' };
      case 'blue':
        return { iconBg: '#EFF6FF', iconBorder: '#BFDBFE' };
      case 'green':
        return { iconBg: '#F0FDF4', iconBorder: '#BBF7D0' };
      case 'amber':
        return { iconBg: '#FFFBEB', iconBorder: '#FDE68A' };
      case 'red':
        return { iconBg: '#FEF2F2', iconBorder: '#FECACA' };
      default:
        return { iconBg: '#F8FAFC', iconBorder: '#E2E8F0' };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.label}>{label}</Text>
        {icon && (
          <View
            style={[
              styles.iconBox,
              { backgroundColor: vStyles.iconBg, borderColor: vStyles.iconBorder },
            ]}
          >
            {icon}
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      {subtext && <Text style={styles.subtext}>{subtext}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    flex: 1,
    marginRight: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '500',
  },
});

export default ProcurementMetricCard;

