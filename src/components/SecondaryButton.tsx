import React from 'react';
import { Pressable, StyleSheet, Text, TextStyle, ViewStyle } from 'react-native';
import Colors from '../constants/colors';
import { BorderRadius, Spacing } from '../constants/spacing';
import Typography from '../constants/typography';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'outline' | 'ghost' | 'glass' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const SecondaryButton: React.FC<SecondaryButtonProps> = ({
  title,
  onPress,
  variant = 'glass',
  size = 'md',
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = (pressed: boolean) => {
    let base: ViewStyle = { ...styles.base };

    if (size === 'sm') {
      base = { ...base, paddingVertical: 8, paddingHorizontal: 16, minHeight: 38, borderRadius: BorderRadius.md };
    } else if (size === 'lg') {
      base = { ...base, paddingVertical: 16, paddingHorizontal: 24, minHeight: 52, borderRadius: BorderRadius.lg };
    } else {
      base = { ...base, paddingVertical: 12, paddingHorizontal: 20, minHeight: 48, borderRadius: BorderRadius.md };
    }

    if (variant === 'glass') {
      base = {
        ...base,
        backgroundColor: pressed ? 'rgba(255, 255, 255, 0.28)' : 'rgba(255, 255, 255, 0.16)',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
      };
    } else if (variant === 'outline') {
      base = {
        ...base,
        backgroundColor: pressed ? Colors.lightBlue : Colors.white,
        borderWidth: 1.2,
        borderColor: Colors.border,
      };
    } else if (variant === 'subtle') {
      base = {
        ...base,
        backgroundColor: pressed ? '#E2E8F0' : Colors.lightBlue,
      };
    } else if (variant === 'ghost') {
      base = {
        ...base,
        backgroundColor: pressed ? 'rgba(23, 105, 245, 0.08)' : 'transparent',
      };
    }

    if (pressed) {
      base = { ...base, transform: [{ scale: 0.98 }] };
    }

    return base;
  };

  const getTextColor = (): string => {
    if (variant === 'glass') return Colors.textWhite;
    if (variant === 'ghost') return Colors.textSecondary;
    if (variant === 'subtle') return Colors.primary;
    return Colors.textPrimary;
  };

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [getContainerStyle(pressed), style]}>
      {icon && <>{icon}</>}
      <Text
        style={[
          Typography.button,
          { color: getTextColor(), marginLeft: icon ? Spacing.xs : 0 },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default SecondaryButton;
