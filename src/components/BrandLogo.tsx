import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import Colors from '../constants/colors';

interface BrandLogoProps {
  variant?: 'light' | 'dark'; // 'light' for dark backgrounds (white text), 'dark' for light backgrounds (navy text)
  size?: 'sm' | 'md' | 'lg' | 'xl';
  layout?: 'horizontal' | 'stacked';
  showWordmark?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'dark',
  size = 'md',
  layout = 'horizontal',
  showWordmark = true,
}) => {
  const isLight = variant === 'light';

  const dimensions = {
    sm: { icon: 24, fontSize: 14, spacing: 6, stroke: 1.5 },
    md: { icon: 36, fontSize: 18, spacing: 8, stroke: 2 },
    lg: { icon: 48, fontSize: 22, spacing: 10, stroke: 2.2 },
    xl: { icon: 64, fontSize: 28, spacing: 12, stroke: 2.5 },
  }[size];

  const iconColor = isLight ? '#38BDF8' : Colors.primary;
  const secondaryColor = isLight ? '#60A5FA' : '#3B82F6';
  const textColor = isLight ? Colors.textWhite : Colors.deepNavy;

  return (
    <View
      style={[
        styles.container,
        layout === 'stacked' ? styles.stacked : styles.horizontal,
      ]}
    >
      <Svg
        width={dimensions.icon}
        height={dimensions.icon}
        viewBox="0 0 100 100"
        fill="none"
      >
        {/* Outer Hexagon */}
        <Polygon
          points="50,6 90,28 90,72 50,94 10,72 10,28"
          stroke={iconColor}
          strokeWidth={dimensions.stroke * 2.5}
          strokeLinejoin="round"
          fill="none"
        />

        {/* 3D Isometric Cube Facets */}
        {/* Top Facet */}
        <Polygon
          points="50,24 74,38 50,52 26,38"
          stroke={iconColor}
          strokeWidth={dimensions.stroke * 2}
          fill={isLight ? 'rgba(56, 189, 248, 0.25)' : 'rgba(23, 105, 245, 0.18)'}
          strokeLinejoin="round"
        />

        {/* Left Facet */}
        <Polygon
          points="26,38 50,52 50,76 26,62"
          stroke={iconColor}
          strokeWidth={dimensions.stroke * 2}
          fill={isLight ? 'rgba(96, 165, 250, 0.18)' : 'rgba(59, 130, 246, 0.12)'}
          strokeLinejoin="round"
        />

        {/* Right Facet */}
        <Polygon
          points="50,52 74,38 74,62 50,76"
          stroke={iconColor}
          strokeWidth={dimensions.stroke * 2}
          fill={isLight ? 'rgba(56, 189, 248, 0.35)' : 'rgba(23, 105, 245, 0.28)'}
          strokeLinejoin="round"
        />

        {/* Network Nodes */}
        <Circle cx="50" cy="6" r="3.5" fill={secondaryColor} />
        <Circle cx="90" cy="28" r="3.5" fill={secondaryColor} />
        <Circle cx="90" cy="72" r="3.5" fill={secondaryColor} />
        <Circle cx="50" cy="94" r="3.5" fill={secondaryColor} />
        <Circle cx="10" cy="72" r="3.5" fill={secondaryColor} />
        <Circle cx="10" cy="28" r="3.5" fill={secondaryColor} />
        <Circle cx="50" cy="52" r="4" fill={iconColor} />
      </Svg>

      {showWordmark && (
        <Text
          style={[
            styles.wordmark,
            {
              fontSize: dimensions.fontSize,
              color: textColor,
              marginTop: layout === 'stacked' ? dimensions.spacing : 0,
              marginLeft: layout === 'horizontal' ? dimensions.spacing : 0,
            },
          ]}
        >
          TRUSTCHAIN
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontal: {
    flexDirection: 'row',
  },
  stacked: {
    flexDirection: 'column',
  },
  wordmark: {
    fontWeight: '800',
    letterSpacing: 2,
    fontFamily: 'System',
  },
});

export default BrandLogo;
