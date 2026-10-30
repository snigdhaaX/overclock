import { useRouter } from 'expo-router';
import {
  Activity,
  AlertCircle,
  HelpCircle,
  Network,
  RefreshCw,
  Server,
  ShieldCheck,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import IntegrationCard from '../../../features/administrator/components/IntegrationCard';
import adminService from '../../../features/administrator/services/adminService';
import { ExternalIntegration } from '../../../features/administrator/types';

export default function IntegrationsManagementScreen() {
  const router = useRouter();
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>(
    adminService.getIntegrations()
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setIntegrations(adminService.getIntegrations());
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setIntegrations(adminService.getIntegrations());
    setTimeout(() => setRefreshing(false), 500);
  };

  const handleTestConnection = async (id: string) => {
    return await adminService.testIntegration(id);
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="External Integrations"
        subtitle="Manage Subsystem Gateways & Protocol Connectivity"
      />

      <FlatList
        data={integrations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListHeaderComponent={
          <>
            {/* Top Security & Secrets Notice */}
            <View style={styles.securityNoticeBox}>
              <ShieldCheck size={16} color="#0D9488" style={{ marginRight: 8, marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.securityTitle}>Enterprise Secrets Safeguard</Text>
                <Text style={styles.securityDescription}>
                  API keys, private keys, database passwords, and mTLS credentials are encrypted in hardware KeyVaults. Connection statuses reflect verifiable health probe telemetry.
                </Text>
              </View>
            </View>

            {/* Architecture Overview */}
            <View style={styles.architectureBox}>
              <Text style={styles.archTitle}>Integration Topology Status</Text>
              <Text style={styles.archSubtitle}>
                The mobile application currently operates using local client-side demonstration state. External backend systems can be configured below.
              </Text>
            </View>
          </>
        }
        renderItem={({ item }) => (
          <IntegrationCard
            integration={item}
            onTestConnection={handleTestConnection}
          />
        )}
      />

      <AdminBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  listContent: {
    padding: 16,
    paddingBottom: 110,
  },
  securityNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#99F6E4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0D9488',
    marginBottom: 2,
  },
  securityDescription: {
    fontSize: 11,
    color: '#115E59',
    lineHeight: 15,
  },
  architectureBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  archTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 3,
  },
  archSubtitle: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
});

