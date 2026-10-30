import React, { useEffect, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Building,
  CheckCircle2,
  Clock,
  DollarSign,
  Globe,
  Package,
  ShieldAlert,
  Star,
  Truck,
  User,
} from 'lucide-react-native';
import { SupplierProfile } from '../../../../features/procurement-approver/types';
import { procurementService } from '../../../../features/procurement-approver/services/procurementService';
import ProcurementHeader from '../../../../features/procurement-approver/components/ProcurementHeader';
import { ProcurementStatusBadge } from '../../../../features/procurement-approver/components/ProcurementStatusBadge';

export default function SupplierProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [, setDataVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'performance'>('overview');

  useEffect(() => {
    return procurementService.subscribe(() => {
      setDataVersion((v) => v + 1);
    });
  }, []);

  const supplier = id ? procurementService.getSupplierById(id) : null;

  if (!supplier) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ProcurementHeader title="Supplier Details" showBack />
        <View style={styles.notFoundContainer}>
          <AlertCircle size={48} color="#DC2626" />
          <Text style={styles.notFoundTitle}>Supplier Profile Not Found</Text>
          <Text style={styles.notFoundSubtitle}>
            Vendor record with ID &quot;{id}&quot; does not exist in the procurement registry.
          </Text>
          <Pressable style={styles.returnBtn} onPress={() => router.back()}>
            <Text style={styles.returnBtnText}>Return to Directory</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'Critical':
      case 'High':
        return '#DC2626';
      case 'Medium':
        return '#D97706';
      default:
        return '#16A36A';
    }
  };

  const riskColor = getRiskColor(supplier.riskLevel);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title={supplier.name}
        subtitle={`Vendor Dossier · ${supplier.id} · ${supplier.category}`}
        showBack
      />

      {/* Hero Badge Section */}
      <View style={styles.heroSection}>
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroName}>{supplier.name}</Text>
            <View style={styles.heroLocRow}>
              <Globe size={12} color="#64748B" />
              <Text style={styles.heroLocText}>{supplier.location}</Text>
            </View>
          </View>
          <ProcurementStatusBadge status={supplier.qualificationStatus} />
        </View>

        {/* 3 Section Tabs */}
        <View style={styles.tabsBar}>
          <Pressable
            style={[styles.sectionTab, activeTab === 'overview' && styles.sectionTabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Text
              style={[styles.sectionTabText, activeTab === 'overview' && styles.sectionTabTextActive]}
            >
              1. Overview
            </Text>
          </Pressable>

          <Pressable
            style={[styles.sectionTab, activeTab === 'products' && styles.sectionTabActive]}
            onPress={() => setActiveTab('products')}
          >
            <Text
              style={[styles.sectionTabText, activeTab === 'products' && styles.sectionTabTextActive]}
            >
              2. Products ({supplier.productsSupplied.length})
            </Text>
          </Pressable>

          <Pressable
            style={[styles.sectionTab, activeTab === 'performance' && styles.sectionTabActive]}
            onPress={() => setActiveTab('performance')}
          >
            <Text
              style={[
                styles.sectionTabText,
                activeTab === 'performance' && styles.sectionTabTextActive,
              ]}
            >
              3. Performance
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <View style={styles.tabContent}>
            {/* Enterprise Credentials */}
            <View style={styles.infoCard}>
              <Text style={styles.cardSectionTitle}>Enterprise Profile</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Vendor Identifier</Text>
                <Text style={styles.infoVal}>{supplier.id}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Primary Category</Text>
                <Text style={styles.infoVal}>{supplier.category}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Annual Spend (YTD)</Text>
                <Text style={styles.infoValCost}>{supplier.spendYTD}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Account Contact Role</Text>
                <Text style={styles.infoVal}>{supplier.contactRole}</Text>
              </View>
            </View>

            {/* Certifications */}
            <View style={styles.infoCard}>
              <View style={styles.certHeader}>
                <Award size={16} color="#8B5CF6" />
                <Text style={styles.cardSectionTitle}>Industry Certifications</Text>
              </View>
              <View style={styles.certChips}>
                {supplier.certifications.map((cert, idx) => (
                  <View key={idx} style={styles.certBadge}>
                    <CheckCircle2 size={12} color="#16A36A" />
                    <Text style={styles.certText}>{cert}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: PRODUCTS */}
        {activeTab === 'products' && (
          <View style={styles.tabContent}>
            <Text style={styles.tabHeading}>Qualified Component Catalog</Text>
            {supplier.productsSupplied.map((prod, idx) => (
              <View key={idx} style={styles.productCard}>
                <View style={styles.prodHeader}>
                  <Text style={styles.prodName}>{prod.name}</Text>
                  <Text style={styles.prodSku}>SKU: {prod.sku}</Text>
                </View>

                <View style={styles.prodGrid}>
                  <View style={styles.prodCol}>
                    <Text style={styles.prodLabel}>Unit Price</Text>
                    <Text style={styles.prodVal}>₹{prod.unitPrice.toLocaleString('en-IN')}</Text>
                  </View>

                  <View style={styles.prodCol}>
                    <Text style={styles.prodLabel}>MOQ</Text>
                    <Text style={styles.prodVal}>{prod.moq.toLocaleString()} units</Text>
                  </View>

                  <View style={styles.prodCol}>
                    <Text style={styles.prodLabel}>Weekly Capacity</Text>
                    <Text style={styles.prodVal}>{prod.capacity.toLocaleString()} units</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* TAB 3: PERFORMANCE */}
        {activeTab === 'performance' && (
          <View style={styles.tabContent}>
            {/* KPI Cards Strip */}
            <View style={styles.perfGrid}>
              <View style={styles.perfTile}>
                <ShieldAlert size={18} color={riskColor} />
                <Text style={styles.perfLabel}>Risk Score</Text>
                <Text style={[styles.perfVal, { color: riskColor }]}>
                  {supplier.riskScore}/100
                </Text>
                <Text style={styles.perfSub}>{supplier.riskLevel} Risk</Text>
              </View>

              <View style={styles.perfTile}>
                <Truck size={18} color="#2563EB" />
                <Text style={styles.perfLabel}>On-Time SLA</Text>
                <Text style={styles.perfVal}>{supplier.onTimeDeliveryRate}%</Text>
                <Text style={styles.perfSub}>30-Day Rate</Text>
              </View>

              <View style={styles.perfTile}>
                <Clock size={18} color="#0D9488" />
                <Text style={styles.perfLabel}>Lead Time</Text>
                <Text style={styles.perfVal}>{supplier.averageLeadTimeDays}d</Text>
                <Text style={styles.perfSub}>Port-to-Dock</Text>
              </View>

              <View style={styles.perfTile}>
                <Star size={18} color="#D97706" />
                <Text style={styles.perfLabel}>Quality Score</Text>
                <Text style={styles.perfVal}>{supplier.qualityScore}/5</Text>
                <Text style={styles.perfSub}>QA Inspection</Text>
              </View>
            </View>

            {/* Active Disruptions */}
            <View style={styles.disruptionCard}>
              <Text style={styles.cardSectionTitle}>Recent Operational Disruptions</Text>
              {supplier.recentDisruptions && supplier.recentDisruptions.length > 0 ? (
                supplier.recentDisruptions.map((dis, idx) => (
                  <View key={idx} style={styles.disruptionItem}>
                    <AlertTriangle size={14} color="#DC2626" />
                    <Text style={styles.disruptionText}>{dis}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.noDisruptionRow}>
                  <CheckCircle2 size={16} color="#16A36A" />
                  <Text style={styles.noDisruptionText}>
                    Zero active disruptions or transit holdbacks reported.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  notFoundContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 12,
  },
  notFoundSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  returnBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#8B5CF6',
    borderRadius: 8,
  },
  returnBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  heroSection: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  heroLeft: {
    flex: 1,
    marginRight: 10,
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  heroLocRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  heroLocText: {
    fontSize: 12,
    color: '#64748B',
  },
  tabsBar: {
    flexDirection: 'row',
    gap: 8,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  sectionTabActive: {
    borderBottomColor: '#8B5CF6',
  },
  sectionTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  sectionTabTextActive: {
    color: '#8B5CF6',
  },
  tabContent: {
    gap: 14,
  },
  tabHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 4,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  infoValCost: {
    fontSize: 14,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  certHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  certChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  certText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  prodHeader: {
    marginBottom: 10,
  },
  prodName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  prodSku: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  prodGrid: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EDF2F7',
  },
  prodCol: {
    flex: 1,
    alignItems: 'center',
  },
  prodLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  prodVal: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10234D',
  },
  perfGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  perfTile: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  perfLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  perfVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
    marginTop: 2,
  },
  perfSub: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  disruptionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  disruptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  disruptionText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    flex: 1,
  },
  noDisruptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },
  noDisruptionText: {
    fontSize: 12,
    color: '#15803D',
    fontWeight: '600',
  },
});
