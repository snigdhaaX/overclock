import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RiskStatus } from '../hooks/useOrderRisk';
import type { OrderRiskSource } from '../types';

interface RiskSourceNoteProps {
  status: RiskStatus;
  source?: OrderRiskSource;
  onRetry?: () => void;
}

function describe(status: RiskStatus, source?: OrderRiskSource): string {
  if (status === 'loading') return 'Getting live risk scores…';
  if (status === 'unavailable' || !source) return 'Risk service offline. Scores below are sample data, not calculated.';
  const method = source.kind === 'ml' ? `ML model v${source.modelVersion}` : 'PRD risk formula (no model has beaten it yet)';
  const synthetic = source.dataSources.includes('synthetic') ? ', trained on synthetic demo data' : '';
  return `Live scores from ${source.kind === 'ml' ? method + synthetic : method}. Order inputs are sample data.`;
}

export const RiskSourceNote: React.FC<RiskSourceNoteProps> = ({ status, source, onRetry }) => {
  const offline = status === 'unavailable';
  return (
    <View style={[styles.note, offline && styles.noteOffline]} accessibilityRole="text">
      <Text style={[styles.text, offline && styles.textOffline]}>{describe(status, source)}</Text>
      {offline && onRetry ? (
        <Pressable onPress={onRetry} hitSlop={8} accessibilityRole="button">
          <Text style={styles.retry}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  noteOffline: {
    backgroundColor: '#FEF3C7',
  },
  text: {
    flex: 1,
    fontSize: 11,
    lineHeight: 15,
    color: '#1E40AF',
  },
  textOffline: {
    color: '#92400E',
  },
  retry: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
});

export default RiskSourceNote;
