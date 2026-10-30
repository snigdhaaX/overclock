import { Sparkles, TriangleAlert } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AiPlanExplanation, AiRecommendation } from '@/services/backendSync';

/** Shows why an option makes sense, labelled as advice. The option's numbers still come from the rules. */
export const AiPlanNote: React.FC<{ explanation: AiPlanExplanation; recommended: boolean }> = ({ explanation, recommended }) => (
  <View style={styles.note}>
    <View style={styles.noteHead}>
      <Sparkles size={13} color="#6D28D9" />
      <Text style={styles.noteTitle}>{recommended ? 'AI suggests this option' : 'AI explanation'}</Text>
      <Text style={styles.confidence}>{explanation.confidence.toLowerCase()} confidence</Text>
    </View>
    <Text style={styles.body}>{explanation.explanation}</Text>
    {explanation.advantages.map((text, i) => <Text key={`a${i}`} style={styles.item}>+ {text}</Text>)}
    {explanation.disadvantages.map((text, i) => <Text key={`d${i}`} style={styles.item}>- {text}</Text>)}
    {explanation.required_validation.length > 0 ? (
      <Text style={styles.check}>Check before approving: {explanation.required_validation.join(' ')}</Text>
    ) : null}
  </View>
);

export const AiStatusBanner: React.FC<{ loading: boolean; result: AiRecommendation | null; onRetry: () => void }> = ({ loading, result, onRetry }) => {
  if (loading) {
    return <View style={[styles.banner, styles.bannerAi]}><Text style={styles.bannerAiText}>Getting AI explanations…</Text></View>;
  }
  if (!result) return null;
  if (result.status === 'AVAILABLE') {
    return (
      <View style={[styles.banner, styles.bannerAi]}>
        <Sparkles size={15} color="#6D28D9" />
        <View style={styles.bannerBody}>
          <Text style={styles.bannerAiText}>{result.overview}</Text>
          <Text style={styles.bannerFoot}>{result.advisory_notice}</Text>
        </View>
      </View>
    );
  }
  if (result.reason === 'NO_OPTIONS') return null;
  return (
    <View style={[styles.banner, styles.bannerOff]}>
      <TriangleAlert size={15} color="#92400E" />
      <Text style={styles.bannerOffText}>{result.message}</Text>
      <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
        <Text style={styles.retry}>Retry</Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  note: { backgroundColor: '#F5F3FF', borderRadius: 10, padding: 10, gap: 4, marginTop: -4, marginBottom: 12 },
  noteHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noteTitle: { flex: 1, fontSize: 12, fontWeight: '700', color: '#5B21B6' },
  confidence: { fontSize: 11, color: '#6D28D9' },
  body: { fontSize: 12, lineHeight: 17, color: '#334155' },
  item: { fontSize: 12, lineHeight: 17, color: '#475569' },
  check: { fontSize: 11, lineHeight: 16, color: '#475569', fontWeight: '600', marginTop: 2 },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 10, marginBottom: 10 },
  bannerBody: { flex: 1, gap: 3 },
  bannerAi: { backgroundColor: '#F5F3FF' },
  bannerAiText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#4C1D95' },
  bannerFoot: { fontSize: 11, color: '#6D28D9' },
  bannerOff: { backgroundColor: '#FEF3C7' },
  bannerOffText: { flex: 1, fontSize: 12, lineHeight: 17, color: '#92400E' },
  retry: { fontSize: 12, fontWeight: '700', color: '#92400E' },
});
