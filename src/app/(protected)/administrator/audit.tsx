import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
  Search,
  Server,
  Shield,
  X,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import SystemHealthCard from '../../../features/administrator/components/SystemHealthCard';
import adminService from '../../../features/administrator/services/adminService';
import { AuditCategory, PlatformAuditEvent, SystemHealthMetric } from '../../../features/administrator/types';

export default function PlatformAuditAndHealthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const initialTab = params.tab === 'health' ? 'health' : 'audit';
  const [tabOverride, setTabOverride] = useState<'audit' | 'health' | null>(null);
  const activeTab = tabOverride ?? initialTab;
  const setActiveTab = (tab: 'audit' | 'health') => setTabOverride(tab);

  const [auditLogs, setAuditLogs] = useState<PlatformAuditEvent[]>(adminService.getAuditLogs());
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetric[]>(
    adminService.getHealthMetrics()
  );
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setAuditLogs(adminService.getAuditLogs());
      setHealthMetrics(adminService.getHealthMetrics());
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setAuditLogs(adminService.getAuditLogs());
    adminService.refreshHealthDiagnostics();
    setHealthMetrics(adminService.getHealthMetrics());
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleRefreshDiagnostics = () => {
    adminService.refreshHealthDiagnostics();
    setHealthMetrics(adminService.getHealthMetrics());
  };

  const categories: AuditCategory[] = [
    'All',
    'User Actions',
    'Role Changes',
    'Approvals',
    'Inventory Movements',
    'Integration Events',
    'Policy Changes',
    'Administrative',
  ];

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actor.toLowerCase().includes(search.toLowerCase()) ||
      log.resource.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === 'All' || log.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Audit & System Health"
        subtitle="Platform Governance Logs & Real-Time Monitoring"
        rightAction={
          activeTab === 'health' ? (
            <Pressable
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.btnPressed]}
              onPress={handleRefreshDiagnostics}
            >
              <RefreshCw size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.refreshBtnText}>Probe</Text>
            </Pressable>
          ) : undefined
        }
      />

      {/* Tabs Header */}
      <View style={styles.tabNavRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'audit' && styles.tabBtnActive]}
          onPress={() => setActiveTab('audit')}
        >
          <Shield size={16} color={activeTab === 'audit' ? '#10234D' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'audit' && styles.tabBtnTextActive]}>
            Audit Trail ({auditLogs.length})
          </Text>
        </Pressable>

        <Pressable
          style={[styles.tabBtn, activeTab === 'health' && styles.tabBtnActive]}
          onPress={() => setActiveTab('health')}
        >
          <Activity size={16} color={activeTab === 'health' ? '#10234D' : '#64748B'} />
          <Text style={[styles.tabBtnText, activeTab === 'health' && styles.tabBtnTextActive]}>
            System Health ({healthMetrics.length})
          </Text>
        </Pressable>
      </View>

      {activeTab === 'audit' ? (
        <>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBox}>
              <Search size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search events by actor, action, resource or hash..."
                placeholderTextColor="#94A3B8"
                value={search}
                onChangeText={setSearch}
              />
              {search ? (
                <Pressable onPress={() => setSearch('')} hitSlop={8}>
                  <X size={16} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>
          </View>

          {/* Filter Categories */}
          <View style={styles.categoriesContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryChipsContent}
            >
              {categories.map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.catChip, isSelected && styles.catChipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                      {cat}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Audit Logs List */}
          <FlatList
            data={filteredLogs}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            renderItem={({ item }) => {
              const isExpanded = expandedId === item.id;
              return (
                <Pressable
                  style={[styles.logCard, isExpanded && styles.logCardExpanded]}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                >
                  <View style={styles.logTopRow}>
                    <View style={styles.logActorInfo}>
                      <Text style={styles.logActor}>{item.actor}</Text>
                      <View style={styles.logRoleBadge}>
                        <Text style={styles.logRoleText}>{item.actorRole}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.resultBadge,
                        item.result === 'Success'
                          ? styles.resultSuccess
                          : item.result === 'Warning'
                          ? styles.resultWarning
                          : styles.resultFailed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultText,
                          item.result === 'Success'
                            ? styles.resultSuccessText
                            : item.result === 'Warning'
                            ? styles.resultWarningText
                            : styles.resultFailedText,
                        ]}
                      >
                        {item.result}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.logAction}>{item.action}</Text>

                  <View style={styles.resourceRow}>
                    <Text style={styles.resourceLabel}>Resource:</Text>
                    <Text style={styles.resourceValue}>{item.resource}</Text>
                  </View>

                  <Text style={styles.logDetails} numberOfLines={isExpanded ? undefined : 2}>
                    {item.details}
                  </Text>

                  {/* Hash / Proof if available */}
                  {item.txHash && (
                    <View style={styles.hashBox}>
                      <Text style={styles.hashLabel}>Tx Proof:</Text>
                      <Text style={styles.hashValue}>{item.txHash}</Text>
                    </View>
                  )}

                  <View style={styles.logFooterRow}>
                    <View style={styles.timestampRow}>
                      <Clock size={11} color="#94A3B8" style={{ marginRight: 4 }} />
                      <Text style={styles.timestampText}>
                        {new Date(item.timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>

                    <Text style={styles.categoryLabel}>{item.category}</Text>
                  </View>
                </Pressable>
              );
            }}
          />
        </>
      ) : (
        /* System Health Tab */
        <ScrollView
          style={styles.healthScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Health Summary Banner */}
          <View style={styles.healthBanner}>
            <View style={styles.healthBannerTop}>
              <View style={styles.healthStatusDot} />
              <Text style={styles.healthBannerTitle}>Operational Infrastructure</Text>
            </View>
            <Text style={styles.healthBannerSub}>
              Diagnostic probe across 6 platform components. Metrics marked as simulated reflect client-side runtime behavior.
            </Text>
          </View>

          {healthMetrics.map((metric) => (
            <SystemHealthCard key={metric.serviceId} metric={metric} />
          ))}
        </ScrollView>
      )}

      <AdminBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  tabNavRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginRight: 8,
  },
  tabBtnActive: {
    borderBottomColor: '#10234D',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabBtnTextActive: {
    color: '#10234D',
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    height: 42,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  categoriesContainer: {
    paddingVertical: 6,
  },
  categoryChipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: {
    backgroundColor: '#475569',
    borderColor: '#475569',
  },
  catChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  catChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  logCardExpanded: {
    borderColor: '#94A3B8',
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logActorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logActor: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  logRoleBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logRoleText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  resultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  resultSuccess: {
    backgroundColor: '#DCFCE7',
  },
  resultSuccessText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  resultWarning: {
    backgroundColor: '#FEF3C7',
  },
  resultWarningText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  resultFailed: {
    backgroundColor: '#FEE2E2',
  },
  resultFailedText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '700',
  },
  resultText: {
    fontSize: 10,
    fontWeight: '700',
  },
  logAction: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  resourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  resourceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
  resourceValue: {
    fontSize: 11,
    color: '#475569',
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  logDetails: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 8,
  },
  hashBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  hashLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
    marginRight: 4,
  },
  hashValue: {
    fontSize: 10,
    fontFamily: 'monospace',
    color: '#2563EB',
    flex: 1,
  },
  logFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timestampText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textTransform: 'uppercase',
  },
  healthScroll: {
    flex: 1,
  },
  healthBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  healthBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  healthStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  healthBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  healthBannerSub: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});
