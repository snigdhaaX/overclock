import { useRouter } from 'expo-router';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  History,
  Info,
  Search,
  ShieldCheck,
  User,
  X,
  XCircle,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ProcurementBottomNav } from '../../../features/procurement-approver/components/ProcurementBottomNav';
import { ProcurementHeader } from '../../../features/procurement-approver/components/ProcurementHeader';
import { procurementService } from '../../../features/procurement-approver/services/procurementService';
import {
  ApprovalAuditEvent,
  RequestStatus,
} from '../../../features/procurement-approver/types';

export default function ApprovalHistoryScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<RequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setDataVersion] = useState(0);

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const events = procurementService.getAuditEvents(activeFilter, searchQuery);

  const filters: { key: RequestStatus | 'all'; label: string }[] = [
    { key: 'all', label: 'All Events' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
    { key: 'pending', label: 'In Review' },
    { key: 'changes_requested', label: 'Changes' },
  ];

  const getActionConfig = (action: ApprovalAuditEvent['action']) => {
    switch (action) {
      case 'approved':
        return {
          icon: <CheckCircle2 size={16} color="#15803D" />,
          bg: '#DCFCE7',
          color: '#15803D',
        };
      case 'rejected':
        return {
          icon: <XCircle size={16} color="#B91C1C" />,
          bg: '#FEE2E2',
          color: '#B91C1C',
        };
      case 'changes_requested':
        return {
          icon: <Clock size={16} color="#B45309" />,
          bg: '#FEF3C7',
          color: '#B45309',
        };
      case 'po_created':
        return {
          icon: <FileText size={16} color="#2563EB" />,
          bg: '#EFF6FF',
          color: '#2563EB',
        };
      case 'supplier_notified':
        return {
          icon: <CheckCircle2 size={16} color="#8B5CF6" />,
          bg: '#FAF5FF',
          color: '#8B5CF6',
        };
      case 'supplier_evaluated':
        return {
          icon: <FileCheck size={16} color="#6366F1" />,
          bg: '#EEF2FF',
          color: '#6366F1',
        };
      case 'reviewed':
        return {
          icon: <Clock size={16} color="#64748B" />,
          bg: '#F1F5F9',
          color: '#475569',
        };
      default:
        return {
          icon: <Clock size={16} color="#64748B" />,
          bg: '#F1F5F9',
          color: '#475569',
        };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Approval History & Audit"
        subtitle="Immutable Audit Trail of Procurement Decisions"
        showBack
        onBack={() => router.back()}
      />

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <Pressable
                key={f.key}
                style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text
                  style={[
                    styles.filterBtnText,
                    isActive && styles.filterBtnTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search event ID, request ID, actor, or comments..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={8}>
              <X size={16} color="#94A3B8" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Ledger Assurance Banner */}
      <View style={styles.bannerContainer}>
        <View style={styles.ledgerBanner}>
          <ShieldCheck size={15} color="#15803D" />
          <Text style={styles.ledgerText}>
            Enterprise Governance Ledger: Cryptographic event logs anchored with role attribution.
          </Text>
        </View>
      </View>

      {/* Audit Timeline */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {events.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Audit Records Found</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Try modifying your search keywords or removing status filters.'
                : 'No procurement audit events match this category.'}
            </Text>
          </View>
        ) : (
          events.map((evt, idx) => {
            const config = getActionConfig(evt.action);
            const isLast = idx === events.length - 1;

            return (
              <View key={evt.id} style={styles.timelineItem}>
                {/* Timeline Spine */}
                <View style={styles.spineCol}>
                  <View style={[styles.spineDot, { backgroundColor: config.bg }]}>
                    {config.icon}
                  </View>
                  {!isLast && <View style={styles.spineLine} />}
                </View>

                {/* Event Card */}
                <View style={styles.eventCard}>
                  {/* Top Bar: Event ID & Action */}
                  <View style={styles.cardTop}>
                    <View style={styles.idGroup}>
                      <Text style={styles.eventId}>{evt.id}</Text>
                      <Pressable
                        style={styles.reqPill}
                        onPress={() =>
                          router.push(
                            `/(protected)/procurement-approver/requests/${evt.requestId}` as any
                          )
                        }
                      >
                        <Text style={styles.reqPillText}>{evt.requestId}</Text>
                        <ExternalLink size={10} color="#8B5CF6" />
                      </Pressable>
                    </View>

                    <View style={[styles.actionBadge, { backgroundColor: config.bg }]}>
                      <Text style={[styles.actionBadgeText, { color: config.color }]}>
                        {evt.actionLabel.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Actor & Timestamp */}
                  <View style={styles.actorRow}>
                    <View style={styles.actorItem}>
                      <User size={12} color="#64748B" />
                      <Text style={styles.actorName}>{evt.actor}</Text>
                      <Text style={styles.roleTag}>({evt.role})</Text>
                    </View>
                    <View style={styles.timestampItem}>
                      <Calendar size={11} color="#94A3B8" />
                      <Text style={styles.timestampText}>{evt.timestamp}</Text>
                    </View>
                  </View>

                  {/* Comments */}
                  {evt.comments && (
                    <View style={styles.commentBox}>
                      <Text style={styles.commentLabel}>Justification / Note:</Text>
                      <Text style={styles.commentText}>{evt.comments}</Text>
                    </View>
                  )}

                  {/* Blockchain Anchor */}
                  {evt.txHash && (
                    <View style={styles.txRow}>
                      <ShieldCheck size={12} color="#15803D" />
                      <Text style={styles.txHashText}>
                        Anchored: {evt.txHash}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <ProcurementBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  filterBar: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  filterBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
  },
  searchRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
    padding: 0,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  ledgerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  ledgerText: {
    fontSize: 11,
    color: '#166534',
    flex: 1,
    lineHeight: 15,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 95,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  spineCol: {
    alignItems: 'center',
    width: 32,
    marginRight: 10,
  },
  spineDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  spineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  eventCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardTop: {
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
  },
  reqPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  reqPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  actorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 4,
  },
  actorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actorName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  roleTag: {
    fontSize: 10,
    color: '#64748B',
  },
  timestampItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  commentBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
    marginTop: 4,
  },
  commentLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  commentText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  txHashText: {
    fontSize: 10,
    color: '#15803D',
    fontFamily: 'monospace',
  },
});
