import { Minus, Plus } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unitLabel?: string;
  disabled?: boolean;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({
  value,
  onChange,
  min = 0,
  max = 99999,
  step = 1,
  unitLabel = 'units',
  disabled = false,
}) => {
  const handleDecrement = () => {
    if (disabled || value <= min) return;
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    if (disabled || value >= max) return;
    onChange(Math.min(max, value + step));
  };

  const handleTextChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned === '') {
      onChange(min);
      return;
    }
    const parsed = parseInt(cleaned, 10);
    if (!isNaN(parsed)) {
      const clamped = Math.max(min, Math.min(max, parsed));
      onChange(clamped);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.stepButton, (disabled || value <= min) && styles.disabledButton]}
        onPress={handleDecrement}
        disabled={disabled || value <= min}
      >
        <Minus size={16} color={disabled || value <= min ? '#94A3B8' : '#10234D'} />
      </Pressable>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={value.toString()}
          onChangeText={handleTextChange}
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
        />
        {unitLabel ? <Text style={styles.unitText}>{unitLabel}</Text> : null}
      </View>

      <Pressable
        style={[styles.stepButton, (disabled || value >= max) && styles.disabledButton]}
        onPress={handleIncrement}
        disabled={disabled || value >= max}
      >
        <Plus size={16} color={disabled || value >= max ? '#94A3B8' : '#10234D'} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    alignSelf: 'flex-start',
  },
  stepButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledButton: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0',
    opacity: 0.6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minWidth: 90,
    justifyContent: 'center',
  },
  textInput: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    textAlign: 'center',
    minWidth: 40,
    paddingVertical: 2,
  },
  unitText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginLeft: 4,
  },
});

export default QuantityStepper;
