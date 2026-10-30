import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { CheckCircle2, XCircle, RotateCcw, User, Clock, FileText } from 'lucide-react-native';
import { PlanDecision } from '../../types/blockchain';

interface GovernanceDecisionCardProps {
  decisions: PlanDecision[];
}

export default function GovernanceDecisionCard({ decisions }: GovernanceDecisionCardProps) {
  if (!decisions || decisions.length === 0) {
    return (
      <View style={styles.cardEmpty}>
        <Clock size={16} color="#94A3B8" style={{ marginRight: 6 }} />
        <Text style={styles.emptyText}>No on-chain governance decisions recorded yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>On-Chain Governance Decisions ({decisions.length})</Text>

      {decisions.map((d, index) => {
        const isApproved = d.decision === 'APPROVE' || d.decision_code === 1;
        const isRejected = d.decision === 'REJECT' || d.decision_code === 2;
        const isRevision = d.decision === 'REQUEST_REVISION' || d.decision_code === 3;

        const dateStr = d.timestamp
          ? new Date(d.timestamp * 1000).toLocaleString()
          : 'Pending timestamp';

        const truncatedActor =
          d.actor.length > 14 ? `${d.actor.slice(0, 6)}...${d.actor.slice(-4)}` : d.actor;

        return (
          <View key={index} style={styles.decisionItem}>
            <View style={styles.decisionTop}>
              <View style={styles.decisionLeft}>
                {isApproved && <CheckCircle2 size={16} color="#16A34A" />}
                {isRejected && <XCircle size={16} color="#DC2626" />}
                {isRevision && <RotateCcw size={16} color="#D97706" />}

                <Text style={styles.stageTitle}>Stage {d.stage}:</Text>
                <Text
                  style={[
                    styles.actionText,
                    isApproved && styles.textApproved,
                    isRejected && styles.textRejected,
                    isRevision && styles.textRevision,
                  ]}
                >
                  {isApproved
                    ? 'APPROVED'
                    : isRejected
                    ? 'REJECTED'
                    : isRevision
                    ? 'REVISION REQUESTED'
                    : d.decision}
                </Text>
              </View>

              <Text style={styles.timestampText}>{dateStr}</Text>
            </View>

            <View style={styles.actorRow}>
              <User size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.actorLabel}>Signer:</Text>
              <Text style={styles.actorValue}>{truncatedActor}</Text>
            </View>

            {d.reason_hash && d.reason_hash !== '0x' + '0'.repeat(64) && (
              <View style={styles.reasonBox}>
                <FileText size={12} color="#64748B" style={{ marginRight: 4 }} />
                <Text style={styles.reasonLabel}>Reason Hash:</Text>
                <Text style={styles.reasonHash} numberOfLines={1} ellipsizeMode="middle">
                  {d.reason_hash}
                </Text>
              </View>
            )}
          </View>
        );
      })}
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
  cardEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 12,
    color: '#64748B',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  decisionItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  decisionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  decisionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  actionText: {
    fontSize: 12,
    fontWeight: '800',
  },
  textApproved: {
    color: '#16A34A',
  },
  textRejected: {
    color: '#DC2626',
  },
  textRevision: {
    color: '#D97706',
  },
  timestampText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  actorLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  actorValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: '#0F172A',
  },
  reasonBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
  },
  reasonLabel: {
    fontSize: 10,
    color: '#64748B',
    marginRight: 4,
  },
  reasonHash: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
    flex: 1,
  },
});
