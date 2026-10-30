import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileCheck,
  FileText,
  Lock,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AuditEvent } from '../types';

interface AuditEventCardProps {
  event: AuditEvent;
}

export const AuditEventCard: React.FC<AuditEventCardProps> = ({ event }) => {
  const getTypeBadge = () => {
    switch (event.type) {
      case 'plan_approved':
        return { label: 'Plan Authorized', color: '#16A36A', bg: '#F0FDF4' };
      case 'plan_rejected':
        return { label: 'Plan Rejected', color: '#DC2626', bg: '#FEF2F2' };
      case 'changes_requested':
        return { label: 'Changes Requested', color: '#D97706', bg: '#FFFBEB' };
      case 'plan_submitted':
        return { label: 'Governance Submission', color: '#0D9488', bg: '#F0FDFA' };
      case 'disruption_detected':
        return { label: 'Disruption Detected', color: '#DC2626', bg: '#FEF2F2' };
      case 'milestone_completed':
        return { label: 'Milestone Dispatched', color: '#2563EB', bg: '#EFF6FF' };
      default:
        return { label: 'Audit Log', color: '#64748B', bg: '#F1F5F9' };
    }
  };

  const badge = getTypeBadge();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.idGroup}>
          <Text style={styles.eventId}>{event.id}</Text>
          <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={styles.timestamp}>{event.timestamp}</Text>
      </View>

      <Text style={styles.description}>{event.description}</Text>

      <View style={styles.actorRow}>
        <User size={13} color="#64748B" style={{ marginRight: 4 }} />
        <Text style={styles.actorLabel}>Actor:</Text>
        <Text style={styles.actorName}>{event.actor}</Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{event.role}</Text>
        </View>
      </View>

      {/* Cryptographic Ledger Verification */}
      <View style={styles.ledgerRow}>
        <View style={styles.ledgerStatus}>
          <ShieldCheck size={13} color="#16A36A" style={{ marginRight: 4 }} />
          <Text style={styles.ledgerStatusText}>{event.verificationStatus === 'verified' ? 'Confirmed on-chain' : event.verificationStatus === 'pending' ? 'On-chain confirmation pending' : 'Recorded in audit log'}</Text>
        </View>
        {event.txHash && (
          <Text style={styles.txHashText} numberOfLines={1}>
            {event.txHash}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eventId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    fontFamily: 'monospace',
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
  },
  description: {
    fontSize: 13,
    color: '#1E293B',
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    flexWrap: 'wrap',
    gap: 4,
  },
  actorLabel: {
    fontSize: 11,
    color: '#64748B',
  },
  actorName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  roleTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  roleTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  ledgerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ledgerStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16A36A',
  },
  txHashText: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#64748B',
    maxWidth: 140,
  },
});

export default AuditEventCard;
