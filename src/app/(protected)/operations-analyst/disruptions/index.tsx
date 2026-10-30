import { useRouter } from 'expo-router';
import { ArrowUpDown, Filter, SlidersHorizontal } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DisruptionCard from '../../../../features/operations-analyst/components/DisruptionCard';
import EmptyState from '../../../../features/operations-analyst/components/EmptyState';
import FilterChips from '../../../../features/operations-analyst/components/FilterChips';
import OperationsBottomNav from '../../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import SearchBar from '../../../../features/operations-analyst/components/SearchBar';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { SeverityLevel } from '../../../../features/operations-analyst/types';

export default function DisruptionsListScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedTypeChip, setSelectedTypeChip] = useState('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'severity' | 'delay'>('severity');
  const [refreshing, setRefreshing] = useState(false);

  const typeOptions = [
    { key: 'All', label: 'All Incidents' },
    { key: 'Shipment', label: 'Shipments' },
    { key: 'Supplier', label: 'Suppliers' },
    { key: 'Inventory', label: 'Warehouses' },
  ];

  const severityOptions = [
    { key: 'All', label: 'All Severities' },
    { key: 'Critical', label: 'Critical' },
    { key: 'High', label: 'High' },
    { key: 'Medium', label: 'Medium' },
  ];

  const disruptions = operationsService.getDisruptions({
    search,
    filterChip: selectedTypeChip,
    severity: selectedSeverity !== 'All' ? (selectedSeverity as SeverityLevel) : undefined,
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 500);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Disruptions"
        subtitle="Monitor, investigate & resolve supply chain bottlenecks"
      />

      {/* Search and Sort Toolbar */}
      <View style={styles.toolbarContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by ID, supplier, route, carrier..."
          style={{ flex: 1 }}
        />

        <Pressable
          onPress={() => setSortOrder(sortOrder === 'severity' ? 'delay' : 'severity')}
          style={styles.sortBtn}
        >
          <ArrowUpDown size={16} color="#2563EB" />
        </Pressable>
      </View>

      {/* Filter Chips Row 1: Types */}
      <FilterChips
        options={typeOptions}
        selectedKey={selectedTypeChip}
        onSelect={setSelectedTypeChip}
      />

      {/* Filter Chips Row 2: Severities */}
      <FilterChips
        options={severityOptions}
        selectedKey={selectedSeverity}
        onSelect={setSelectedSeverity}
      />

      {/* Incidents List */}
      <FlatList
        data={disruptions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
        renderItem={({ item }) => (
          <DisruptionCard
            disruption={item}
            onPress={() =>
              router.push(`/(protected)/operations-analyst/disruptions/${item.id}`)
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No disruptions match your filters"
            description="Try modifying search keywords or clearing active filters to view all operational disruptions."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearch('');
              setSelectedTypeChip('All');
              setSelectedSeverity('All');
            }}
          />
        }
      />

      <OperationsBottomNav activeTab="disruptions" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  toolbarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
  },
  sortBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
});
