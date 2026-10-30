import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpDown,
  Building,
  Calendar,
  Clock,
  DollarSign,
  Filter,
  Layers,
  MapPin,
  Package,
  Search,
  Truck,
  User,
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
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { Disruption, SeverityLevel } from '@/features/supply-chain-manager/types';

export default function DisruptionCommandScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const disruptions = managerService.getDisruptions({
    search,
    filterChip: selectedType,
    severity: selectedSeverity !== 'All' ? (selectedSeverity as SeverityLevel) : undefined,
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500);
  };

  const typeOptions = ['All', 'Shipment', 'Supplier', 'Inventory'];
  const severityOptions = ['All', 'Critical', 'High', 'Medium'];

  const getFinancialExposure = (id: string) => {
    if (id === 'SHP-101') return '$211,200';
    if (id === 'WH-MUM') return '$83,250';
    if (id === 'SUP-08') return '$112,000';
    return '$45,000';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Disruptions Command"
        subtitle="Network disruption detection, SLA exposure & analyst investigations"
      />

      {/* Top Exposure Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryVal}>{disruptions.length}</Text>
          <Text style={styles.summaryLabel}>Active Incidents</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryVal, { color: '#DC2626' }]}>2</Text>
          <Text style={styles.summaryLabel}>Critical Level</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={[styles.summaryVal, { color: '#D97706' }]}>$451,450</Text>
          <Text style={styles.summaryLabel}>Total Exposure</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search incident ID, supplier, port, carrier..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={6}>
              <X size={16} color="#64748B" />
            </Pressable>
          )}
        </View>

        {/* Type Filter Chips */}
        <View style={styles.chipsRow}>
          {typeOptions.map((type) => (
            <Pressable
              key={type}
              style={[
                styles.chip,
                selectedType === type && styles.chipActive,
              ]}
              onPress={() => setSelectedType(type)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedType === type && styles.chipTextActive,
                ]}
              >
                {type}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Disruptions List */}
      <FlatList
        data={disruptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#0D9488']} />
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.disruptionCard}
            onPress={() =>
              router.push(`/(protected)/supply-chain-manager/disruptions/${item.id}` as any)
            }
          >
            <View style={styles.cardHeader}>
              <View style={styles.idGroup}>
                <Text style={styles.disruptionId}>{item.id}</Text>
                <SeverityBadge severity={item.severity} size="sm" />
              </View>
              <Text style={styles.delayText}>{item.estimatedDelay} Delay</Text>
            </View>

            <Text style={styles.disruptionTitle}>{item.title}</Text>
            <Text style={styles.referenceText}>{item.reference} • {item.supplier}</Text>

            <View style={styles.locationRow}>
              <MapPin size={12} color="#64748B" style={{ marginRight: 4 }} />
              <Text style={styles.locationText}>{item.location}</Text>
            </View>

            {/* Financial & Operational Impact Summary */}
            <View style={styles.impactGrid}>
              <View style={styles.impactCell}>
                <Text style={styles.impactLabel}>Revenue Exposure</Text>
                <Text style={[styles.impactVal, { color: '#DC2626' }]}>
                  {getFinancialExposure(item.id)}
                </Text>
              </View>

              <View style={styles.impactCell}>
                <Text style={styles.impactLabel}>Orders Impacted</Text>
                <Text style={styles.impactVal}>{item.affectedOrdersCount} Orders</Text>
              </View>

              <View style={styles.impactCell}>
                <Text style={styles.impactLabel}>Assigned Analyst</Text>
                <Text style={[styles.impactVal, { color: '#0D9488' }]}>Anishwath</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.detailBtn}
                onPress={() =>
                  router.push(`/(protected)/supply-chain-manager/disruptions/${item.id}` as any)
                }
              >
                <Text style={styles.detailBtnText}>View Details</Text>
              </Pressable>

              <Pressable
                style={styles.impactBtn}
                onPress={() =>
                  router.push('/(protected)/supply-chain-manager/impact' as any)
                }
              >
                <Text style={styles.impactBtnText}>View Impact</Text>
              </Pressable>

              <Pressable
                style={styles.recoveryBtn}
                onPress={() =>
                  router.push('/(protected)/supply-chain-manager/approvals' as any)
                }
              >
                <Text style={styles.recoveryBtnText}>Recovery</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      <ManagerBottomNav activeTab="disruptions" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryCell: {
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 38,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  chipActive: {
    backgroundColor: '#10234D',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
  disruptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  idGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  disruptionId: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  delayText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#DC2626',
  },
  disruptionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 3,
  },
  referenceText: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
  },
  impactGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  impactCell: {
    flex: 1,
    alignItems: 'center',
  },
  impactLabel: {
    fontSize: 9,
    color: '#64748B',
    textTransform: 'uppercase',
    fontWeight: '600',
    marginBottom: 2,
  },
  impactVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  detailBtn: {
    flex: 1.2,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  detailBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10234D',
  },
  impactBtn: {
    flex: 1.2,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  impactBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  recoveryBtn: {
    flex: 1,
    backgroundColor: '#F0FDFA',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CCFBF1',
  },
  recoveryBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
});
