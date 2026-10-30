import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  Layers,
  MapPin,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  User,
  Warehouse,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';

export default function RecoveryExecutionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const plan =
    managerService.getRecoveryPlanById(id || 'RP-004') ||
    managerService.getRecoveryPlanById('RP-001') ||
    managerService.getRecoveryPlans()[0];

  const milestones = [
    {
      id: 'm-1',
      title: 'Plan Approved & Blockchain Logged',
      role: 'Supply Chain Manager',
      actor: 'David Vance',
      status: 'completed',
      time: '24 Oct 2026, 09:15 AM',
      details: 'Formally authorized under Policy RP-POL-04. Immutable audit transaction #0x9f88c committed.',
    },
    {
      id: 'm-2',
      title: 'Stock Picking & Packing at WH-BLR',
      role: 'Warehouse Operator',
      actor: 'Carlos Mendez (WH-BLR)',
      status: 'completed',
      time: '24 Oct 2026, 11:30 AM',
      details: '280 units of PRD-012 inspected, RFID tagged, and loaded onto outbound priority bay.',
    },
    {
      id: 'm-3',
      title: 'In Transit — Dedicated Road Corridor',
      role: 'Logistics Carrier',
      actor: 'BlueDart Logistics Fleet',
      status: 'in_progress',
      time: '24 Oct 2026, 01:00 PM',
      details: 'En route on National Highway 48. GPS tracking active: 310 km completed, 190 km remaining.',
    },
    {
      id: 'm-4',
      title: 'EduTech Dock Intake & Order Fulfilment',
      role: 'Customer Receiving',
      actor: 'EduTech Systems Dock',
      status: 'pending',
      time: 'Est. 25 Oct 2026, 06:00 AM',
      details: 'Dock intake gate reserved. Cross-docking directly to production assembly.',
    },
    {
      id: 'm-5',
      title: 'Post-Delivery Audit & Closure',
      role: 'Quality Assurance',
      actor: 'Central Operations Command',
      status: 'pending',
      time: 'Est. 25 Oct 2026, 10:00 AM',
      details: 'SLA penalty waiver confirmation and final ledger reconciliation.',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title={plan.id}
        subtitle="Live execution tracking & multi-role milestone handoffs"
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Status Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <View>
              <Text style={styles.heroId}>{plan.id} Execution Monitor</Text>
              <Text style={styles.heroName}>{plan.planName}</Text>
            </View>
            <StatusBadge status={plan.status} size="md" />
          </View>

          {/* Progress */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Overall Milestone Execution</Text>
              <Text style={styles.progressVal}>65% Completed</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: '65%' }]} />
            </View>
          </View>

          {/* Authorization Shield Pill */}
          <View style={styles.authPill}>
            <ShieldCheck size={14} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.authPillText}>
              Authorized by: <Text style={{ fontWeight: '800' }}>David Vance (Supply Chain Manager)</Text>
            </Text>
          </View>
        </View>

        {/* Milestone Timeline */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeaderTitle}>Execution Milestones & Multi-Role Handoffs</Text>
          <Text style={styles.cardSubtitle}>
            Live accountability tracking across warehouse operators, carriers, and dispatchers
          </Text>

          <View style={styles.timelineList}>
            {milestones.map((m, idx) => {
              const isDone = m.status === 'completed';
              const isInProg = m.status === 'in_progress';
              return (
                <View key={m.id} style={styles.milestoneRow}>
                  <View style={styles.milestoneLeft}>
                    <View
                      style={[
                        styles.milestoneDot,
                        isDone && styles.dotDone,
                        isInProg && styles.dotInProg,
                      ]}
                    >
                      {isDone && <CheckCircle2 size={12} color="#FFFFFF" />}
                    </View>
                    {idx < milestones.length - 1 && (
                      <View
                        style={[
                          styles.milestoneLine,
                          isDone && { backgroundColor: '#10B981' },
                        ]}
                      />
                    )}
                  </View>

                  <View style={styles.milestoneRight}>
                    <View style={styles.milestoneHeader}>
                      <Text style={styles.milestoneTitle}>{m.title}</Text>
                      <Text style={styles.milestoneTime}>{m.time}</Text>
                    </View>

                    <View style={styles.roleTagRow}>
                      <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>{m.role}</Text>
                      </View>
                      <Text style={styles.actorName}>{m.actor}</Text>
                    </View>

                    <Text style={styles.milestoneDesc}>{m.details}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <Pressable
            style={styles.actionBtnOutline}
            onPress={() =>
              router.push(`/(protected)/supply-chain-manager/disruptions/${plan.relatedDisruptionId}` as any)
            }
          >
            <Text style={styles.actionBtnOutlineText}>View Disruption</Text>
          </Pressable>

          <Pressable
            style={styles.actionBtnPrimary}
            onPress={() => router.push('/(protected)/supply-chain-manager/network' as any)}
          >
            <Compass size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.actionBtnPrimaryText}>Track on Highway Map</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 40,
    gap: 14,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  heroId: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0D9488',
  },
  heroName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  progressVal: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D9488',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0D9488',
    borderRadius: 4,
  },
  authPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  authPillText: {
    fontSize: 11,
    color: '#0F766E',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  cardHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 16,
  },
  timelineList: {
    gap: 4,
  },
  milestoneRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  milestoneLeft: {
    width: 24,
    alignItems: 'center',
  },
  milestoneDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: '#10B981',
  },
  dotInProg: {
    backgroundColor: '#0D9488',
  },
  milestoneLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 4,
  },
  milestoneRight: {
    flex: 1,
    paddingLeft: 8,
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 2,
  },
  milestoneTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    flex: 1,
  },
  milestoneTime: {
    fontSize: 10,
    color: '#94A3B8',
    fontFamily: 'monospace',
  },
  roleTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  roleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  actorName: {
    fontSize: 11,
    color: '#64748B',
  },
  milestoneDesc: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionBtnOutline: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnOutlineText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  actionBtnPrimary: {
    flex: 1.4,
    backgroundColor: '#0D9488',
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
