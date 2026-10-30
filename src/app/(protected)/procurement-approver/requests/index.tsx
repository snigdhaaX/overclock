import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { FileText, Filter, Search, X } from 'lucide-react-native';
import {
  ProcurementRequest,
  RequestPriority,
  RequestStatus,
} from '../../../../features/procurement-approver/types';
import { procurementService } from '../../../../features/procurement-approver/services/procurementService';
import ProcurementHeader from '../../../../features/procurement-approver/components/ProcurementHeader';
import ProcurementBottomNav from '../../../../features/procurement-approver/components/ProcurementBottomNav';
import ProcurementRequestCard from '../../../../features/procurement-approver/components/ProcurementRequestCard';

export default function ProcurementRequestsScreen() {
  const [selectedStatus, setSelectedStatus] = useState<RequestStatus | 'all'>('all');
  const [selectedPriority, setSelectedPriority] = useState<RequestPriority | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setDataVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const requests = procurementService.getRequests(selectedStatus, selectedPriority, searchQuery);

  const onRefresh = () => {
    setRefreshing(true);
    setDataVersion((v) => v + 1);
    setTimeout(() => setRefreshing(false), 400);
  };

  const allReqs = procurementService.getRequests();
  const pendingCount = allReqs.filter((r) => r.status === 'pending').length;
  const approvedCount = allReqs.filter((r) => r.status === 'approved').length;
  const rejectedCount = allReqs.filter((r) => r.status === 'rejected').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Procurement Requests"
        subtitle="Review, Evaluate & Decide on Sourcing Submissions"
      />

      <View style={styles.filterContainer}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by ID, SKU, product, supplier..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')} hitSlop={6}>
              <X size={16} color="#64748B" />
            </Pressable>
          )}
        </View>

        {/* Status Horizontal Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusTabs}
        >
          <Pressable
            style={[styles.tabBtn, selectedStatus === 'all' && styles.tabBtnActive]}
            onPress={() => setSelectedStatus('all')}
          >
            <Text style={[styles.tabText, selectedStatus === 'all' && styles.tabTextActive]}>
              All ({allReqs.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, selectedStatus === 'pending' && styles.tabBtnActive]}
            onPress={() => setSelectedStatus('pending')}
          >
            <Text style={[styles.tabText, selectedStatus === 'pending' && styles.tabTextActive]}>
              Pending ({pendingCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, selectedStatus === 'approved' && styles.tabBtnActive]}
            onPress={() => setSelectedStatus('approved')}
          >
            <Text style={[styles.tabText, selectedStatus === 'approved' && styles.tabTextActive]}>
              Approved ({approvedCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabBtn, selectedStatus === 'rejected' && styles.tabBtnActive]}
            onPress={() => setSelectedStatus('rejected')}
          >
            <Text style={[styles.tabText, selectedStatus === 'rejected' && styles.tabTextActive]}>
              Rejected ({rejectedCount})
            </Text>
          </Pressable>
        </ScrollView>

        {/* Priority Filter Row */}
        <View style={styles.priorityRow}>
          <View style={styles.priorityLabelRow}>
            <Filter size={12} color="#64748B" />
            <Text style={styles.priorityLabel}>Priority:</Text>
          </View>
          {(['all', 'Urgent', 'High', 'Medium', 'Low'] as const).map((p) => (
            <Pressable
              key={p}
              style={[styles.priorityChip, selectedPriority === p && styles.priorityChipActive]}
              onPress={() => setSelectedPriority(p)}
            >
              <Text
                style={[
                  styles.priorityChipText,
                  selectedPriority === p && styles.priorityChipTextActive,
                ]}
              >
                {p === 'all' ? 'All' : p}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Requests List */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {requests.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching procurement requests</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your status filter, priority selection, or search keywords.
            </Text>
          </View>
        ) : (
          requests.map((req) => (
            <ProcurementRequestCard
              key={req.id}
              request={req}
              onPress={() =>
                router.push(`/(protected)/procurement-approver/requests/${req.id}` as any)
              }
            />
          ))
        )}

        <View style={{ height: 100 }} />
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
  filterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#10234D',
  },
  statusTabs: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabBtnActive: {
    backgroundColor: '#8B5CF6',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 4,
  },
  priorityLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: 4,
  },
  priorityLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  priorityChipActive: {
    backgroundColor: '#FAF5FF',
    borderColor: '#8B5CF6',
  },
  priorityChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  priorityChipTextActive: {
    color: '#8B5CF6',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },
});
