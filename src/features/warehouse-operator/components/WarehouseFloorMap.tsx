import { useRouter } from 'expo-router';
import {
  Boxes,
  CheckCircle2,
  ExternalLink,
  Layers,
  MapPin,
  Search,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { OccupancyStatus, WarehouseLocation } from '../types';

interface WarehouseFloorMapProps {
  locations: WarehouseLocation[];
  selectedLocationId?: string;
  onSelectLocation?: (location: WarehouseLocation) => void;
}

export const WarehouseFloorMap: React.FC<WarehouseFloorMapProps> = ({
  locations,
  selectedLocationId,
  onSelectLocation,
}) => {
  const router = useRouter();
  const [selectedLoc, setSelectedLoc] = useState<WarehouseLocation | null>(
    locations.find((l) => l.id === selectedLocationId) || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showDetailModal, setShowDetailModal] = useState(false);

  const getStatusColor = (status: OccupancyStatus) => {
    switch (status) {
      case 'available':
        return '#16A36A'; // Green
      case 'occupied':
        return '#F59E0B'; // Amber
      case 'receiving':
        return '#2563EB'; // Blue
      case 'reserved':
        return '#8B5CF6'; // Purple
      case 'quarantine':
        return '#DC4545'; // Red
      default:
        return '#64748B';
    }
  };

  const getStatusBg = (status: OccupancyStatus) => {
    switch (status) {
      case 'available':
        return '#F0FDF4';
      case 'occupied':
        return '#FFFBEB';
      case 'receiving':
        return '#EFF6FF';
      case 'reserved':
        return '#F5F3FF';
      case 'quarantine':
        return '#FEF2F2';
      default:
        return '#F8FAFC';
    }
  };

  const filteredLocations = locations.filter((loc) => {
    if (statusFilter !== 'all' && loc.occupancyStatus !== statusFilter) {
      return false;
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchId = loc.id.toLowerCase().includes(q);
      const matchName = loc.name.toLowerCase().includes(q);
      const matchAisle = loc.aisle.toLowerCase().includes(q);
      const matchSku = loc.storedSkus.some((s) => s.toLowerCase().includes(q));
      return matchId || matchName || matchAisle || matchSku;
    }
    return true;
  });

  const handleLocationPress = (loc: WarehouseLocation) => {
    setSelectedLoc(loc);
    setShowDetailModal(true);
    if (onSelectLocation) onSelectLocation(loc);
  };

  return (
    <View style={styles.container}>
      {/* Search & Status Filters */}
      <View style={styles.searchBar}>
        <Search size={16} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search location, aisle or SKU (e.g. PRD-012, Aisle B3)"
          placeholderTextColor="#94A3B8"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <X size={16} color="#94A3B8" />
          </Pressable>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterScroll}
      >
        {[
          { id: 'all', label: 'All Bays' },
          { id: 'available', label: 'Available (Green)' },
          { id: 'occupied', label: 'Occupied (Amber)' },
          { id: 'receiving', label: 'Receiving (Blue)' },
          { id: 'reserved', label: 'Reserved (Purple)' },
          { id: 'quarantine', label: 'Quarantine (Red)' },
        ].map((f) => (
          <Pressable
            key={f.id}
            style={[styles.filterChip, statusFilter === f.id && styles.activeFilterChip]}
            onPress={() => setStatusFilter(f.id)}
          >
            <Text
              style={[
                styles.filterChipText,
                statusFilter === f.id && styles.activeFilterChipText,
              ]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Top-Down Interactive Floor Layout */}
      <View style={styles.mapCanvasContainer}>
        <View style={styles.canvasHeader}>
          <View style={styles.facilityTag}>
            <MapPin size={12} color="#16A36A" />
            <Text style={styles.facilityTagText}>WH-MUM Floor Plan · Level 1</Text>
          </View>
          <Text style={styles.canvasNote}>Tap any bay to view contents</Text>
        </View>

        <View style={styles.canvasGrid}>
          {filteredLocations.map((loc) => {
            const isHighlighted =
              selectedLoc?.id === loc.id ||
              (searchQuery.trim().length > 0 &&
                loc.storedSkus.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase())));
            const color = getStatusColor(loc.occupancyStatus);
            const bg = getStatusBg(loc.occupancyStatus);

            return (
              <Pressable
                key={loc.id}
                style={[
                  styles.locationCard,
                  {
                    backgroundColor: bg,
                    borderColor: isHighlighted ? '#10234D' : color,
                    borderWidth: isHighlighted ? 2.5 : 1.5,
                  },
                ]}
                onPress={() => handleLocationPress(loc)}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.locName, { color }]}>{loc.name}</Text>
                  <View style={[styles.statusDot, { backgroundColor: color }]} />
                </View>

                <Text style={styles.locCoords}>
                  {loc.rack} · {loc.shelf}
                </Text>

                <View style={styles.skuRow}>
                  {loc.storedSkus.slice(0, 2).map((sku, i) => (
                    <View key={i} style={styles.skuPill}>
                      <Text style={styles.skuPillText}>{sku}</Text>
                    </View>
                  ))}
                  {loc.storedSkus.length > 2 && (
                    <Text style={styles.moreSkuText}>+{loc.storedSkus.length - 2}</Text>
                  )}
                </View>

                {/* Occupancy bar */}
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${loc.occupancyPercent}%`, backgroundColor: color },
                    ]}
                  />
                </View>
                <View style={styles.cardFooter}>
                  <Text style={styles.percentText}>{loc.occupancyPercent}% full</Text>
                  <Text style={styles.unitsText}>
                    {loc.usedUnits}/{loc.capacityUnits} u
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Selected Location Bottom Sheet Modal */}
      <Modal
        visible={showDetailModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDetailModal(false)}
        >
          <View style={styles.detailSheet}>
            <View style={styles.sheetHandle} />

            {selectedLoc && (
              <>
                <View style={styles.sheetTopRow}>
                  <View>
                    <View style={styles.badgeRow}>
                      <View
                        style={[
                          styles.typeBadge,
                          { backgroundColor: getStatusBg(selectedLoc.occupancyStatus) },
                        ]}
                      >
                        <Text
                          style={[
                            styles.typeBadgeText,
                            { color: getStatusColor(selectedLoc.occupancyStatus) },
                          ]}
                        >
                          {selectedLoc.type.toUpperCase()} ·{' '}
                          {selectedLoc.occupancyStatus.toUpperCase()}
                        </Text>
                      </View>
                      <Text style={styles.locIdText}>{selectedLoc.id}</Text>
                    </View>
                    <Text style={styles.detailTitle}>{selectedLoc.name}</Text>
                    <Text style={styles.detailSubtitle}>
                      {selectedLoc.aisle !== 'DOCK' && selectedLoc.aisle !== 'OUTBOUND' && selectedLoc.aisle !== 'QUARANTINE'
                        ? `Aisle ${selectedLoc.aisle} → Rack ${selectedLoc.rack} → ${selectedLoc.shelf}`
                        : `${selectedLoc.rack} · ${selectedLoc.shelf}`}
                    </Text>
                  </View>
                  <Pressable
                    style={styles.closeBtn}
                    onPress={() => setShowDetailModal(false)}
                  >
                    <X size={18} color="#64748B" />
                  </Pressable>
                </View>

                {/* Capacity & Usage Stats */}
                <View style={styles.statsCard}>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Occupancy</Text>
                    <Text style={styles.statValue}>{selectedLoc.occupancyPercent}%</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Stored Units</Text>
                    <Text style={styles.statValue}>{selectedLoc.usedUnits} units</Text>
                  </View>
                  <View style={styles.statCol}>
                    <Text style={styles.statLabel}>Max Capacity</Text>
                    <Text style={styles.statValue}>{selectedLoc.capacityUnits} units</Text>
                  </View>
                </View>

                {/* Stored SKUs */}
                <Text style={styles.sectionHeading}>Stored SKUs in this Bay</Text>
                {selectedLoc.storedSkus.map((sku, idx) => (
                  <Pressable
                    key={idx}
                    style={styles.skuDetailCard}
                    onPress={() => {
                      setShowDetailModal(false);
                      router.push(`/(protected)/warehouse-operator/product/${sku}` as any);
                    }}
                  >
                    <View style={styles.skuCardLeft}>
                      <Boxes size={18} color="#16A36A" />
                      <View>
                        <Text style={styles.skuCardName}>{sku}</Text>
                        <Text style={styles.skuCardSub}>Tap to view inventory & batch data</Text>
                      </View>
                    </View>
                    <ExternalLink size={16} color="#64748B" />
                  </Pressable>
                ))}

                {/* Associated Tasks */}
                {selectedLoc.associatedTaskId && (
                  <View style={styles.taskAlertCard}>
                    <CheckCircle2 size={16} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskAlertTitle}>
                        Active Task in this Bay: {selectedLoc.associatedTaskId}
                      </Text>
                      <Text style={styles.taskAlertSub}>
                        Assigned to stage units for fulfillment.
                      </Text>
                    </View>
                    <Pressable
                      style={styles.taskViewBtn}
                      onPress={() => {
                        setShowDetailModal(false);
                        router.push(`/(protected)/warehouse-operator/tasks/${selectedLoc.associatedTaskId}` as any);
                      }}
                    >
                      <Text style={styles.taskViewBtnText}>Go</Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  filterScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeFilterChip: {
    backgroundColor: '#10234D',
    borderColor: '#10234D',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  activeFilterChipText: {
    color: '#FFFFFF',
  },
  mapCanvasContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  canvasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  facilityTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  facilityTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
  },
  canvasNote: {
    fontSize: 11,
    color: '#94A3B8',
  },
  canvasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  locationCard: {
    width: '48%',
    borderRadius: 12,
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locName: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locCoords: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  skuPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  skuPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10234D',
  },
  moreSkuText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  percentText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10234D',
  },
  unitsText: {
    fontSize: 10,
    color: '#64748B',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 77, 0.5)',
    justifyContent: 'flex-end',
  },
  detailSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
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
  locIdText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10234D',
  },
  detailSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 8,
  },
  skuDetailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  skuCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skuCardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  skuCardSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  taskAlertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    padding: 10,
    gap: 8,
    marginTop: 6,
  },
  taskAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E40AF',
  },
  taskAlertSub: {
    fontSize: 11,
    color: '#3B82F6',
  },
  taskViewBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  taskViewBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

export default WarehouseFloorMap;
