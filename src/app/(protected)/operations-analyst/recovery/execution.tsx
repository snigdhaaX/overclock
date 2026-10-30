import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Building,
  CheckCircle2,
  Clock,
  Layers,
  MapPin,
  PlayCircle,
  ShieldCheck,
  Truck,
  User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import StatusBadge from '../../../../features/operations-analyst/components/StatusBadge';
import TimelineView, { TimelineItem } from '../../../../features/operations-analyst/components/TimelineView';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { useSyncVersion } from '@/services/backendSync';

export default function ExecutionTrackingScreen() {
  const router = useRouter();
  useSyncVersion();
  const trackingData = operationsService.getExecutionTracking();
  const [reportedIssue, setReportedIssue] = useState(false);

  const timelineItems: TimelineItem[] = trackingData.stages.map((st) => ({
    id: st.id,
    title: st.title,
    timestamp: st.timestamp,
    description: `${st.details}\nResponsible: ${st.responsibleParty} (${st.responsibleRole})`,
    status:
      st.status === 'Completed'
        ? 'completed'
        : st.status === 'In Progress'
        ? 'in_progress'
        : st.status === 'Blocked'
        ? 'blocked'
        : 'pending',
    actor: st.responsibleRole,
  }));

  const handleReportIssue = () => {
    Alert.alert(
      'Report Operational Bottleneck',
      'Log an operational issue against Stage 3 (In Transit). An alert will be routed to the Logistics Carrier and Warehouse Coordinator.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit Operational Alert',
          onPress: () => {
            setReportedIssue(true);
            Alert.alert('Issue Logged', 'Operational alert #ISS-992 dispatched to dispatch team.');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Execution Tracking"
        subtitle={`Active Plan: ${trackingData.planId}`}
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Overall Progress Hero Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroPlanName}>{trackingData.planName}</Text>
              <Text style={styles.heroRef}>Disruption Reference: {trackingData.disruptionId}</Text>
            </View>
            <StatusBadge status={trackingData.status} />
          </View>

          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressLabel}>Overall Milestone Execution</Text>
              <Text style={styles.progressPct}>{trackingData.overallProgress}% Completed</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View
                style={[styles.progressBarFill, { width: `${trackingData.overallProgress}%` }]}
              />
            </View>
          </View>

          {/* Governance & Authorization Meta */}
          <View style={styles.authMetaRow}>
            <ShieldCheck size={16} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.authMetaText}>
              Authorized by: <Text style={{ fontWeight: '700' }}>{trackingData.approvedBy}</Text>
            </Text>
          </View>
        </View>

        {/* Issue Report Banner */}
        {reportedIssue && (
          <View style={styles.issueBanner}>
            <AlertCircle size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.issueTitle}>Active Incident Logged (#ISS-992)</Text>
              <Text style={styles.issueDesc}>
                Carrier transit team notified of regional NH48 road congestion alert.
              </Text>
            </View>
          </View>
        )}

        {/* Detailed Stages Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Execution Milestones & Multi-Role Handoffs</Text>
          <Text style={styles.sectionSub}>
            Live accountability tracking across warehouse operators, carriers, and dispatchers
          </Text>

          <TimelineView items={timelineItems} />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <Pressable
          onPress={() => router.push(`/(protected)/operations-analyst/disruptions/${trackingData.disruptionId}`)}
          style={styles.secondaryBtn}
        >
          <Text style={styles.secondaryBtnText}>View Disruption</Text>
        </Pressable>

        <Pressable onPress={handleReportIssue} style={styles.reportBtn}>
          <AlertTriangle size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.reportBtnText}>Report Bottleneck</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 95,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroPlanName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  heroRef: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 14,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  progressPct: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 4,
  },
  authMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  authMetaText: {
    fontSize: 11,
    color: '#166534',
  },
  issueBanner: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 16,
  },
  issueTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
  },
  issueDesc: {
    fontSize: 11,
    color: '#B91C1C',
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
  },
  sectionSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 14,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  secondaryBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  reportBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 12,
  },
  reportBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
