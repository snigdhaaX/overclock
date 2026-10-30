import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

interface PolicyCardProps {
  title: string;
  description: string;
  value?: number | string;
  unit?: string;
  isBoolean?: boolean;
  boolValue?: boolean;
  onBoolChange?: (val: boolean) => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  badgeText?: string;
}

export const PolicyCard: React.FC<PolicyCardProps> = ({
  title,
  description,
  value,
  unit,
  isBoolean = false,
  boolValue = false,
  onBoolChange,
  onIncrement,
  onDecrement,
  badgeText,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <Text style={styles.title}>{title}</Text>
          {badgeText && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          )}
        </View>

        {isBoolean ? (
          <Switch
            value={boolValue}
            onValueChange={onBoolChange}
            trackColor={{ false: '#CBD5E1', true: '#475569' }}
            thumbColor={boolValue ? '#FFFFFF' : '#F8FAFC'}
          />
        ) : (
          <View style={styles.stepperContainer}>
            {onDecrement && (
              <Pressable
                style={({ pressed }) => [styles.stepBtn, pressed && styles.btnPressed]}
                onPress={onDecrement}
              >
                <Minus size={14} color="#475569" />
              </Pressable>
            )}

            <View style={styles.valueDisplay}>
              <Text style={styles.valueText}>
                {typeof value === 'number' ? value.toLocaleString() : value}
              </Text>
              {unit && <Text style={styles.unitText}>{unit}</Text>}
            </View>

            {onIncrement && (
              <Pressable
                style={({ pressed }) => [styles.stepBtn, pressed && styles.btnPressed]}
                onPress={onIncrement}
              >
                <Plus size={14} color="#475569" />
              </Pressable>
            )}
          </View>
        )}
      </View>

      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleInfo: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  badge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  badgeText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  description: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 2,
  },
  stepBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  valueDisplay: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  valueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  unitText: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
  },
  btnPressed: {
    opacity: 0.7,
  },
});

export default PolicyCard;

