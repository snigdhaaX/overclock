import {
  AlertTriangle,
  ArrowDown,
  Building,
  Factory,
  Layers,
  Ship,
  Warehouse,
} from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ImpactSummary } from '../types';
import SeverityBadge from './SeverityBadge';

interface ImpactFlowDiagramProps {
  impact: ImpactSummary;
}

export const ImpactFlowDiagram: React.FC<ImpactFlowDiagramProps> = ({ impact }) => {
  const stages = [
    {
      stage: '1. Upstream Supplier Delay',
      icon: <Factory size={18} color="#EA580C" />,
      entity: impact.supplierImpact.supplier,
      severity: impact.supplierImpact.severity,
      metric: impact.supplierImpact.delay,
      details: impact.supplierImpact.details,
      color: '#EA580C',
      bg: '#FFF7ED',
    },
    {
      stage: '2. Inbound Supply In-Transit',
      icon: <Ship size={18} color="#2563EB" />,
      entity: impact.inboundImpact.shipment,
      severity: impact.inboundImpact.severity,
      metric: `${impact.inboundImpact.units} units aboard vessel`,
      details: `Carrier: ${impact.inboundImpact.carrier}`,
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      stage: '3. Regional Warehouse Depletion',
      icon: <Warehouse size={18} color="#DC2626" />,
      entity: impact.warehouseImpact.warehouse,
      severity: impact.warehouseImpact.severity,
      metric: impact.warehouseImpact.bufferRemaining,
      details: 'Safety reserve threshold breached',
      color: '#DC2626',
      bg: '#FEF2F2',
    },
    {
      stage: '4. Downstream Orders & SLA Risk',
      icon: <Building size={18} color="#7C3AED" />,
      entity: `${impact.affectedOrders} Commercial Customer Orders`,
      severity: 'Critical' as const,
      metric: `$${impact.revenueAtRisk.toLocaleString()} revenue at risk`,
      details: `${impact.totalUnitsAtRisk} units delivery commitment at risk`,
      color: '#7C3AED',
      bg: '#F5F3FF',
    },
  ];

  return (
    <View style={styles.container}>
      {stages.map((stage, idx) => {
        const isLast = idx === stages.length - 1;

        return (
          <View key={idx}>
            <View style={[styles.card, { borderColor: '#E6EAF1' }]}>
              <View style={styles.headerRow}>
                <View style={styles.titleGroup}>
                  <View style={[styles.iconCircle, { backgroundColor: stage.bg }]}>
                    {stage.icon}
                  </View>
                  <Text style={styles.stageTitle}>{stage.stage}</Text>
                </View>
                <SeverityBadge severity={stage.severity} size="sm" />
              </View>

              <Text style={styles.entityName}>{stage.entity}</Text>

              <View style={styles.metricRow}>
                <Text style={styles.metricText}>{stage.metric}</Text>
              </View>

              <Text style={styles.detailsText}>{stage.details}</Text>
            </View>

            {!isLast && (
              <View style={styles.connectorContainer}>
                <View style={styles.dashLine} />
                <View style={styles.arrowCircle}>
                  <ArrowDown size={14} color="#64748B" />
                </View>
                <View style={styles.dashLine} />
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  stageTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  entityName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 6,
  },
  metricRow: {
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#EEF2F6',
  },
  metricText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  detailsText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  connectorContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    height: 28,
  },
  dashLine: {
    width: 24,
    height: 1,
    backgroundColor: '#CBD5E1',
  },
  arrowCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 4,
  },
});

export default ImpactFlowDiagram;
