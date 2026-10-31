import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getLiveData, runRetrain, syncNow, type RetrainResult } from '@/services/backendSync';

const num = (value: unknown, digits = 3) => (typeof value === 'number' ? value.toFixed(digits) : '—');

/** Reads the model the server is really scoring with, including the test it had to pass to go live. */
export const RiskEngineCard: React.FC<{ canRetrain?: boolean }> = ({ canRetrain = true }) => {
  const risk = getLiveData().risk;
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<RetrainResult | null>(null);

  if (!risk) return null;
  const run = risk.latest_run;
  const metrics = run?.metrics;
  const isMl = risk.scoring_method === 'ml';

  const handleRetrain = async () => {
    setChecking(true);
    try {
      setResult(await runRetrain());
      await syncNow();
    } catch (err: any) {
      setResult({ status: 'FAILED', reason: err?.message ?? 'Retraining could not run.' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Live risk engine</Text>
        <Text style={[styles.badge, isMl ? styles.badgeMl : styles.badgeFormula]}>
          {isMl ? `ML model v${risk.active_version}` : 'Formula fallback'}
        </Text>
      </View>

      {run?.decision_reason ? <Text style={styles.reason}>{run.decision_reason}</Text> : null}

      {metrics?.challenger && metrics?.formula ? (
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cellLabel, styles.head]}>On unseen orders</Text>
            <Text style={[styles.cell, styles.head]}>ML</Text>
            <Text style={[styles.cell, styles.head]}>Formula</Text>
          </View>
          {typeof metrics.challenger.accuracy === 'number' ? (
            <View style={styles.row}>
              <Text style={styles.cellLabel}>Accuracy (baseline {num(metrics.challenger.baseline_accuracy)})</Text>
              <Text style={[styles.cell, styles.win]}>{num(metrics.challenger.accuracy)}</Text>
              <Text style={styles.cell}>{num(metrics.formula.accuracy)}</Text>
            </View>
          ) : null}
          <View style={styles.row}>
            <Text style={styles.cellLabel}>PR-AUC</Text>
            <Text style={[styles.cell, styles.win]}>{num(metrics.challenger.pr_auc)}</Text>
            <Text style={styles.cell}>{num(metrics.formula.pr_auc)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>ROC-AUC</Text>
            <Text style={[styles.cell, styles.win]}>{num(metrics.challenger.roc_auc)}</Text>
            <Text style={styles.cell}>{num(metrics.formula.roc_auc)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.cellLabel}>Misses in top 20%</Text>
            <Text style={[styles.cell, styles.win]}>{num(metrics.challenger.top20_capture)}</Text>
            <Text style={styles.cell}>{num(metrics.formula.top20_capture)}</Text>
          </View>
        </View>
      ) : null}

      {run ? (
        <Text style={styles.meta}>
          Trained on {run.train_rows.toLocaleString()} orders, tested on {run.eval_rows.toLocaleString()} later ones. Data: {(metrics?.data_sources ?? []).join(', ') || 'unknown'}.
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {risk.new_outcomes_since_active} of {risk.retrain_after_new_outcomes} new real outcomes collected before the next automatic retrain.
      </Text>

      {canRetrain ? (
        <Pressable onPress={handleRetrain} disabled={checking} style={styles.button} accessibilityRole="button">
          {checking ? <ActivityIndicator size="small" color="#2563EB" /> : <Text style={styles.buttonText}>Run retraining check</Text>}
        </Pressable>
      ) : null}
      {result ? (
        <Text style={styles.result}>
          {result.status}{result.reason ? `: ${result.reason}` : ''}{result.decision_reason ? `: ${result.decision_reason}` : ''}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6EAF1', padding: 14, marginBottom: 14, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 15, fontWeight: '800', color: '#10234D' },
  badge: { fontSize: 11, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  badgeMl: { backgroundColor: '#DCFCE7', color: '#166534' },
  badgeFormula: { backgroundColor: '#FEF3C7', color: '#92400E' },
  reason: { fontSize: 12, lineHeight: 17, color: '#475569' },
  table: { borderTopWidth: 1, borderTopColor: '#E6EAF1' },
  row: { flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F1F4F9' },
  cellLabel: { flex: 2, fontSize: 12, color: '#475569' },
  cell: { flex: 1, fontSize: 12, textAlign: 'right', color: '#475569' },
  head: { fontWeight: '700', color: '#10234D' },
  win: { fontWeight: '800', color: '#16A34A' },
  meta: { fontSize: 11, lineHeight: 16, color: '#64748B' },
  button: { marginTop: 4, borderWidth: 1, borderColor: '#BFDBFE', backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  buttonText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },
  result: { fontSize: 12, lineHeight: 17, color: '#10234D', fontWeight: '600' },
});

export default RiskEngineCard;
