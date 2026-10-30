import {
  Compass,
  Factory,
  Layers,
  MapPin,
  Maximize2,
  Navigation,
  Package,
  RotateCcw,
  Truck,
  Warehouse,
  ZoomIn,
  ZoomOut,
} from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, Polyline, UrlTile } from 'react-native-maps';
import { OrderRoute, RouteStop } from '../types';

interface NetworkMapProps {
  routes: OrderRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onSelectMarker: (markerData: {
    type: 'supplier' | 'warehouse' | 'distribution' | 'customer' | 'shipment';
    title: string;
    location: string;
    coordinate: { latitude: number; longitude: number };
    details?: any;
  }) => void;
  filterMode?: 'all' | 'critical' | 'delayed' | 'in_transit';
}

// Google Maps crashes natively on Android when it has no API key, so check before rendering it.
const MAP_AVAILABLE = Platform.OS !== 'android' || Boolean((Constants.expoConfig?.android as any)?.config?.googleMaps?.apiKey);

const INITIAL_REGION = {
  latitude: 21.0,
  longitude: 78.5,
  latitudeDelta: 16.0,
  longitudeDelta: 16.0,
};

export const NetworkMap: React.FC<NetworkMapProps> = ({
  routes,
  selectedRouteId,
  onSelectRoute,
  onSelectMarker,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');

  const fitAllRoutes = () => {
    if (!mapRef.current) return;
    const allCoords: { latitude: number; longitude: number }[] = [];
    routes.forEach((r) => {
      r.stops.forEach((s) => allCoords.push(s.coordinate));
    });

    if (allCoords.length > 0) {
      mapRef.current.fitToCoordinates(allCoords, {
        edgePadding: { top: 80, right: 60, bottom: 200, left: 60 },
        animated: true,
      });
    }
  };

  const fitSelectedRoute = (route: OrderRoute) => {
    if (!mapRef.current || route.coordinates.length === 0) return;
    mapRef.current.fitToCoordinates(route.coordinates, {
      edgePadding: { top: 90, right: 60, bottom: 220, left: 60 },
      animated: true,
    });
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!mapRef.current) return;
    mapRef.current.getCamera().then((camera) => {
      const currentZoom = camera.zoom ?? 5;
      const nextZoom = direction === 'in' ? currentZoom + 1 : Math.max(currentZoom - 1, 3);
      mapRef.current?.animateCamera({ zoom: nextZoom }, { duration: 300 });
    });
  };

  const recenter = () => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(INITIAL_REGION, 500);
  };

  if (!MAP_AVAILABLE) {
    return (
      <View style={{ padding: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EFF6FF', borderRadius: 14, minHeight: 180 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#10234D', marginBottom: 4 }}>Map unavailable on this build</Text>
        <Text style={{ fontSize: 12, lineHeight: 17, color: '#475569', textAlign: 'center' }}>
          This Android build has no Google Maps key. Routes and shipments are still listed on this screen.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={INITIAL_REGION}
        showsCompass={false}
        showsScale={true}
        loadingEnabled={true}
        toolbarEnabled={false}
        mapType={mapType}
      >
        {/* Real CartoDB Voyager High-Res Map Tiles */}
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
          zIndex={-1}
        />

        {/* Polylines for each order route */}
        {routes.map((route) => {
          const isSelected = selectedRouteId === route.orderId;
          return (
            <Polyline
              key={`poly-${route.orderId}`}
              coordinates={route.coordinates}
              strokeColor={isSelected ? '#0D9488' : route.routeColor}
              strokeWidth={isSelected ? 5 : 3}
              lineDashPattern={route.status === 'Delayed' ? [8, 4] : undefined}
              tappable={true}
              onPress={() => {
                onSelectRoute(route.orderId);
                fitSelectedRoute(route);
              }}
              zIndex={isSelected ? 10 : 2}
            />
          );
        })}

        {/* Interactive Stops & Facilities Markers */}
        {routes.map((route) =>
          route.stops.map((stop: RouteStop) => {
            const isSelected = selectedRouteId === route.orderId;
            return (
              <Marker
                key={`stop-${route.orderId}-${stop.id}`}
                coordinate={stop.coordinate}
                title={stop.name}
                description={`${stop.location} • ${stop.status.toUpperCase()}`}
                onPress={() => {
                  onSelectRoute(route.orderId);
                  onSelectMarker({
                    type: stop.type,
                    title: stop.name,
                    location: stop.location,
                    coordinate: stop.coordinate,
                    details: {
                      orderId: route.orderId,
                      customer: route.customer,
                      carrier: route.carrier,
                      status: stop.status,
                      notes: stop.notes,
                    },
                  });
                }}
                zIndex={isSelected ? 20 : 5}
              >
                <View
                  style={[
                    styles.markerPin,
                    stop.type === 'supplier' && styles.supplierPin,
                    stop.type === 'warehouse' && styles.warehousePin,
                    stop.type === 'distribution' && styles.distributionPin,
                    stop.type === 'customer' && styles.customerPin,
                    isSelected && styles.markerPinSelected,
                  ]}
                >
                  {stop.type === 'supplier' && <Factory size={13} color="#FFFFFF" />}
                  {stop.type === 'warehouse' && <Warehouse size={13} color="#FFFFFF" />}
                  {stop.type === 'distribution' && <Layers size={13} color="#FFFFFF" />}
                  {stop.type === 'customer' && <Package size={13} color="#FFFFFF" />}
                </View>
              </Marker>
            );
          })
        )}
      </MapView>

      {/* Floating Controls Overlay */}
      <View style={styles.floatingControls}>
        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          onPress={() => handleZoom('in')}
          hitSlop={6}
        >
          <ZoomIn size={18} color="#10234D" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          onPress={() => handleZoom('out')}
          hitSlop={6}
        >
          <ZoomOut size={18} color="#10234D" />
        </Pressable>

        <View style={styles.controlDivider} />

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          onPress={recenter}
          hitSlop={6}
        >
          <Compass size={18} color="#0D9488" />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.controlButton, pressed && styles.controlButtonPressed]}
          onPress={fitAllRoutes}
          hitSlop={6}
        >
          <Maximize2 size={18} color="#10234D" />
        </Pressable>
      </View>

      {/* Top Telemetry Floating Badge */}
      <View style={styles.telemetryBadge}>
        <View style={styles.telemetryPulseDot} />
        <Text style={styles.telemetryText}>
          Real OSRM Road Geometry • {routes.length} Active Corridors
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  map: {
    ...StyleSheet.absoluteFill,
  },
  markerPin: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  supplierPin: {
    backgroundColor: '#0D9488',
  },
  warehousePin: {
    backgroundColor: '#D97706',
  },
  distributionPin: {
    backgroundColor: '#2563EB',
  },
  customerPin: {
    backgroundColor: '#7C3AED',
  },
  markerPinSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: '#0D9488',
    borderWidth: 2.5,
  },
  floatingControls: {
    position: 'absolute',
    right: 16,
    top: 70,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  controlButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  controlDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  telemetryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(16, 35, 77, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  telemetryPulseDot: {
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
});

export default NetworkMap;
