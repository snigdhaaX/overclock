import React, { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { getLiveData, isBackendOnline, PlanVerification, verifyPlan } from '@/services/backendSync';

const EXPLORER = 'https://amoy.polygonscan.com/tx/';

const COPY: Record<PlanVerification['result'], { label: string; detail: string; tone: 'good' | 'bad' | 'wait' }> = {
  VERIFIED: { label: 'Verified on-chain', detail: 'The contract confirms this plan matches its anchored hash.', tone: 'good' },
  HASH_MISMATCH: { label: 'Hash mismatch', detail: 'This plan no longer matches its recorded hash. Treat it as changed.', tone: 'bad' },
  NOT_ANCHORED: { label: 'Not yet on-chain', detail: 'The plan is recorded here, but no on-chain match is confirmed yet.', tone: 'wait' },
};

export const ChainProof: React.FC<{ planId: string; txHash?: string | null }> = ({ planId, txHash }) => {
  const [result, setResult] = useState<PlanVerification | null>(null);

  useEffect(() => {
    if (!isBackendOnline()) return;
    let cancelled = false;
    verifyPlan(planId).then((r) => { if (!cancelled) setResult(r); }).catch(() => {});
    return () => { cancelled = true; };
  }, [planId, txHash]);

  if (!result) return null;
  const copy = COPY[result.result];
  return (
    <View style={[styles.box, styles[copy.tone]]}>
      <Text style={styles.label}>{copy.label}</Text>
      <Text style={styles.detail}>{copy.detail}</Text>
      <Text style={styles.hash} numberOfLines={1}>{result.stored_hash}</Text>
      {txHash && getLiveData().chain?.chainId === 80002 ? (
        <Pressable onPress={() => Linking.openURL(`${EXPLORER}${txHash}`)} accessibilityRole="link">
          <Text style={styles.link}>View transaction</Text>
        </Pressable>
      ) : txHash ? (
        <Text style={styles.hash} numberOfLines={1}>Tx {txHash} · {getLiveData().chain?.network}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  box: { borderRadius: 10, padding: 12, gap: 4, borderWidth: 1, alignSelf: 'stretch' },
  good: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  bad: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  wait: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  label: { fontSize: 14, fontWeight: '700', color: '#10234D' },
  detail: { fontSize: 12, lineHeight: 17, color: '#475569' },
  hash: { fontSize: 10, color: '#64748B', fontFamily: 'monospace' },
  link: { fontSize: 12, fontWeight: '700', color: '#2563EB', marginTop: 4 },
});

export default ChainProof;
