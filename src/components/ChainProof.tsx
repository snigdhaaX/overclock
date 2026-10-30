import { CheckCircle2, Clock, ExternalLink, Hash, Link2, ShieldAlert, ShieldCheck } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ChainProofProps {
  planId: string;
  txHash?: string;
  isVerified?: boolean;
}

export const ChainProof: React.FC<ChainProofProps> = ({
  planId,
  txHash,
  isVerified,
}) => {
  const [copied, setCopied] = useState(false);

  const hasTx = Boolean(txHash && txHash.trim().length > 0 && txHash !== '0x' && txHash !== 'undefined');
  const verified = hasTx && (isVerified !== false);

  const handleCopyHash = () => {
    if (!hasTx) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.titleGroup}>
          <View style={[styles.iconWrap, { backgroundColor: verified ? '#ECFDF5' : '#F1F5F9' }]}>
            {verified ? (
              <ShieldCheck size={18} color="#16A36A" />
            ) : (
              <Clock size={18} color="#64748B" />
            )}
          </View>
          <View>
            <Text style={styles.title}>Cryptographic Proof</Text>
            <Text style={styles.subtitle}>Polygon Amoy · Immutable Audit Trail</Text>
          </View>
        </View>

        <View
          style={[
            styles.badge,
            { backgroundColor: verified ? '#ECFDF5' : '#F8FAFC', borderColor: verified ? '#A7F3D0' : '#E2E8F0' },
          ]}
        >
          <Text style={[styles.badgeText, { color: verified ? '#16A36A' : '#64748B' }]}>
            {verified ? 'Anchored' : 'Pending Proof'}
          </Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Plan Reference</Text>
          <Text style={styles.valueMono}>{planId}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Ledger Network</Text>
          <Text style={styles.value}>Polygon Amoy (80002)</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Governance Contract</Text>
          <Text style={styles.valueMono}>0x33D4...e24A</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>Transaction Hash</Text>
          {hasTx ? (
            <Pressable onPress={handleCopyHash} style={styles.hashPressable}>
              <Text style={styles.hashMono} numberOfLines={1}>
                {txHash}
              </Text>
              <Text style={styles.copyNotice}>{copied ? 'Copied' : 'Tap to copy'}</Text>
            </Pressable>
          ) : (
            <Text style={styles.unavailableText}>Unavailable until authorized</Text>
          )}
        </View>
      </View>

      {!hasTx && (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            No transaction hash committed yet. Cryptographic proof is registered automatically when the Supply Chain Manager signs off on this plan.
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailGrid: {
    gap: 8,
    paddingTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#64748B',
  },
  value: {
    fontSize: 12,
    fontWeight: '600',
    color: '#17243B',
  },
  valueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#10234D',
  },
  hashPressable: {
    alignItems: 'flex-end',
    maxWidth: '60%',
  },
  hashMono: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#2563EB',
    fontWeight: '700',
  },
  copyNotice: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 1,
  },
  unavailableText: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#94A3B8',
  },
  noticeBox: {
    marginTop: 12,
    padding: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  noticeText: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
});

export default ChainProof;

