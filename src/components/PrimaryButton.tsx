import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  ViewStyle,
} from 'react-native';
import Colors from '../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../constants/spacing';
import Typography from '../constants/typography';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'glass';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  isLoading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  icon,
  style,
  textStyle,
}) => {
  const getContainerStyle = (pressed: boolean) => {
    let base: ViewStyle = { ...styles.base };

    // Size
    if (size === 'sm') {
      base = { ...base, paddingVertical: 10, paddingHorizontal: 16, borderRadius: BorderRadius.md };
    } else if (size === 'lg') {
      base = { ...base, paddingVertical: 16, paddingHorizontal: 24, borderRadius: BorderRadius.lg };
    } else {
      base = { ...base, paddingVertical: 14, paddingHorizontal: 20, borderRadius: BorderRadius.md };
    }

    // Variant
    if (variant === 'primary') {
      base = {
        ...base,
        backgroundColor: disabled ? '#94A3B8' : pressed ? Colors.primaryDark : Colors.primary,
        ...Shadows.glowBlue,
      };
    } else if (variant === 'outline') {
      base = {
        ...base,
        backgroundColor: pressed ? Colors.lightBlue : 'transparent',
        borderWidth: 1.5,
        borderColor: disabled ? Colors.border : Colors.primary,
      };
    } else if (variant === 'glass') {
      base = {
        ...base,
        backgroundColor: pressed ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1.2,
        borderColor: 'rgba(255, 255, 255, 0.35)',
      };
    } else if (variant === 'ghost') {
      base = {
        ...base,
        backgroundColor: pressed ? Colors.lightBlue : 'transparent',
      };
    }

    if (pressed) {
      base = { ...base, opacity: 0.92, transform: [{ scale: 0.985 }] };
    }

    return base;
  };

  const getTextColor = (): string => {
    if (disabled) return '#CBD5E1';
    if (variant === 'primary') return Colors.textWhite;
    if (variant === 'glass') return Colors.textWhite;
    return Colors.primary;
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || isLoading}
      style={({ pressed }) => [getContainerStyle(pressed), style]}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'glass' ? Colors.textWhite : Colors.primary}
        />
      ) : (
        <>
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
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
});

export default PrimaryButton;
