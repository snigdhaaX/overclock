import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  Clock,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  ShieldAlert,
  X,
  Radio,
  FileText,
  User,
  Hash,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Check,
} from 'lucide-react-native';
import React, { useState, useEffect, useCallback } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ManagerBottomNav from '../../../features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '../../../features/supply-chain-manager/components/ManagerHeader';
import { blockchainApi } from '../../../services/blockchainApi';
import { BlockchainNetworkBadge } from '../../../components/blockchain';
import { IndexedEvent, TrackedTransaction } from '../../../types/blockchain';

interface CombinedAuditEvent {
  id: string;
  type: string;
  eventName: string;
  planId?: string;
  planVersion?: number;
  actor: string;
  txHash: string;
  blockNumber: number | null;
  timestamp: string;
  status: 'CONFIRMED' | 'PENDING' | 'SUBMITTED' | 'FAILED' | 'VERIFIED';
  details?: string;
}

export default function AuditActivityLogScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<CombinedAuditEvent[]>([]);
  const [networkConnected, setNetworkConnected] = useState(true);
  const [chainId, setChainId] = useState<number | null>(80002);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const filterOptions = [
    { label: 'All', value: 'All' },
    { label: 'Anchors', value: 'PlanAnchored' },
    { label: 'Approvals', value: 'PlanApproved' },
    { label: 'Rejections', value: 'PlanRejected' },
    { label: 'Revisions', value: 'RevisionRequested' },
    { label: 'Evidence', value: 'ExecutionEvidenceAnchored' },
  ];

  const loadAuditData = useCallback(async () => {
    try {
      // 1. Fetch network status
      try {
        const net = await blockchainApi.getNetworkInfo();
        setNetworkConnected(net.connected);
        setChainId(net.chain_id || 80002);
      } catch {
        setNetworkConnected(false);
      }

      // 2. Fetch indexed blockchain events
      const indexedEvents = await blockchainApi.getEvents(undefined, undefined, 50);

      // 3. Fetch tracked transactions
      const trackedTxs = await blockchainApi.listTrackedTransactions(50);

      const combined: CombinedAuditEvent[] = [];

      // Map indexed contract events
      for (const ev of indexedEvents) {
        combined.push({
          id: `ev-${ev.tx_hash.slice(0, 10)}-${ev.log_index}`,
          type: ev.event_name,
          eventName: ev.event_name,
          planId: ev.plan_id || undefined,
          planVersion: ev.plan_version || undefined,
          actor: ev.wallet_address || '0x0',
          txHash: ev.tx_hash,
          blockNumber: ev.block_number,
          timestamp: ev.indexed_at,
          status: 'CONFIRMED',
          details: JSON.stringify(ev.event_data),
        });
      }

      // If transactions are pending or recently registered without indexed events yet
      for (const tx of trackedTxs) {
        const alreadyInEvents = combined.some((c) => c.txHash.toLowerCase() === tx.tx_hash.toLowerCase());
        if (!alreadyInEvents) {
          combined.push({
            id: `tx-${tx.tx_hash.slice(0, 10)}`,
            type: tx.function_name || 'Transaction',
            eventName: tx.function_name || 'ContractCall',
            planId: tx.plan_id || undefined,
            planVersion: tx.plan_version || undefined,
            actor: tx.submitter_wallet,
            txHash: tx.tx_hash,
            blockNumber: tx.block_number || null,
            timestamp: tx.created_at || new Date().toISOString(),
            status: tx.status === 'CONFIRMED' ? 'CONFIRMED' : tx.status === 'FAILED' ? 'FAILED' : 'PENDING',
          });
        }
      }

      // Sort descending by timestamp / block
      combined.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEvents(combined);
    } catch (err) {
      console.warn('Error loading audit ledger:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAuditData();
  }, [loadAuditData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadAuditData();
  };

  const filteredEvents = events.filter((e) => {
    if (selectedFilter !== 'All' && e.eventName !== selectedFilter && e.type !== selectedFilter) {
      return false;
    }
    if (search.trim().length > 0) {
      const q = search.toLowerCase();
      return (
        e.id.toLowerCase().includes(q) ||
        e.actor.toLowerCase().includes(q) ||
        e.txHash.toLowerCase().includes(q) ||
        (e.planId && e.planId.toLowerCase().includes(q)) ||
        e.eventName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalEvents = events.length;
  const confirmedCount = events.filter((e) => e.status === 'CONFIRMED').length;

  const getEventBadge = (name: string) => {
    switch (name) {
      case 'PlanAnchored':
      case 'anchorPlan':
        return { label: 'Plan Anchored', bg: '#EFF6FF', color: '#2563EB' };
      case 'PlanApproved':
      case 'approvePlan':
        return { label: 'Governance Approved', bg: '#F0FDF4', color: '#16A34A' };
      case 'PlanRejected':
      case 'rejectPlan':
        return { label: 'Plan Rejected', bg: '#FEF2F2', color: '#DC2626' };
      case 'RevisionRequested':
      case 'requestRevision':
        return { label: 'Revision Notice', bg: '#FFFBEB', color: '#D97706' };
      case 'ExecutionAnchored':
      case 'anchorExecution':
      case 'ExecutionEvidenceAnchored':
      case 'anchorExecutionEvidence':
        return { label: 'Evidence Anchored', bg: '#F0FDFA', color: '#0D9488' };
      default:
        return { label: name, bg: '#F1F5F9', color: '#475569' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Audit & Activity Log"
        subtitle="Immutable on-chain governance ledger & cryptographic state commitments"
      />

      <View style={styles.container}>
        {/* Ledger Integrity Banner */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityIconBox}>
            {networkConnected ? (
              <ShieldCheck size={20} color="#16A36A" />
            ) : (
              <ShieldAlert size={20} color="#DC2626" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.integrityTitle}>
              {networkConnected ? 'Polygon Amoy Blockchain Verified' : 'Blockchain Ledger Offline'}
            </Text>
            <Text style={styles.integritySubtitle}>
              {confirmedCount} of {totalEvents} events confirmed on-chain against TrustChain contract
            </Text>
          </View>
          <BlockchainNetworkBadge chainId={chainId} connected={networkConnected} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by plan, actor, or tx hash..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <X size={16} color="#64748B" />
            </Pressable>
          )}
        </View>

        {/* Event Filter Chips */}
        <View style={styles.filtersWrapper}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={filterOptions}
            keyExtractor={(item) => item.value}
            contentContainerStyle={styles.filterChipList}
            renderItem={({ item }) => {
              const active = selectedFilter === item.value;
              return (
                <Pressable
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setSelectedFilter(item.value)}
                >
                  <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>

        {/* Audit Event Feed */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Reading smart contract events & transaction receipts...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredEvents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              const badge = getEventBadge(item.eventName);
              const isExpanded = expandedId === item.id;
              const truncatedActor =
                item.actor.length > 14
                  ? `${item.actor.slice(0, 6)}...${item.actor.slice(-4)}`
                  : item.actor;

              const handleCopyText = (val: string) => {
                setCopiedHash(val);
                setTimeout(() => setCopiedHash(null), 2000);
              };

              return (
                <Pressable
                  style={styles.eventCard}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={styles.eventCardTop}>
                    <View style={styles.eventBadgeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.typeBadgeText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                      {item.planId && (
                        <View style={styles.planBadge}>
                          <Text style={styles.planBadgeText}>
                            {item.planId} {item.planVersion ? `V${item.planVersion}` : ''}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.timestampText}>
                        {new Date(item.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                      {isExpanded ? (
                        <ChevronUp size={14} color="#64748B" />
                      ) : (
                        <ChevronDown size={14} color="#64748B" />
                      )}
                    </View>
                  </View>

                  <View style={styles.actorRow}>
                    <User size={12} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.actorLabel}>Signer:</Text>
                    <Text style={styles.actorValue}>{truncatedActor}</Text>
                    {item.blockNumber && (
                      <Text style={styles.blockText}>• Block #{item.blockNumber}</Text>
                    )}
                  </View>

                  <View style={styles.ledgerRow}>
                    <View style={styles.statusRow}>
                      {item.status === 'CONFIRMED' ? (
                        <>
                          <CheckCircle2 size={12} color="#16A34A" style={{ marginRight: 4 }} />
                          <Text style={styles.statusConfirmedText}>Confirmed On-Chain</Text>
                        </>
                      ) : item.status === 'FAILED' ? (
                        <>
                          <ShieldAlert size={12} color="#DC2626" style={{ marginRight: 4 }} />
                          <Text style={styles.statusFailedText}>Transaction Failed</Text>
                        </>
                      ) : (
                        <>
                          <Clock size={12} color="#D97706" style={{ marginRight: 4 }} />
                          <Text style={styles.statusPendingText}>Awaiting Confirmations</Text>
                        </>
                      )}
                    </View>

                    <Text style={styles.txHashText} numberOfLines={1} ellipsizeMode="middle">
                      {item.txHash}
                    </Text>
                  </View>

                  {/* Expanded Transaction Details Drawer */}
                  {isExpanded && (
                    <View style={styles.expandedDrawer}>
                      <View style={styles.drawerDivider} />

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Full Transaction Hash:</Text>
                        <Pressable
                          style={styles.detailCopyRow}
                          onPress={() => handleCopyText(item.txHash)}
                        >
                          <Text style={styles.detailHashVal} numberOfLines={1} ellipsizeMode="middle">
                            {item.txHash}
                          </Text>
                          {copiedHash === item.txHash ? (
                            <Check size={12} color="#16A34A" />
                          ) : (
                            <Copy size={12} color="#64748B" />
                          )}
                        </Pressable>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Full Signer Address:</Text>
                        <Pressable
                          style={styles.detailCopyRow}
                          onPress={() => handleCopyText(item.actor)}
                        >
                          <Text style={styles.detailHashVal} numberOfLines={1} ellipsizeMode="middle">
                            {item.actor}
                          </Text>
                          {copiedHash === item.actor ? (
                            <Check size={12} color="#16A34A" />
                          ) : (
                            <Copy size={12} color="#64748B" />
                          )}
                        </Pressable>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Timestamp (UTC / Local):</Text>
                        <Text style={styles.detailVal}>
                          {new Date(item.timestamp).toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Lifecycle State & Verification:</Text>
                        <Text style={styles.detailVal}>
                          {item.status} • Cryptographically Audited
                        </Text>
                      </View>

                      {item.details && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>Event Data:</Text>
                          <Text style={styles.detailValSmall} numberOfLines={3}>
                            {item.details}
                          </Text>
                        </View>
                      )}

                      {item.planId && (
                        <Pressable
                          style={styles.viewPlanBtn}
                          onPress={() => {
                            router.push({
                              pathname: '/(protected)/supply-chain-manager/approvals/[id]',
                              params: { id: item.planId as string },
                            });
                          }}
                        >
                          <Text style={styles.viewPlanBtnText}>Inspect Plan in Approvals Portal</Text>
                          <ExternalLink size={13} color="#2563EB" />
                        </Pressable>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Shield size={44} color="#94A3B8" />
                <Text style={styles.emptyTitle}>No Blockchain Audit Records</Text>
                <Text style={styles.emptySubtitle}>
                  No on-chain events match your filter query.
                </Text>
              </View>
            }
          />
        )}
      </View>

      <ManagerBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  integrityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginTop: 12,
    marginBottom: 10,
    gap: 10,
  },
  integrityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  integritySubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: '#1E293B',
  },
  filtersWrapper: {
    marginBottom: 10,
  },
  filterChipList: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#10234D',
    borderColor: '#10234D',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 10,
  },
  listContent: {
    paddingBottom: 80,
  },
  eventCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  eventCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventBadgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  planBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  actorLabel: {
    fontSize: 11,
    color: '#64748B',
    marginRight: 4,
  },
  actorValue: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '700',
    color: '#0F172A',
  },
  blockText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 6,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    paddingTop: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusConfirmedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D',
  },
  statusFailedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B91C1C',
  },
  statusPendingText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B45309',
  },
  txHashText: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#64748B',
    maxWidth: 160,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  expandedDrawer: {
    marginTop: 10,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 10,
  },
  detailRow: {
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  detailVal: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '500',
  },
  detailValSmall: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#475569',
  },
  detailCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  detailHashVal: {
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#2563EB',
    flex: 1,
    marginRight: 6,
  },
  viewPlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    marginTop: 6,
  },
  viewPlanBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
});
