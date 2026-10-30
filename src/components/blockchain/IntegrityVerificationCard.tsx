import React from 'react';
import { StyleSheet, Text, View, Platform } from 'react-native';
import { ShieldCheck, ShieldAlert, AlertTriangle, Check, X, Clock, HelpCircle } from 'lucide-react-native';
import { PlanVerificationReport, VerificationStatus } from '../../types/blockchain';

interface IntegrityVerificationCardProps {
  report: PlanVerificationReport | null;
  loading?: boolean;
}

export default function IntegrityVerificationCard({
  report,
  loading = false,
}: IntegrityVerificationCardProps) {
  if (loading) {
    return (
      <View style={styles.cardLoading}>
        <Clock size={16} color="#64748B" style={{ marginRight: 8 }} />
        <Text style={styles.loadingText}>Running 15-Point Cryptographic Plan Verification...</Text>
      </View>
    );
  }

  if (!report) return null;

  const status = report.status || report.result;

  const isVerifiedPositive =
    status === 'VERIFIED' ||
    status === 'VERIFIED_WITHOUT_EXTERNAL_EVIDENCE' ||
    status === 'LEGACY_VERIFIED';

  const isPending = status === 'PENDING' || status === 'SUPERSEDED';

  const isTamperedOrMismatch =
    status === 'PLAN_HASH_MISMATCH' ||
    status === 'SIMULATION_HASH_MISMATCH' ||
    status === 'MANIFEST_ROOT_MISMATCH' ||
    status === 'EVIDENCE_CONTENT_TAMPERED' ||
    status === 'MANIFEST_MISSING' ||
    status === 'MANIFEST_INVALID' ||
    status === 'EVIDENCE_MISSING' ||
    status === 'INSUFFICIENT_INTEGRITY_PROOF' ||
    status === 'EVIDENCE_ASSOCIATION_MISMATCH' ||
    status === 'ORGANIZATION_MISMATCH' ||
    status === 'DISRUPTION_MISMATCH' ||
    status === 'VERSION_MISMATCH';

  const getStatusLabel = (code: string) => {
    switch (code) {
      case 'VERIFIED':
        return 'Cryptographically Verified (v2)';
      case 'VERIFIED_WITHOUT_EXTERNAL_EVIDENCE':
        return 'Verified (Zero-Manifest Sentinel)';
      case 'LEGACY_VERIFIED':
        return 'Legacy Verified (v1 Schema)';
      case 'PENDING':
        return 'Plan Anchored • Awaiting Approvals';
      case 'SUPERSEDED':
        return 'Integrity Intact • Superseded';
      case 'PLAN_HASH_MISMATCH':
        return 'Plan Hash Tampered / Mismatch';
      case 'SIMULATION_HASH_MISMATCH':
        return 'Simulation Divergence Detected';
      case 'MANIFEST_ROOT_MISMATCH':
        return 'Evidence Manifest Mismatch';
      case 'EVIDENCE_CONTENT_TAMPERED':
        return 'Evidence Content Tampered';
      case 'MANIFEST_MISSING':
        return 'Manifest Missing';
      case 'MANIFEST_INVALID':
        return 'Invalid Merkle Manifest';
      case 'EVIDENCE_MISSING':
        return 'Evidence Artifact Deleted';
      case 'INSUFFICIENT_INTEGRITY_PROOF':
        return 'Insufficient Integrity Proof';
      case 'EVIDENCE_ASSOCIATION_MISMATCH':
        return 'Evidence Cross-Association Violation';
      case 'ORGANIZATION_MISMATCH':
        return 'Tenant Cross-Boundary Violation';
      case 'DISRUPTION_MISMATCH':
        return 'Disruption Reference Mismatch';
      case 'VERSION_MISMATCH':
        return 'Version Mismatch';
      case 'ON_CHAIN_RECORD_MISSING':
        return 'Not Anchored On-Chain';
      case 'VERSION_NOT_FOUND':
        return 'Version Not Found On-Chain';
      case 'RPC_UNAVAILABLE':
        return 'Blockchain RPC Unavailable';
      default:
        return code;
    }
  };

  return (
    <View
      style={[
        styles.card,
        isVerifiedPositive && styles.cardVerified,
        isPending && styles.cardPending,
        isTamperedOrMismatch && styles.cardTampered,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          {isVerifiedPositive && <ShieldCheck size={20} color="#16A34A" />}
          {isPending && <Clock size={20} color="#D97706" />}
          {isTamperedOrMismatch && <ShieldAlert size={20} color="#DC2626" />}
          {!isVerifiedPositive && !isPending && !isTamperedOrMismatch && (
            <AlertTriangle size={20} color="#E11D48" />
          )}

          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{getStatusLabel(status)}</Text>
            <Text style={styles.headerSubtitle}>
              {report.plan_id} V{report.version} • {report.schema_version || 'v2'}
            </Text>
          </View>
        </View>
      </View>

      {/* Details banner */}
      <View style={styles.detailsBox}>
        <Text style={styles.detailsText}>{report.details}</Text>
      </View>

      {/* Checks checklist */}
      {report.checks && Object.keys(report.checks).length > 0 && (
        <View style={styles.checklist}>
          <Text style={styles.checklistTitle}>Cryptographic Verification Checks:</Text>
          {Object.entries(report.checks).map(([key, passed]) => {
            const formattedLabel = key
              .replace(/_/g, ' ')
              .replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <View key={key} style={styles.checkItem}>
                {passed ? <Check size={14} color="#16A34A" /> : <X size={14} color="#DC2626" />}
                <Text
                  style={[
                    styles.checkLabel,
                    passed ? styles.checkLabelPassed : styles.checkLabelFailed,
                  ]}
                >
                  {formattedLabel}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* Footer Timestamp */}
      <View style={styles.footerRow}>
        <Text style={styles.timestampText}>Verified at: {report.verification_timestamp}</Text>
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
  cardVerified: {
    borderColor: '#86EFAC',
    backgroundColor: '#F0FDF4',
  },
  cardPending: {
    borderColor: '#FDE68A',
    backgroundColor: '#FFFBEB',
  },
  cardTampered: {
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  cardLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748B',
  },
  detailsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  detailsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 17,
  },
  checklist: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  checklistTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  checkLabel: {
    fontSize: 11,
  },
  checkLabelPassed: {
    color: '#15803D',
    fontWeight: '600',
  },
  checkLabelFailed: {
    color: '#B91C1C',
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  timestampText: {
    fontSize: 10,
    color: '#94A3B8',
  },
});
