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
import {
  ArrowRightLeft,
  Building,
  Search,
  X,
} from 'lucide-react-native';
import {
  SupplierProfile,
  SupplierQualification,
} from '../../../../features/procurement-approver/types';
import { procurementService } from '../../../../features/procurement-approver/services/procurementService';
import ProcurementHeader from '../../../../features/procurement-approver/components/ProcurementHeader';
import ProcurementBottomNav from '../../../../features/procurement-approver/components/ProcurementBottomNav';
import SupplierCard from '../../../../features/procurement-approver/components/SupplierCard';

export default function SuppliersListScreen() {
  const [filter, setFilter] = useState<SupplierQualification | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [, setDataVersion] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const suppliers = procurementService.getSuppliers(filter, searchQuery);

  const onRefresh = () => {
    setRefreshing(true);
    setDataVersion((v) => v + 1);
    setTimeout(() => setRefreshing(false), 400);
  };

  const allSuppliers = procurementService.getSuppliers();
  const approvedCount = allSuppliers.filter((s) => s.qualificationStatus === 'approved').length;
  const atRiskCount = allSuppliers.filter((s) => s.qualificationStatus === 'at_risk').length;
  const pendingCount = allSuppliers.filter((s) => s.qualificationStatus === 'pending_qualification').length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Suppliers &amp; Performance"
        subtitle="Tier-1 Vendor Qualification Roster &amp; Delivery Telemetry"
        rightAction={
          <Pressable
            style={styles.compareHeaderBtn}
            onPress={() => router.push('/(protected)/procurement-approver/suppliers/compare')}
            hitSlop={6}
          >
            <ArrowRightLeft size={16} color="#8B5CF6" />
            <Text style={styles.compareHeaderText}>Compare</Text>
          </Pressable>
        }
      />

      <View style={styles.filterSection}>
        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search supplier, location, category, SKU..."
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

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          <Pressable
            style={[styles.tabChip, filter === 'all' && styles.tabChipActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.tabChipText, filter === 'all' && styles.tabChipTextActive]}>
              All ({allSuppliers.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabChip, filter === 'approved' && styles.tabChipActive]}
            onPress={() => setFilter('approved')}
          >
            <Text style={[styles.tabChipText, filter === 'approved' && styles.tabChipTextActive]}>
              Approved ({approvedCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabChip, filter === 'at_risk' && styles.tabChipActive]}
            onPress={() => setFilter('at_risk')}
          >
            <Text style={[styles.tabChipText, filter === 'at_risk' && styles.tabChipTextActive]}>
              At Risk ({atRiskCount})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabChip, filter === 'pending_qualification' && styles.tabChipActive]}
            onPress={() => setFilter('pending_qualification')}
          >
            <Text
              style={[
                styles.tabChipText,
                filter === 'pending_qualification' && styles.tabChipTextActive,
              ]}
            >
              Pending ({pendingCount})
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#8B5CF6']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {suppliers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Building size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No matching suppliers</Text>
            <Text style={styles.emptySubtitle}>
              Try adjusting your qualification filter or search terms.
            </Text>
          </View>
        ) : (
          suppliers.map((supp) => (
            <SupplierCard
              key={supp.id}
              supplier={supp}
              onPress={() =>
                router.push(`/(protected)/procurement-approver/suppliers/${supp.id}` as any)
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
  compareHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5FF',
    borderWidth: 1,
    borderColor: '#E9D5FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  compareHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  filterSection: {
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
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  tabChipActive: {
    backgroundColor: '#8B5CF6',
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabChipTextActive: {
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
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
