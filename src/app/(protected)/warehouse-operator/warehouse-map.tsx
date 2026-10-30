import { useRouter } from 'expo-router';
import {
  Boxes,
  Compass,
  Layers,
  MapPin,
  Maximize2,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseFloorMap } from '../../../features/warehouse-operator/components/WarehouseFloorMap';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { WarehouseLocation } from '../../../features/warehouse-operator/types';

export default function WarehouseMapScreen() {
  const router = useRouter();
  const locations = warehouseService.getWarehouseLocations();
  const [selectedLoc, setSelectedLoc] = useState<WarehouseLocation | undefined>(
    locations[0]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Warehouse Floor Map"
        subtitle="Mumbai Central Hub (WH-MUM) · 2D Spatial Depository Layout"
      />

      <View style={styles.container}>
        {/* Top Indoor Telemetry Strip */}
        <View style={styles.telemetryBar}>
          <View style={styles.telemetryDot} />
          <Text style={styles.telemetryText}>
            WH-MUM Layout · 5 Main Aisles · 82% Capacity · Active Bays: 01, 02, Q1
          </Text>
        </View>

        {/* 2D Interactive Floor Map */}
        <View style={styles.mapContainer}>
          <WarehouseFloorMap
            locations={locations}
            selectedLocationId={selectedLoc?.id}
            onSelectLocation={(loc) => setSelectedLoc(loc)}
          />
        </View>
      </View>

      <WarehouseBottomNav />
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
  },
  telemetryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 35, 77, 0.94)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
  },
  telemetryDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  telemetryText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  mapContainer: {
    flex: 1,
  },
});
