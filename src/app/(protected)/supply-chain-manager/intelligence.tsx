import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layers,
  MapPin,
  Package,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
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
import Svg, { Circle, G } from 'react-native-svg';
import SeverityBadge from '@/features/operations-analyst/components/SeverityBadge';
import ManagerBottomNav from '@/features/supply-chain-manager/components/ManagerBottomNav';
import ManagerHeader from '@/features/supply-chain-manager/components/ManagerHeader';

export default function RiskIntelligenceScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'Network' | 'Supplier' | 'Warehouse' | 'Delivery'>('Network');

  const tabs: Array<'Network' | 'Supplier' | 'Warehouse' | 'Delivery'> = [
    'Network',
    'Supplier',
    'Warehouse',
    'Delivery',
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ManagerHeader
        title="Risk & Performance Intelligence"
        subtitle="Network exposure indices, supplier volatility & on-time trends"
        showBack={true}
        onBack={() => router.back()}
      />

      {/* Segmented Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'Network' && (
          <View style={styles.tabContent}>
            {/* Donut Chart Card */}
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Global Risk Distribution</Text>
              <Text style={styles.cardSubtitle}>34 monitored endpoints across active supply chains</Text>

              <View style={styles.donutRow}>
                <View style={styles.svgContainer}>
                  <Svg width={130} height={130} viewBox="0 0 100 100">
                    <G rotation="-90" origin="50, 50">
                      <Circle cx="50" cy="50" r="38" stroke="#10234D" strokeWidth="12" fill="none" opacity={0.1} />
                      {/* Critical: 28% */}
                      <Circle cx="50" cy="50" r="38" stroke="#DC2626" strokeWidth="12" strokeDasharray="66 238" strokeDashoffset="0" fill="none" />
                      {/* High: 35% */}
                      <Circle cx="50" cy="50" r="38" stroke="#D97706" strokeWidth="12" strokeDasharray="83 238" strokeDashoffset="-66" fill="none" />
                      {/* Medium: 22% */}
                      <Circle cx="50" cy="50" r="38" stroke="#2563EB" strokeWidth="12" strokeDasharray="52 238" strokeDashoffset="-149" fill="none" />
                      {/* Low: 15% */}
                      <Circle cx="50" cy="50" r="38" stroke="#16A36A" strokeWidth="12" strokeDasharray="37 238" strokeDashoffset="-201" fill="none" />
                    </G>
                  </Svg>
                  <View style={styles.donutCenter}>
                    <Text style={styles.donutScore}>78</Text>
                    <Text style={styles.donutScoreLabel}>RISK INDEX</Text>
                  </View>
                </View>

                <View style={styles.legendContainer}>
                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#DC2626' }]} />
                    <Text style={styles.legendLabel}>Critical Exposure</Text>
                    <Text style={styles.legendValue}>28% (6)</Text>
                  </View>

                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
                    <Text style={styles.legendLabel}>High Volatility</Text>
                    <Text style={styles.legendValue}>35% (12)</Text>
                  </View>

                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#2563EB' }]} />
                    <Text style={styles.legendLabel}>Moderate Risk</Text>
                    <Text style={styles.legendValue}>22% (8)</Text>
                  </View>

                  <View style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: '#16A36A' }]} />
                    <Text style={styles.legendLabel}>Healthy Reserve</Text>
                    <Text style={styles.legendValue}>15% (8)</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* High Priority Risk Queue */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>High Priority Orders at Risk</Text>
            </View>

            <View style={styles.riskCard}>
              <View style={styles.riskTop}>
                <View>
                  <Text style={styles.riskOrderId}>ORD-445 • EduTech Pvt Ltd</Text>
                  <Text style={styles.riskSub}>PRD-012 Industrial Microcontrollers (280 units)</Text>
                </View>
                <SeverityBadge severity="Critical" size="sm" />
              </View>
              <Text style={styles.riskReason}>
                Singapore port queue hold (+120 hrs); buffer at WH-MUM breached. Immediate stock transfer required.
              </Text>
              <View style={styles.riskFooter}>
                <Text style={styles.riskScoreText}>Risk Score: <Text style={{ color: '#DC2626', fontWeight: '800' }}>92/100</Text></Text>
                <Text style={styles.dueText}>Due: 26 Oct 2026</Text>
              </View>
            </View>

            <View style={styles.riskCard}>
              <View style={styles.riskTop}>
                <View>
                  <Text style={styles.riskOrderId}>ORD-446 • CampusMart Retail</Text>
                  <Text style={styles.riskSub}>PRD-012 Industrial Microcontrollers (190 units)</Text>
                </View>
                <SeverityBadge severity="High" size="sm" />
              </View>
              <Text style={styles.riskReason}>
                Assembly line hold at Delhi terminal; transit delay spilling over to downstream retail rollout.
              </Text>
              <View style={styles.riskFooter}>
                <Text style={styles.riskScoreText}>Risk Score: <Text style={{ color: '#D97706', fontWeight: '800' }}>85/100</Text></Text>
                <Text style={styles.dueText}>Due: 27 Oct 2026</Text>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Supplier' && (
          <View style={styles.tabContent}>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Tier-1 Supplier Volatility Ratings</Text>
              <Text style={styles.cardSubtitle}>Composite index: production lead time, quality defect rate, and power stability</Text>

              <View style={styles.supplierBarList}>
                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>Precision Components Fab (Sanand)</Text>
                    <Text style={[styles.barVal, { color: '#DC2626' }]}>89/100</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '89%', backgroundColor: '#DC2626' }]} />
                  </View>
                </View>

                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>Global Silicon Fab Ltd (Chennai)</Text>
                    <Text style={[styles.barVal, { color: '#D97706' }]}>82/100</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '82%', backgroundColor: '#D97706' }]} />
                  </View>
                </View>

                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>Tech Components Ltd (Bangalore)</Text>
                    <Text style={[styles.barVal, { color: '#D97706' }]}>78/100</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '78%', backgroundColor: '#D97706' }]} />
                  </View>
                </View>

                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>Northern Silicon Center (Gurugram)</Text>
                    <Text style={[styles.barVal, { color: '#16A36A' }]}>32/100</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '32%', backgroundColor: '#16A36A' }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Warehouse' && (
          <View style={styles.tabContent}>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>Warehouse Safety Buffer Health</Text>
              <Text style={styles.cardSubtitle}>Current buffer levels relative to target safety stock (30%)</Text>

              <View style={styles.supplierBarList}>
                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>WH-MUM (Mumbai Central)</Text>
                    <Text style={[styles.barVal, { color: '#DC2626' }]}>14% (Deficit)</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '14%', backgroundColor: '#DC2626' }]} />
                  </View>
                </View>

                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>WH-DEL (Delhi Northern)</Text>
                    <Text style={[styles.barVal, { color: '#D97706' }]}>52% (Capacity Hold)</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '52%', backgroundColor: '#D97706' }]} />
                  </View>
                </View>

                <View style={styles.supplierBarItem}>
                  <View style={styles.barHeader}>
                    <Text style={styles.barTitle}>WH-BLR (Bangalore Tech Park)</Text>
                    <Text style={[styles.barVal, { color: '#16A36A' }]}>78% (Healthy)</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: '78%', backgroundColor: '#16A36A' }]} />
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}

        {activeTab === 'Delivery' && (
          <View style={styles.tabContent}>
            <View style={styles.chartCard}>
              <Text style={styles.cardTitle}>On-Time In-Full (OTIF) Performance</Text>
              <Text style={styles.cardSubtitle}>Monthly SLA compliance tracking against 95.0% enterprise target</Text>

              <View style={styles.otifStatRow}>
                <View style={styles.otifStat}>
                  <Text style={styles.otifLabel}>Current OTIF</Text>
                  <Text style={[styles.otifVal, { color: '#D97706' }]}>91.8%</Text>
                  <Text style={styles.otifTarget}>Target: 95.0%</Text>
                </View>

                <View style={styles.otifStat}>
                  <Text style={styles.otifLabel}>Delayed Shipments</Text>
                  <Text style={[styles.otifVal, { color: '#DC2626' }]}>4</Text>
                  <Text style={styles.otifTarget}>Down from 7 last week</Text>
                </View>

                <View style={styles.otifStat}>
                  <Text style={styles.otifLabel}>Recovery Efficacy</Text>
                  <Text style={[styles.otifVal, { color: '#16A36A' }]}>96.4%</Text>
                  <Text style={styles.otifTarget}>Approved plans protected</Text>
                </View>
              </View>
            </View>
          </View>
        )}
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
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#0D9488',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#0D9488',
    fontWeight: '800',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },
  tabContent: {
    gap: 14,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 16,
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  svgContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: 130,
    height: 130,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutScore: {
    fontSize: 26,
    fontWeight: '900',
    color: '#10234D',
  },
  donutScoreLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  legendContainer: {
    flex: 1,
    marginLeft: 16,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendLabel: {
    fontSize: 11,
    color: '#475569',
    flex: 1,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10234D',
  },
  sectionHeader: {
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#10234D',
  },
  riskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  riskTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  riskOrderId: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  riskSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  riskReason: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 16,
    marginBottom: 10,
  },
  riskFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 8,
  },
  riskScoreText: {
    fontSize: 11,
    color: '#64748B',
  },
  dueText: {
    fontSize: 11,
    color: '#64748B',
  },
  supplierBarList: {
    gap: 12,
  },
  supplierBarItem: {
    gap: 6,
  },
  barHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  barVal: {
    fontSize: 12,
    fontWeight: '800',
  },
  barTrack: {
    height: 7,
    backgroundColor: '#F1F5F9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  otifStatRow: {
    flexDirection: 'row',
    gap: 10,
  },
  otifStat: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  otifLabel: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 4,
  },
  otifVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 2,
  },
  otifTarget: {
    fontSize: 9,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
