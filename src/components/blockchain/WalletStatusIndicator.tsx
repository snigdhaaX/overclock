import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { ShieldCheck, ShieldAlert, Wallet } from 'lucide-react-native';

interface WalletStatusIndicatorProps {
  walletAddress?: string | null;
  roleLabel?: string;
  isAuthorized?: boolean;
}

export default function WalletStatusIndicator({
  walletAddress,
  roleLabel = 'Analyst',
  isAuthorized = true,
}: WalletStatusIndicatorProps) {
  if (!walletAddress) {
    return (
      <View style={styles.containerDisconnected}>
        <Wallet size={12} color="#64748B" style={{ marginRight: 4 }} />
        <Text style={styles.textDisconnected}>No Wallet Linked</Text>
      </View>
    );
  }

  const truncated = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;

  return (
    <View style={[styles.container, !isAuthorized && styles.containerUnauthorized]}>
      {isAuthorized ? (
        <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 4 }} />
      ) : (
        <ShieldAlert size={12} color="#DC2626" style={{ marginRight: 4 }} />
      )}
      <Text style={styles.addressText}>{truncated}</Text>
      <View style={[styles.rolePill, !isAuthorized && styles.rolePillUnauthorized]}>
        <Text style={[styles.roleText, !isAuthorized && styles.roleTextUnauthorized]}>
          {roleLabel}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  containerUnauthorized: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  containerDisconnected: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  textDisconnected: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  addressText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#0F172A',
    marginRight: 6,
  },
  rolePill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  rolePillUnauthorized: {
    backgroundColor: '#FEE2E2',
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  roleTextUnauthorized: {
    color: '#B91C1C',
  },
});
