import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  Play,
  Server,
  XCircle,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { ExternalIntegration, IntegrationStatus } from '../types';

interface IntegrationCardProps {
  integration: ExternalIntegration;
  onTestConnection: (id: string) => Promise<{ success: boolean; latencyMs: number; message: string }>;
}

export const IntegrationCard: React.FC<IntegrationCardProps> = ({
  integration,
  onTestConnection,
}) => {
  const [testing, setTesting] = useState(false);
  const [resultMessage, setResultMessage] = useState<string | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setResultMessage(null);
    try {
      const res = await onTestConnection(integration.id);
      setResultMessage(res.message);
    } catch (err: any) {
      setResultMessage(err?.message || 'Connection test failed.');
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (status: IntegrationStatus) => {
    switch (status) {
      case 'Connected':
        return {
          bg: '#DCFCE7',
          color: '#16A34A',
          icon: <CheckCircle2 size={13} color="#16A34A" />,
          label: 'Connected',
        };
      case 'Simulated':
        return {
          bg: '#EFF6FF',
          color: '#2563EB',
          icon: <Activity size={13} color="#2563EB" />,
          label: 'Simulated Client',
        };
      case 'Disconnected':
        return {
          bg: '#FEF2F2',
          color: '#DC2626',
          icon: <XCircle size={13} color="#DC2626" />,
          label: 'Disconnected',
        };
      case 'Not configured':
        return {
          bg: '#F1F5F9',
          color: '#64748B',
          icon: <AlertTriangle size={13} color="#64748B" />,
          label: 'Not Configured',
        };
      default:
        return {
          bg: '#F1F5F9',
          color: '#94A3B8',
          icon: <HelpCircle size={13} color="#94A3B8" />,
          label: 'Unknown',
        };
    }
  };

  const badge = getStatusBadge(integration.status);

  return (
    <View style={styles.card}>
      {/* Header Row: Title, Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.titleInfo}>
          <View style={styles.typeBadge}>
            <Server size={11} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.typeText}>{integration.systemType}</Text>
          </View>
          <Text style={styles.name}>{integration.name}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
          {badge.icon}
          <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
        </View>
      </View>

      {/* Purpose Description */}
      <Text style={styles.purpose}>{integration.purpose}</Text>

      {/* Connection Endpoint & Protocol (Safe - No Secrets) */}
      <View style={styles.specBox}>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Endpoint:</Text>
          <Text style={styles.specValue} numberOfLines={1}>{integration.endpointUrl}</Text>
        </View>
        <View style={styles.specRow}>
          <Text style={styles.specLabel}>Protocol:</Text>
          <Text style={styles.specValue}>{integration.protocol}</Text>
        </View>
        {integration.version && (
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Version:</Text>
            <Text style={styles.specValue}>{integration.version}</Text>
          </View>
        )}
      </View>

      {/* Notes & Reality Disclaimer */}
      <View style={styles.notesBox}>
        <Text style={styles.notesText}>{integration.configurationNotes}</Text>
      </View>

      {/* Test Connection Result Feedback */}
      {resultMessage && (
        <View style={styles.feedbackBox}>
          <Text style={styles.feedbackText}>{resultMessage}</Text>
        </View>
      )}

      {/* Footer: Last Checked & Test Action */}
      <View style={styles.footerRow}>
        <View style={styles.checkInfo}>
          <Clock size={12} color="#94A3B8" style={{ marginRight: 4 }} />
          <Text style={styles.checkText}>
            {integration.lastCheckTimestamp
              ? `Checked ${new Date(integration.lastCheckTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Never probed'}
          </Text>
          {integration.latencyMs ? (
            <Text style={styles.latencyText}>({integration.latencyMs}ms)</Text>
          ) : null}
        </View>

        <Pressable
          style={({ pressed }) => [styles.testBtn, pressed && styles.btnPressed]}
          onPress={handleTest}
          disabled={testing}
        >
          {testing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Play size={12} color="#FFFFFF" fill="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.testBtnText}>Test Probe</Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  titleInfo: {
    flex: 1,
    marginRight: 8,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
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
  purpose: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  specBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
    gap: 4,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  specLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  specValue: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#1E293B',
    maxWidth: '70%',
  },
  notesBox: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    marginBottom: 10,
  },
  notesText: {
    fontSize: 11,
    color: '#B45309',
    lineHeight: 15,
  },
  feedbackBox: {
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 11,
    color: '#0D9488',
    lineHeight: 15,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  checkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  latencyText: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: '600',
    marginLeft: 4,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});

export default IntegrationCard;

