import React, { useState } from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';
import { Copy, Check, Hash, ShieldCheck, FileCode } from 'lucide-react-native';

interface PlanHashCardProps {
  planHash?: string;
  schemaVersion?: string;
  evidenceManifestHash?: string;
  isVerified?: boolean;
}

export default function PlanHashCard({
  planHash = '0x0000000000000000000000000000000000000000000000000000000000000000',
  schemaVersion = 'trustchain-recovery-plan-v2',
  evidenceManifestHash,
  isVerified = true,
}: PlanHashCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncatedHash =
    planHash.length > 20
      ? `${planHash.slice(0, 10)}...${planHash.slice(-8)}`
      : planHash;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={styles.iconBox}>
            <Hash size={16} color="#2563EB" />
          </View>
          <View>
            <Text style={styles.title}>Canonical Plan Fingerprint</Text>
            <Text style={styles.subtitle}>RFC 8785 JSON Canonicalization Scheme</Text>
          </View>
        </View>

        <View style={[styles.badge, isVerified ? styles.badgeVerified : styles.badgePending]}>
          <ShieldCheck size={12} color={isVerified ? '#16A34A' : '#D97706'} />
          <Text style={[styles.badgeText, isVerified ? styles.textVerified : styles.textPending]}>
            {isVerified ? 'RFC 8785' : 'Draft'}
          </Text>
        </View>
      </View>

      {/* Schema Version Tag */}
      <View style={styles.schemaRow}>
        <FileCode size={13} color="#64748B" style={{ marginRight: 5 }} />
        <Text style={styles.schemaLabel}>Schema Specification:</Text>
        <Text style={styles.schemaVal}>{schemaVersion}</Text>
      </View>

      {/* Hash Box */}
      <View style={styles.hashContainer}>
        <View style={{ flex: 1 }}>
          <Text style={styles.hashLabel}>CANONICAL SHA-256 HASH</Text>
          <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">
            {planHash}
          </Text>
        </View>
        <Pressable onPress={handleCopy} style={styles.copyBtn}>
          {copied ? <Check size={14} color="#16A34A" /> : <Copy size={14} color="#64748B" />}
        </Pressable>
      </View>

      {evidenceManifestHash && (
        <View style={styles.manifestNotice}>
          <Text style={styles.manifestNoticeText}>
            Committed Manifest Root:{' '}
            <Text style={styles.manifestHashText}>
              {evidenceManifestHash.length > 20
                ? `${evidenceManifestHash.slice(0, 10)}...${evidenceManifestHash.slice(-8)}`
                : evidenceManifestHash}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeVerified: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
  },
  badgePending: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  textVerified: {
    color: '#15803D',
  },
  textPending: {
    color: '#B45309',
  },
  schemaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 10,
  },
  schemaLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 6,
  },
  schemaVal: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563EB',
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  hashValue: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#38BDF8',
  },
  copyBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#1E293B',
  },
  manifestNotice: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  manifestNoticeText: {
    fontSize: 11,
    color: '#64748B',
  },
  manifestHashText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: '#475569',
  },
});
