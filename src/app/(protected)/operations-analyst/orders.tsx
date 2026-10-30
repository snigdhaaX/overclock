import { useRouter } from 'expo-router';
import { ArrowUpDown } from 'lucide-react-native';
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
import EmptyState from '../../../features/operations-analyst/components/EmptyState';
import FilterChips from '../../../features/operations-analyst/components/FilterChips';
import OperationsBottomNav from '../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../features/operations-analyst/components/OperationsHeader';
import OrderCard from '../../../features/operations-analyst/components/OrderCard';
import SearchBar from '../../../features/operations-analyst/components/SearchBar';
import operationsService from '../../../features/operations-analyst/services/operationsService';

export default function AffectedOrdersScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('All');
  const [refreshing, setRefreshing] = useState(false);

  const severityOptions = [
    { key: 'All', label: 'All Orders' },
    { key: 'Critical', label: 'Critical' },
    { key: 'High', label: 'High Risk' },
    { key: 'Medium', label: 'Medium Risk' },
  ];

  const orders = operationsService.getOrders({
    search,
    severity: selectedSeverity,
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
        title="Affected Orders"
        subtitle="Downstream commercial customer delivery commitments"
      />

      {/* Search Toolbar */}
      <View style={styles.searchBarContainer}>
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search by Order ID, customer, SKU..."
        />
      </View>

      {/* Filter Chips */}
      <FilterChips
        options={severityOptions}
        selectedKey={selectedSeverity}
        onSelect={setSelectedSeverity}
      />

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2563EB']} />
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() =>
              router.push(`/(protected)/operations-analyst/disruptions/${item.associatedDisruptionId}`)
            }
          />
        )}
        ListEmptyComponent={
          <EmptyState
            title="No orders found"
            description="No customer deliveries match your current search and severity filters."
            actionLabel="Reset Search"
            onAction={() => {
              setSearch('');
              setSelectedSeverity('All');
            }}
          />
        }
      />

      <OperationsBottomNav activeTab="orders" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  searchBarContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 110,
  },
});
