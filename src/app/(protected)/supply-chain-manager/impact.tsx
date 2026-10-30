import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  Layers,
  MapPin,
  Package,
  TrendingDown,
  Truck,
  Warehouse,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';

export default function ImpactExposureScreen() {
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState<'All' | 'Financial' | 'Cascade'>('All');

  const exposureStages = [
    {
      stage: '1. Upstream Supplier Delay',
      entity: 'Global Silicon Fab & Tech Components',
      location: 'Shenzhen Hub & Chennai SEZ',
      severity: 'Critical',
      impact: '+120 hours delay on wafer batch dispatch',
      units: '950 units',
      icon: Building,
      color: '#DC2626',
    },
    {
      stage: '2. Inbound Freight Congestion',
      entity: 'OceanTrans Container Vessel MSC Clara',
      location: 'Singapore Transshipment Berth 4',
      severity: 'High',
      impact: 'Berth congestion queue; revised ETA +5 days',
      units: 'Container #MSCU-789042',
      icon: Truck,
      color: '#D97706',
    },
    {
      stage: '3. Warehouse Buffer Breach',
      entity: 'Mumbai Central Logistics Hub (WH-MUM)',
      location: 'Nhava Sheva, Maharashtra',
      severity: 'High',
      impact: 'Safety stock drops from 30% to 14% critical threshold',
      units: '18% buffer deficit',
      icon: Warehouse,
      color: '#2563EB',
    },
    {
      stage: '4. Downstream Customer Delivery Risk',
      entity: 'EduTech Pvt Ltd & CampusMart Retail',
      location: 'Pune & Delhi Assembly Plants',
      severity: 'Critical',
      impact: 'SLA penalty exposure: $211,200 commercial revenue at risk',
      units: '4 Client Orders impacted',
      icon: Package,
      color: '#DC2626',
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Impact & Exposure Analysis"
        subtitle="Downstream enterprise cascade, inventory depletion & financial risk"
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Executive Exposure Summary Bar */}
        <View style={styles.kpiContainer}>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Revenue at Risk</Text>
              <Text style={[styles.kpiVal, { color: '#DC2626' }]}>$342,000</Text>
              <Text style={styles.kpiSub}>Across 8 contracts</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Units Exposed</Text>
              <Text style={styles.kpiVal}>1,680</Text>
              <Text style={styles.kpiSub}>Active microcontrollers</Text>
            </View>
          </View>

          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Average Delay</Text>
              <Text style={[styles.kpiVal, { color: '#D97706' }]}>+5.2 Days</Text>
              <Text style={styles.kpiSub}>Transit hold duration</Text>
            </View>

            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Affected Hubs</Text>
              <Text style={[styles.kpiVal, { color: '#0D9488' }]}>2 Warehouses</Text>
              <Text style={styles.kpiSub}>WH-MUM & WH-DEL</Text>
            </View>
          </View>
        </View>

        {/* Multi-Tier Cascade Flow Visualization */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Multi-Echelon Disruption Cascade</Text>
        </View>

        <View style={styles.cascadeContainer}>
          {exposureStages.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <React.Fragment key={index}>
                <View style={styles.stageCard}>
                  <View style={styles.stageTop}>
                    <View style={styles.stageIconRow}>
                      <View style={[styles.iconWrapper, { backgroundColor: stage.color + '15' }]}>
                        <Icon size={16} color={stage.color} />
                      </View>
                      <Text style={styles.stageTitle}>{stage.stage}</Text>
                    </View>
                    <SeverityBadge severity={stage.severity as any} size="sm" />
                  </View>

                  <Text style={styles.entityName}>{stage.entity}</Text>

                  <View style={styles.locationRow}>
                    <MapPin size={11} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.locationText}>{stage.location}</Text>
                  </View>

                  <View style={styles.impactDetailsBox}>
                    <Text style={styles.impactDetailsText}>{stage.impact}</Text>
                    <Text style={styles.unitsTag}>{stage.units}</Text>
                  </View>
                </View>

                {index < exposureStages.length - 1 && (
                  <View style={styles.connectorContainer}>
                    <View style={styles.connectorLine} />
                    <View style={styles.arrowCircle}>
                      <ArrowDown size={14} color="#0D9488" />
                    </View>
                    <View style={styles.connectorLine} />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* Geographic Exposure Breakdown */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Regional Facility Exposure</Text>
        </View>

        <View style={styles.geoCard}>
          <View style={styles.geoRow}>
            <View style={styles.geoInfo}>
              <Text style={styles.geoCity}>Mumbai (Nhava Sheva Hub)</Text>
              <Text style={styles.geoDetail}>WH-MUM buffer breach • 4 incoming delays</Text>
            </View>
            <Text style={[styles.geoExposureVal, { color: '#DC2626' }]}>$211,200</Text>
          </View>

          <View style={styles.geoDivider} />

          <View style={styles.geoRow}>
            <View style={styles.geoInfo}>
              <Text style={styles.geoCity}>Delhi NCR Freight Yard</Text>
              <Text style={styles.geoDetail}>WH-DEL capacity hold • 2 delayed orders</Text>
            </View>
            <Text style={[styles.geoExposureVal, { color: '#D97706' }]}>$83,250</Text>
          </View>

          <View style={styles.geoDivider} />

          <View style={styles.geoRow}>
            <View style={styles.geoInfo}>
              <Text style={styles.geoCity}>Pune Hinjawadi Terminal</Text>
              <Text style={styles.geoDetail}>EduTech SLA commitment due 26 Oct</Text>
            </View>
            <Text style={[styles.geoExposureVal, { color: '#2563EB' }]}>$47,550</Text>
          </View>
        </View>
      </ScrollView>

      <ManagerBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  kpiContainer: {
    gap: 10,
    marginBottom: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10234D',
  },
  kpiSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  sectionHeader: {
    marginBottom: 10,
    marginTop: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.2,
  },
  cascadeContainer: {
    marginBottom: 18,
  },
  stageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stageTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  stageIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  entityName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 11,
    color: '#64748B',
  },
  impactDetailsBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  impactDetailsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 4,
  },
  unitsTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  connectorContainer: {
    alignItems: 'center',
    marginVertical: -2,
    zIndex: 5,
  },
  connectorLine: {
    width: 2,
    height: 8,
    backgroundColor: '#CBD5E1',
  },
  arrowCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F0FDFA',
    borderWidth: 1.5,
    borderColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  geoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  geoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  geoInfo: {
    flex: 1,
  },
  geoCity: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 2,
  },
  geoDetail: {
    fontSize: 11,
    color: '#64748B',
  },
  geoExposureVal: {
    fontSize: 14,
    fontWeight: '800',
  },
  geoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
});
