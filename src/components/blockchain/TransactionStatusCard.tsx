import React from 'react';
import { StyleSheet, Text, View, Platform, ActivityIndicator } from 'react-native';
import { CheckCircle2, Clock, XCircle, AlertTriangle, ExternalLink } from 'lucide-react-native';
import { TrackedTransaction } from '../../types/blockchain';

interface TransactionStatusCardProps {
  transaction: TrackedTransaction | null;
  onRefresh?: () => void;
}

export default function TransactionStatusCard({
  transaction,
  onRefresh,
}: TransactionStatusCardProps) {
  if (!transaction) return null;

  const isConfirmed = transaction.status === 'CONFIRMED';
  const isPending =
    transaction.status === 'SUBMITTED' ||
    transaction.status === 'PENDING' ||
    transaction.status === 'INCLUDED';
  const isFailed = transaction.status === 'FAILED';

  const txHash = transaction.tx_hash;
  const truncatedHash =
    txHash.length > 22 ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : txHash;

  return (
    <View
      style={[
        styles.card,
        isConfirmed && styles.cardConfirmed,
        isPending && styles.cardPending,
        isFailed && styles.cardFailed,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {isConfirmed && <CheckCircle2 size={18} color="#16A34A" />}
          {isPending && <ActivityIndicator size="small" color="#D97706" />}
          {isFailed && <XCircle size={18} color="#DC2626" />}

          <View>
            <Text style={styles.title}>
              {isConfirmed
                ? 'On-Chain Confirmation'
                : isPending
                ? 'Awaiting Block Confirmations'
                : 'Transaction Failed'}
            </Text>
            <Text style={styles.functionName}>
              Function: <Text style={{ fontWeight: '700' }}>{transaction.function_name || 'Contract Call'}</Text>
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.statusPill,
            isConfirmed && styles.statusPillConfirmed,
            isPending && styles.statusPillPending,
            isFailed && styles.statusPillFailed,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isConfirmed && styles.statusTextConfirmed,
              isPending && styles.statusTextPending,
              isFailed && styles.statusTextFailed,
            ]}
          >
            {transaction.status}
          </Text>
        </View>
      </View>

      {/* Transaction Hash */}
      <View style={styles.hashBox}>
        <Text style={styles.hashLabel}>TX HASH</Text>
        <Text style={styles.hashValue} numberOfLines={1} ellipsizeMode="middle">
          {transaction.tx_hash}
        </Text>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Block</Text>
          <Text style={styles.metricValue}>
            {transaction.block_number ? `#${transaction.block_number}` : 'Pending'}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Confirmations</Text>
          <Text
            style={[
              styles.metricValue,
              transaction.confirmations >= 2 ? { color: '#16A34A' } : { color: '#D97706' },
            ]}
          >
            {transaction.confirmations} / 2
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Chain</Text>
          <Text style={styles.metricValue}>
            {transaction.chain_id === 80002
              ? 'Amoy'
              : transaction.chain_id === 31337
              ? 'Hardhat'
              : transaction.chain_id}
          </Text>
        </View>
      </View>

      {transaction.error_message && (
        <View style={styles.errorBox}>
          <AlertTriangle size={14} color="#DC2626" style={{ marginRight: 6 }} />
          <Text style={styles.errorText}>{transaction.error_message}</Text>
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
  cardConfirmed: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  cardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  cardFailed: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
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
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  functionName: {
    fontSize: 11,
    color: '#64748B',
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusPillConfirmed: {
    backgroundColor: '#DCFCE7',
  },
  statusPillPending: {
    backgroundColor: '#FEF3C7',
  },
  statusPillFailed: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusTextConfirmed: {
    color: '#15803D',
  },
  statusTextPending: {
    color: '#B45309',
  },
  statusTextFailed: {
    color: '#B91C1C',
  },
  hashBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  hashLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  hashValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#1E293B',
    marginTop: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#FEE2E2',
  },
  errorText: {
    fontSize: 11,
    color: '#991B1B',
    flex: 1,
  },
});
