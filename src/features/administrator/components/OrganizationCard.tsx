import { Building, MapPin, Package, ShieldCheck, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { OrganizationRecord, WarehouseRecord } from '../types';

interface OrganizationCardProps {
  organization?: OrganizationRecord;
  warehouse?: WarehouseRecord;
}

export const OrganizationCard: React.FC<OrganizationCardProps> = ({
  organization,
  warehouse,
}) => {
  if (warehouse) {
    const isHighUtil = warehouse.utilizationPercentage >= 90;
    const isMediumUtil = warehouse.utilizationPercentage >= 75;
    const barColor = isHighUtil ? '#EF4444' : isMediumUtil ? '#F59E0B' : '#16A34A';

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.titleInfo}>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{warehouse.code}</Text>
              <View style={[styles.typeBadge, { backgroundColor: '#F1F5F9' }]}>
                <Text style={styles.typeText}>{warehouse.type}</Text>
              </View>
            </View>
            <Text style={styles.name}>{warehouse.name}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              warehouse.status === 'Operational'
                ? styles.statusOperational
                : styles.statusWarning,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                warehouse.status === 'Operational'
                  ? styles.statusOperationalText
                  : styles.statusWarningText,
              ]}
            >
              {warehouse.status}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={12} color="#64748B" />
            <Text style={styles.metaText}>{warehouse.city}, {warehouse.country}</Text>
          </View>
          <View style={styles.metaItem}>
            <Building size={12} color="#64748B" />
            <Text style={styles.metaText} numberOfLines={1}>{warehouse.organizationName}</Text>
          </View>
        </View>

        {/* Capacity Bar */}
        <View style={styles.capacitySection}>
          <View style={styles.capacityLabelRow}>
            <Text style={styles.capacityLabel}>Capacity Utilization</Text>
            <Text style={[styles.capacityValue, { color: barColor }]}>
              {warehouse.utilizedPallets.toLocaleString()} / {warehouse.capacityPallets.toLocaleString()} pallets ({warehouse.utilizationPercentage}%)
            </Text>
          </View>
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${Math.min(warehouse.utilizationPercentage, 100)}%`, backgroundColor: barColor },
              ]}
            />
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.supervisorText}>Supervisor: {warehouse.supervisor}</Text>
        </View>
      </View>
    );
  }

  if (organization) {
    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.titleInfo}>
            <View style={styles.codeRow}>
              <Text style={styles.codeText}>{organization.code}</Text>
              <View style={[styles.typeBadge, { backgroundColor: '#EFF6FF' }]}>
                <Text style={[styles.typeText, { color: '#2563EB' }]}>{organization.industry}</Text>
              </View>
            </View>
            <Text style={styles.name}>{organization.name}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              organization.complianceStatus === 'Compliant'
                ? styles.statusOperational
                : styles.statusWarning,
            ]}
          >
            <ShieldCheck size={12} color={organization.complianceStatus === 'Compliant' ? '#16A34A' : '#D97706'} />
            <Text
              style={[
                styles.statusText,
                organization.complianceStatus === 'Compliant'
                  ? styles.statusOperationalText
                  : styles.statusWarningText,
              ]}
            >
              {organization.complianceStatus}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPin size={12} color="#64748B" />
            <Text style={styles.metaText}>{organization.city}, {organization.country}</Text>
          </View>
          <View style={styles.metaItem}>
            <Package size={12} color="#64748B" />
            <Text style={styles.metaText}>{organization.activeWarehousesCount} Warehouses</Text>
          </View>
          <View style={styles.metaItem}>
            <Users size={12} color="#64748B" />
            <Text style={styles.metaText}>{organization.userCount} Users</Text>
          </View>
        </View>
      </View>
    );
  }

  return null;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  codeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748B',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusOperational: {
    backgroundColor: '#DCFCE7',
  },
  statusOperationalText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '700',
  },
  statusWarning: {
    backgroundColor: '#FEF3C7',
  },
  statusWarningText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 10,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
  },
  capacitySection: {
    marginTop: 2,
    marginBottom: 8,
  },
  capacityLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  capacityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  capacityValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  footerRow: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  supervisorText: {
    fontSize: 11,
    color: '#94A3B8',
  },
});

export default OrganizationCard;
