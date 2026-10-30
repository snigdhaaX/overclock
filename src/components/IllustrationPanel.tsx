import React from 'react';
import { Image, ImageSourcePropType, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Colors from '../constants/colors';
import { BorderRadius, Shadows } from '../constants/spacing';
import Typography from '../constants/typography';
import { UserRole } from '../types/roles';

const ROLE_IMAGES: Record<UserRole, ImageSourcePropType> = {
  'operations-analyst': require('../../assets/images/operations_analyst.jpg'),
  'supply-chain-manager': require('../../assets/images/supply_chain_manager.jpg'),
  'warehouse-operator': require('../../assets/images/warehouse_operator.jpg'),
  'procurement-approver': require('../../assets/images/procurement_approver.jpg'),
  'administrator': require('../../assets/images/administrator.jpg'),
};

const ROLE_CAPTIONS: Record<UserRole, string> = {
  'operations-analyst': 'AI command center & real-time disruption analytics',
  'supply-chain-manager': 'Global end-to-end supply network & telemetry',
  'warehouse-operator': 'High-velocity fulfillment & automated inventory tracking',
  'procurement-approver': 'Strategic supplier evaluation & automated PO governance',
  'administrator': 'Enterprise security architecture & immutable audit logs',
};

interface IllustrationPanelProps {
  role: UserRole;
  style?: ViewStyle;
}

export const IllustrationPanel: React.FC<IllustrationPanelProps> = ({ role, style }) => {
  const imageSource = ROLE_IMAGES[role];
  const caption = ROLE_CAPTIONS[role];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.imageCard}>
        <Image
          source={imageSource}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
      <Text style={styles.captionText}>{caption}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 10,
    marginBottom: 4,
    alignItems: 'center',
  },
  imageCard: {
    width: '100%',
    height: 180,
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Shadows.subtle,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  captionText: {
    ...Typography.caption,
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
});

export default IllustrationPanel;
