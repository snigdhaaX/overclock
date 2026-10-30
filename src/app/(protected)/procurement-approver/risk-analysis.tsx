import { useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Building,
  CheckCircle2,
  ExternalLink,
  Flame,
  Info,
  Layers,
  Shield,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProcurementBottomNav } from '../../../features/procurement-approver/components/ProcurementBottomNav';
import { ProcurementHeader } from '../../../features/procurement-approver/components/ProcurementHeader';
import { SupplierRiskMetricCard } from '../../../features/procurement-approver/components/SupplierRiskMetricCard';
import { procurementService } from '../../../features/procurement-approver/services/procurementService';
import {
  SupplierProfile,
  SupplierRiskDimension,
} from '../../../features/procurement-approver/types';

export default function SupplierRiskAnalysisScreen() {
  const router = useRouter();
  const [dimensions, setDimensions] = useState<SupplierRiskDimension[]>(() =>
    procurementService.getRiskDimensions()
  );
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>(() =>
    procurementService.getSuppliers()
  );

  const loadData = () => {
    setDimensions(procurementService.getRiskDimensions());
    setSuppliers(procurementService.getSuppliers());
  };

  useEffect(() => {
    return procurementService.subscribe(loadData);
  }, []);

  // Compute weighted composite risk index
  const compositeScore = Math.round(
    dimensions.reduce((acc, d) => acc + d.score, 0) / (dimensions.length || 1)
  );

  const highRiskSuppliers = suppliers.filter(
    (s) => s.riskLevel === 'High' || s.riskLevel === 'Critical'
  );
  const underReviewSuppliers = suppliers.filter(
    (s) => s.qualificationStatus === 'pending_qualification' || s.qualificationStatus === 'under_review'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Supplier Risk Analysis"
        subtitle="Multi-Tier Vulnerability & Exposure Analytics"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Composite Score Card */}
        <View style={styles.compositeCard}>
          <View style={styles.compositeHeader}>
            <View>
              <Text style={styles.compositeTitle}>Composite Supply Risk Index</Text>
              <Text style={styles.compositeSubtitle}>
                Aggregate across 6 enterprise risk dimensions
              </Text>
            </View>
            <View style={styles.indexBadge}>
              <Text style={styles.indexScore}>{compositeScore}</Text>
              <Text style={styles.indexScoreMax}>/100</Text>
            </View>
          </View>

          {/* Severity Pill */}
          <View style={styles.severityRow}>
            <View
              style={[
                styles.severityPill,
                compositeScore >= 70
                  ? styles.sevCritical
                  : compositeScore >= 50
                  ? styles.sevModerate
                  : styles.sevLow,
              ]}
            >
              <ShieldAlert
                size={13}
                color={
                  compositeScore >= 70
                    ? '#B91C1C'
                    : compositeScore >= 50
                    ? '#B45309'
                    : '#15803D'
                }
              />
              <Text
                style={[
                  styles.severityPillText,
                  compositeScore >= 70
                    ? styles.textSevCritical
                    : compositeScore >= 50
                    ? styles.textSevModerate
                    : styles.textSevLow,
                ]}
              >
                {compositeScore >= 70
                  ? 'HIGH EXPOSURE ENVIRONMENT'
                  : compositeScore >= 50
                  ? 'ELEVATED VULNERABILITY WATCH'
                  : 'STABLE RISK PROFILE'}
              </Text>
            </View>

            <View style={styles.trendIndicator}>
              <TrendingUp size={14} color="#D97706" />
              <Text style={styles.trendText}>+4.8 pts (30d change)</Text>
            </View>
          </View>

          {/* Model Notice */}
          <View style={styles.demoNoticeBox}>
            <Info size={13} color="#8B5CF6" />
            <Text style={styles.demoNoticeText}>
              Demonstration Risk Model: Evaluates maritime AIS telemetry, live port dwell, and multi-tier single-sourcing constraints.
            </Text>
          </View>
        </View>

        {/* High Risk Suppliers Alert Section */}
        <View style={styles.sectionHeader}>
          <Flame size={16} color="#DC2626" />
          <Text style={styles.sectionTitle}>
            High-Risk Suppliers ({highRiskSuppliers.length})
          </Text>
        </View>

        {highRiskSuppliers.map((supp) => (
          <Pressable
            key={supp.id}
            style={styles.supplierRiskCard}
            onPress={() =>
              router.push(`/(protected)/procurement-approver/suppliers/${supp.id}` as any)
            }
          >
            <View style={styles.suppTopRow}>
              <View style={styles.suppNameCol}>
                <Text style={styles.suppName}>{supp.name}</Text>
                <Text style={styles.suppMeta}>
                  {supp.id} · {supp.location}
                </Text>
              </View>
              <View style={styles.suppRiskBadge}>
                <Text style={styles.suppRiskScore}>{supp.riskScore}</Text>
                <Text style={styles.suppRiskLabel}>RISK</Text>
              </View>
            </View>

            <View style={styles.suppStatsRow}>
              <View style={styles.suppStat}>
                <Text style={styles.suppStatLabel}>Active Disruptions</Text>
                <Text style={[styles.suppStatVal, { color: '#DC2626' }]}>
                  {supp.activeDisruptions} events
                </Text>
              </View>
              <View style={styles.suppStat}>
                <Text style={styles.suppStatLabel}>On-Time SLA</Text>
                <Text style={styles.suppStatVal}>{supp.onTimeDeliveryRate}%</Text>
              </View>
              <View style={styles.suppStat}>
                <Text style={styles.suppStatLabel}>Avg Lead Time</Text>
                <Text style={styles.suppStatVal}>{supp.averageLeadTimeDays}d</Text>
              </View>
            </View>

            <View style={styles.suppFooter}>
              <Text style={styles.disruptionNotice}>
                Singapore container terminal delay impacting IC replenishment
              </Text>
              <ArrowRight size={14} color="#8B5CF6" />
            </View>
          </Pressable>
        ))}

        {/* Suppliers Under Review / Pending Qualification */}
        {underReviewSuppliers.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <AlertCircle size={16} color="#D97706" />
              <Text style={styles.sectionTitle}>
                Suppliers Under Qualification Review ({underReviewSuppliers.length})
              </Text>
            </View>

            {underReviewSuppliers.map((supp) => (
              <Pressable
                key={supp.id}
                style={styles.reviewCard}
                onPress={() =>
                  router.push(`/(protected)/procurement-approver/suppliers/${supp.id}` as any)
                }
              >
                <View style={styles.reviewHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reviewName}>{supp.name}</Text>
                    <Text style={styles.reviewMeta}>
                      {supp.category} · {supp.country}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>PENDING QA AUDIT</Text>
                  </View>
                </View>

                <Text style={styles.reviewNotice}>
                  Alternative sourcing candidate. Requires quality audit signoff before issuing binding POs.
                </Text>

                <View style={styles.comparePrompt}>
                  <Text style={styles.comparePromptText}>
                    Evaluate Head-to-Head Comparison
                  </Text>
                  <ExternalLink size={12} color="#8B5CF6" />
                </View>
              </Pressable>
            ))}
          </>
        )}

        {/* 6 Core Risk Dimensions */}
        <View style={styles.sectionHeader}>
          <Layers size={16} color="#10234D" />
          <Text style={styles.sectionTitle}>Detailed Risk Dimensions</Text>
        </View>

        {dimensions.map((dim) => (
          <SupplierRiskMetricCard key={dim.key} dimension={dim} />
        ))}

        {/* Quick Sourcing Evaluation Action */}
        <Pressable
          style={styles.compareActionBtn}
          onPress={() =>
            router.push('/(protected)/procurement-approver/suppliers/compare' as any)
          }
        >
          <View style={styles.compareActionContent}>
            <Shield size={20} color="#8B5CF6" />
            <View style={{ flex: 1 }}>
              <Text style={styles.compareActionTitle}>
                Alternative Supplier Comparison
              </Text>
              <Text style={styles.compareActionSubtitle}>
                Mitigate high-risk suppliers by benchmarking secondary sources
              </Text>
            </View>
          </View>
          <ArrowRight size={16} color="#8B5CF6" />
        </Pressable>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 95,
  },
  compositeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  compositeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  compositeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  compositeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  indexBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  indexScore: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10234D',
  },
  indexScoreMax: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '700',
  },
  severityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  severityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  severityPillText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  sevCritical: { backgroundColor: '#FEE2E2' },
  textSevCritical: { color: '#B91C1C' },
  sevModerate: { backgroundColor: '#FEF3C7' },
  textSevModerate: { color: '#B45309' },
  sevLow: { backgroundColor: '#DCFCE7' },
  textSevLow: { color: '#15803D' },
  trendIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#D97706',
  },
  demoNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAF5FF',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  demoNoticeText: {
    fontSize: 11,
    color: '#6B21A8',
    flex: 1,
    lineHeight: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  supplierRiskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: 12,
  },
  suppTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  suppNameCol: {
    flex: 1,
    marginRight: 8,
  },
  suppName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  suppMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  suppRiskBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  suppRiskScore: {
    fontSize: 14,
    fontWeight: '900',
    color: '#B91C1C',
  },
  suppRiskLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.5,
  },
  suppStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  suppStat: {
    alignItems: 'center',
  },
  suppStatLabel: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 2,
  },
  suppStatVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  suppFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  disruptionNotice: {
    fontSize: 11,
    color: '#DC2626',
    flex: 1,
    marginRight: 8,
    fontWeight: '500',
  },
  reviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FED7AA',
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  reviewName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  reviewMeta: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.4,
  },
  reviewNotice: {
    fontSize: 11,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 10,
  },
  comparePrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  comparePromptText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  compareActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF5FF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E9D5FF',
    marginTop: 8,
  },
  compareActionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    marginRight: 12,
  },
  compareActionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  compareActionSubtitle: {
    fontSize: 11,
    color: '#6B21A8',
    marginTop: 2,
  },
});
