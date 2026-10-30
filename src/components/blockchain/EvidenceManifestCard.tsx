import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { Shield, Database, CheckCircle2, AlertCircle } from 'lucide-react-native';

interface EvidenceManifestCardProps {
  manifestRootHash?: string;
  disruptionId?: string;
  evidenceCount?: number;
  isAnchored?: boolean;
}

export default function EvidenceManifestCard({
  manifestRootHash = '0x0000000000000000000000000000000000000000000000000000000000000000',
  disruptionId,
  evidenceCount,
  isAnchored = true,
}: EvidenceManifestCardProps) {
  const isSentinel =
    !manifestRootHash ||
    manifestRootHash === '0x' + '0'.repeat(64) ||
    manifestRootHash === '0'.repeat(64);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBox, isSentinel ? styles.iconBoxSentinel : styles.iconBoxActive]}>
            <Database size={16} color={isSentinel ? '#64748B' : '#0D9488'} />
          </View>
          <View>
            <Text style={styles.title}>External Evidence Manifest</Text>
            <Text style={styles.subtitle}>
              {isSentinel
                ? 'Internal Disruption (Zero-Manifest Sentinel)'
                : 'Sealed Merkle Evidence Commitment'}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, isSentinel ? styles.statusSentinel : styles.statusActive]}>
          {isSentinel ? (
            <Text style={styles.statusSentinelText}>Internal</Text>
          ) : (
            <>
              <CheckCircle2 size={11} color="#0D9488" style={{ marginRight: 3 }} />
              <Text style={styles.statusActiveText}>Sealed</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.hashRow}>
        <Text style={styles.hashLabel}>MANIFEST ROOT HASH:</Text>
        <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">
          {manifestRootHash}
        </Text>
      </View>

      <View style={styles.metaRow}>
        {disruptionId && (
          <Text style={styles.metaItem}>
            Linked Disruption: <Text style={styles.metaVal}>{disruptionId}</Text>
          </Text>
        )}
        {evidenceCount !== undefined && (
          <Text style={styles.metaItem}>
            Artifacts: <Text style={styles.metaVal}>{evidenceCount} records</Text>
          </Text>
        )}
      </View>
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
    marginBottom: 10,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: '#F0FDFA',
  },
  iconBoxSentinel: {
    backgroundColor: '#F1F5F9',
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusActive: {
    backgroundColor: '#CCFBF1',
  },
  statusActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F766E',
  },
  statusSentinel: {
    backgroundColor: '#F1F5F9',
  },
  statusSentinelText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  hashRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  hashValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#334155',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 4,
  },
  metaItem: {
    fontSize: 11,
    color: '#64748B',
  },
  metaVal: {
    fontWeight: '700',
    color: '#0F172A',
  },
});
