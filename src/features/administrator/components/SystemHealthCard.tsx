import { Activity, AlertTriangle, CheckCircle, Clock, Server, XCircle } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SystemHealthMetric } from '../types';

interface SystemHealthCardProps {
  metric: SystemHealthMetric;
}

export const SystemHealthCard: React.FC<SystemHealthCardProps> = ({ metric }) => {
  const getStatusBadge = () => {
    switch (metric.status) {
      case 'Online':
        return {
          bg: '#DCFCE7',
          color: '#16A34A',
          icon: <CheckCircle size={12} color="#16A34A" />,
          label: 'Healthy',
        };
      case 'Simulated':
        return {
          bg: '#EFF6FF',
          color: '#2563EB',
          icon: <Activity size={12} color="#2563EB" />,
          label: 'Simulated Client',
        };
      case 'Degraded':
        return {
          bg: '#FEF3C7',
          color: '#D97706',
          icon: <AlertTriangle size={12} color="#D97706" />,
          label: 'Degraded',
        };
      case 'Offline':
        return {
          bg: '#FEF2F2',
          color: '#DC2626',
          icon: <XCircle size={12} color="#DC2626" />,
          label: 'Offline',
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.titleInfo}>
          <View style={styles.categoryBadge}>
            <Server size={10} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.categoryText}>{metric.category}</Text>
          </View>
          <Text style={styles.name}>{metric.name}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          {badge.icon}
          <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      <Text style={styles.message}>{metric.message}</Text>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Uptime</Text>
          <Text style={[styles.statValue, { color: metric.uptimePercentage > 95 ? '#16A34A' : '#DC2626' }]}>
            {metric.uptimePercentage > 0 ? `${metric.uptimePercentage}%` : 'N/A'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Response Latency</Text>
          <Text style={styles.statValue}>
            {metric.latencyMs > 0 ? `${metric.latencyMs} ms` : 'Offline'}
          </Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Last Ping</Text>
          <View style={styles.clockRow}>
            <Clock size={10} color="#94A3B8" style={{ marginRight: 2 }} />
            <Text style={styles.clockText}>
              {new Date(metric.lastChecked).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  message: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
    marginBottom: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748B',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clockText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
});

export default SystemHealthCard;

