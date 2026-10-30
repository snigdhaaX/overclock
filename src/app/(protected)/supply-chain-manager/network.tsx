import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Compass,
  Filter,
  Globe2,
  Layers,
  MapPin,
  Maximize2,
  Package,
  Route,
  Search,
  Truck,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import StatusBadge from '@/features/operations-analyst/components/StatusBadge';
import EntityDetailSheet from '@/features/supply-chain-manager/components/EntityDetailSheet';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';
import NetworkMap from '@/features/supply-chain-manager/components/NetworkMap';
import RouteDetailSheet from '@/features/supply-chain-manager/components/RouteDetailSheet';
import managerService from '@/features/supply-chain-manager/services/managerService';
import { OrderRoute } from '@/features/supply-chain-manager/types';

export default function NetworkMapScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Delayed' | 'Critical' | 'In Transit'>('All');
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>('ORD-445');
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const [routeDrawerExpanded, setRouteDrawerExpanded] = useState(false);

  const routes = managerService.getOrderRoutes({
    search,
    status: selectedFilter === 'Delayed' ? 'Delayed' : selectedFilter === 'In Transit' ? 'In Transit' : undefined,
    riskLevel: selectedFilter === 'Critical' ? 'Critical' : undefined,
  });

  const activeSelectedRoute = selectedRouteId
    ? routes.find((r: OrderRoute) => r.orderId === selectedRouteId) || null
    : null;

  const filterOptions: Array<'All' | 'Delayed' | 'Critical' | 'In Transit'> = [
    'All',
    'Delayed',
    'Critical',
    'In Transit',
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Network Highway Map"
        subtitle="Geographical order routing & multi-corridor transit telemetry"
      />

      {/* Header Telemetry Bar */}
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryItem}>
          <Text style={styles.telemetryVal}>{routes.length}</Text>
          <Text style={styles.telemetryLabel}>Corridors</Text>
        </View>
        <View style={styles.telemetryDiv} />
        <View style={styles.telemetryItem}>
          <Text style={[styles.telemetryVal, { color: '#DC2626' }]}>1</Text>
          <Text style={styles.telemetryLabel}>Delayed</Text>
        </View>
        <View style={styles.telemetryDiv} />
        <View style={styles.telemetryItem}>
          <Text style={[styles.telemetryVal, { color: '#D97706' }]}>1</Text>
          <Text style={styles.telemetryLabel}>Critical Risk</Text>
        </View>
        <View style={styles.telemetryDiv} />
        <View style={styles.telemetryItem}>
          <Text style={[styles.telemetryVal, { color: '#0D9488' }]}>6,404 km</Text>
          <Text style={styles.telemetryLabel}>Active Transit</Text>
        </View>
      </View>

      {/* Search & Filter Toolbar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Order ID, city, customer..."
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

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          {filterOptions.map((opt) => (
            <Pressable
              key={opt}
              style={[
                styles.filterPill,
                selectedFilter === opt && styles.filterPillActive,
              ]}
              onPress={() => setSelectedFilter(opt)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedFilter === opt && styles.filterPillTextActive,
                ]}
              >
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Main Geographical Map Container */}
      <View style={styles.mapWrapper}>
        <NetworkMap
          routes={routes}
          selectedRouteId={selectedRouteId}
          onSelectRoute={(id: string) => {
            setSelectedRouteId(id);
            setSelectedEntity(null);
          }}
          onSelectMarker={(data: any) => {
            setSelectedEntity(data);
          }}
        />

        {/* Selected Route Detail Sheet (if no entity selected) */}
        {activeSelectedRoute && !selectedEntity && (
          <RouteDetailSheet
            route={activeSelectedRoute}
            onClose={() => setSelectedRouteId(null)}
          />
        )}

        {/* Selected Entity Marker Detail Sheet */}
        {selectedEntity && (
          <EntityDetailSheet
            entity={selectedEntity}
            onClose={() => setSelectedEntity(null)}
          />
        )}
      </View>

      <ManagerBottomNav activeTab="network" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  telemetryBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  telemetryItem: {
    alignItems: 'center',
  },
  telemetryVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  telemetryLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 1,
  },
  telemetryDiv: {
    width: 1,
    height: 24,
    backgroundColor: '#E2E8F0',
  },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  filterPillsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  filterPillActive: {
    backgroundColor: '#10234D',
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  mapWrapper: {
    flex: 1,
    position: 'relative',
    marginBottom: 56,
  },
});
