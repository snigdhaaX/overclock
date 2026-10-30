import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Globe, Radio } from 'lucide-react-native';

interface BlockchainNetworkBadgeProps {
  chainId?: number | null;
  networkName?: string;
  connected?: boolean;
}

export default function BlockchainNetworkBadge({
  chainId = 80002,
  networkName = 'Polygon Amoy',
  connected = true,
}: BlockchainNetworkBadgeProps) {
  const isAmoy = chainId === 80002;
  const isHardhat = chainId === 31337;

  return (
    <View style={[styles.badge, !connected && styles.badgeDisconnected]}>
      <View
        style={[
          styles.dot,
          connected
            ? isAmoy
              ? styles.dotAmoy
              : styles.dotLocal
            : styles.dotDisconnected,
        ]}
      />
      <Globe size={11} color={connected ? '#0F172A' : '#64748B'} style={{ marginRight: 3 }} />
      <Text style={styles.networkText}>
        {connected ? (isAmoy ? 'Amoy (80002)' : isHardhat ? 'Local (31337)' : networkName) : 'Offline'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  badgeDisconnected: {
    backgroundColor: '#F8FAFC',
    borderColor: '#CBD5E1',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotAmoy: {
    backgroundColor: '#8B5CF6',
  },
  dotLocal: {
    backgroundColor: '#F59E0B',
  },
  dotDisconnected: {
    backgroundColor: '#94A3B8',
  },
  networkText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
});
