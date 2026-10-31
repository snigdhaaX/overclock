import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLiveData } from '@/services/backendSync';

const short = (value?: string | null) => (value ? `${value.slice(0, 10)}…${value.slice(-6)}` : '—');

/** Only states what the server read from the chain. Without a connection it says so. */
export const LiveChainCard: React.FC<{ anchorTx?: string | null; anchorStatus?: string | null; anchorBlock?: number | null; planHash?: string | null }> = ({
  anchorTx, anchorStatus, anchorBlock, planHash,
}) => {
  const { chain, auditChain } = getLiveData();
  if (!chain) return null;
  const confirmed = anchorStatus === 'CHAIN_CONFIRMED';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Blockchain</Text>
        <Text style={[styles.badge, chain.connected ? styles.good : styles.bad]}>
          {chain.connected ? `${chain.network} · ${chain.chainId}` : chain.signingEnabled ? 'Chain unreachable' : 'Signing off'}
        </Text>
      </View>
      {chain.connected ? (
        <>
          <Row label="Contract" value={short(chain.contract)} />
          <Row label="Latest block" value={`#${chain.latestBlock}`} />
        </>
      ) : null}
      {planHash ? <Row label="Plan hash" value={short(planHash)} /> : null}
      {anchorTx ? <Row label="Anchor tx" value={short(anchorTx)} /> : null}
      {anchorTx ? <Row label="Anchor status" value={confirmed ? `Confirmed in block #${anchorBlock}` : anchorStatus === 'CHAIN_FAILED' ? 'Failed' : 'Waiting for receipt'} /> : null}
      {auditChain ? <Row label="Audit chain" value={auditChain.valid ? `Intact, ${auditChain.events} events` : `Broken at ${auditChain.broken_at}`} /> : null}
    </View>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6EAF1', padding: 14, marginBottom: 14, gap: 6 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  title: { fontSize: 15, fontWeight: '800', color: '#10234D' },
  badge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  good: { backgroundColor: '#DCFCE7', color: '#166534' },
  bad: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 12, color: '#64748B' },
  value: { flexShrink: 1, fontSize: 12, fontWeight: '600', color: '#10234D' },
});

export default LiveChainCard;
