import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  Clock,
  Filter,
  Lock,
  Search,
  Shield,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuditEventCard } from '../../../features/supply-chain-manager/components/AuditEventCard';
import ManagerBottomNav from '../../../features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '../../../features/supply-chain-manager/components/ManagerHeader';
import managerService from '../../../features/supply-chain-manager/services/managerService';
import { AuditEvent } from '../../../features/supply-chain-manager/types';

export default function AuditActivityLogScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const filterOptions = [
    { label: 'All', value: 'All' },
    { label: 'Approvals', value: 'plan_approved' },
    { label: 'Rejections', value: 'plan_rejected' },
    { label: 'Modifications', value: 'changes_requested' },
    { label: 'Submissions', value: 'plan_submitted' },
    { label: 'Disruptions', value: 'disruption_detected' },
    { label: 'Milestones', value: 'milestone_completed' },
  ];

  const rawEvents = managerService.getAuditEvents({
    search,
    filter: selectedFilter,
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const totalEvents = rawEvents.length;
  const verifiedCount = rawEvents.filter((e) => e.verificationStatus === 'verified').length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Audit & Activity Log"
        subtitle="Immutable ledger of manager approvals, analyst submissions & incident responses"
      />

      <View style={styles.container}>
        {/* Ledger Integrity Banner */}
        <View style={styles.integrityCard}>
          <View style={styles.integrityIconBox}>
            <ShieldCheck size={20} color="#16A36A" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.integrityTitle}>Tamper-Proof Audit Trail</Text>
            <Text style={styles.integritySubtitle}>
              {verifiedCount} of {totalEvents} entries verified against SHA-256 cryptographic hashes
            </Text>
          </View>
          <View style={styles.integrityBadge}>
            <Text style={styles.integrityBadgeText}>SOC-2 Ready</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, actor, action or entity..."
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
        <FlatList
          data={rawEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => <AuditEventCard event={item} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Shield size={44} color="#94A3B8" />
              <Text style={styles.emptyTitle}>No Audit Records Found</Text>
              <Text style={styles.emptySubtitle}>
                No governance events match your query or filter parameters.
              </Text>
            </View>
          }
        />
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
    borderRadius: 12,
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
  integrityBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  integrityBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065F46',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#17243B',
    padding: 0,
  },
  filtersWrapper: {
    marginBottom: 8,
  },
  filterChipList: {
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: '#0D9488',
    borderColor: '#0D9488',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#17243B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
