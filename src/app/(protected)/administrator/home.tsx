import { useRouter } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle,
  Clock,
  Layers,
  Network,
  Shield,
  Sliders,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ROLES, UserRole } from '../../../types/roles';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import AdminMetricCard from '../../../features/administrator/components/AdminMetricCard';
import adminService from '../../../features/administrator/services/adminService';
import { AdminDashboardKpis, PlatformAuditEvent } from '../../../features/administrator/types';

export default function AdminHomeScreen() {
  const router = useRouter();
  const [kpis, setKpis] = useState<AdminDashboardKpis>(adminService.getDashboardKpis());
  const [userDist, setUserDist] = useState<Record<UserRole, number>>(
    adminService.getUserRoleDistribution()
  );
  const [recentAudits, setRecentAudits] = useState<PlatformAuditEvent[]>(
    adminService.getAuditLogs().slice(0, 4)
  );
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setKpis(adminService.getDashboardKpis());
      setUserDist(adminService.getUserRoleDistribution());
      setRecentAudits(adminService.getAuditLogs().slice(0, 4));
    });
    return unsubscribe;
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setKpis(adminService.getDashboardKpis());
    setUserDist(adminService.getUserRoleDistribution());
    setRecentAudits(adminService.getAuditLogs().slice(0, 4));
    setTimeout(() => setRefreshing(false), 500);
  };

  const totalUsers = kpis.totalUsers || 1;

  const quickActions = [
    {
      title: 'Manage Users',
      desc: 'Provision, assign roles & facility access',
      icon: <Users size={18} color="#2563EB" />,
      route: '/(protected)/administrator/users',
      bgColor: '#EFF6FF',
    },
    {
      title: 'Role Permissions',
      desc: 'Configure RBAC permission matrix',
      icon: <Shield size={18} color="#0D9488" />,
      route: '/(protected)/administrator/roles',
      bgColor: '#F0FDFA',
    },
    {
      title: 'Organisations & Facilities',
      desc: 'Manage warehouses and capacity',
      icon: <Building2 size={18} color="#475569" />,
      route: '/(protected)/administrator/organizations',
      bgColor: '#F1F5F9',
    },
    {
      title: 'External Integrations',
      desc: 'Monitor FastAPI, DB, ML & Polygon RPC',
      icon: <Network size={18} color="#8B5CF6" />,
      route: '/(protected)/administrator/integrations',
      bgColor: '#FAF5FF',
    },
    {
      title: 'Global Risk Policies',
      desc: 'Set delegation caps & risk thresholds',
      icon: <Sliders size={18} color="#F59E0B" />,
      route: '/(protected)/administrator/policies',
      bgColor: '#FFFBEB',
    },
    {
      title: 'Audit & Health',
      desc: 'View immutable logs & system monitors',
      icon: <Activity size={18} color="#16A34A" />,
      route: '/(protected)/administrator/audit',
      bgColor: '#F0FDF4',
    },
  ];

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Admin Control Center"
        subtitle="Enterprise Security, RBAC & Systems Governance"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Operational Status Banner */}
        <View style={styles.statusBanner}>
          <View style={styles.statusBannerLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.statusBannerTitle}>System Status: Operational</Text>
          </View>
          <View style={styles.statusBannerRight}>
            <Text style={styles.uptimeText}>Uptime: {kpis.systemUptime}</Text>
          </View>
        </View>

        {/* Primary KPIs Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Platform Overview</Text>
          <Text style={styles.sectionSubtitle}>Real-time system telemetry</Text>
        </View>

        <View style={styles.kpiRow}>
          <AdminMetricCard
            label="Total Users"
            value={kpis.totalUsers}
            change={`${kpis.activeUsers} Active`}
            icon={<Users size={16} color="#475569" />}
            statusColor="#475569"
            onPress={() => router.push('/(protected)/administrator/users')}
          />
          <AdminMetricCard
            label="Organizations"
            value={kpis.totalOrganizations}
            change={`${kpis.registeredWarehouses} Hubs`}
            icon={<Building2 size={16} color="#2563EB" />}
            statusColor="#2563EB"
            onPress={() => router.push('/(protected)/administrator/organizations')}
          />
        </View>

        <View style={styles.kpiRow}>
          <AdminMetricCard
            label="Active Disruptions"
            value={kpis.activeDisruptions}
            change="Singapore SHP-101"
            icon={<AlertTriangle size={16} color="#DC2626" />}
            statusColor="#DC2626"
            onPress={() => router.push('/(protected)/operations-analyst/home')}
          />
          <AdminMetricCard
            label="Pending Approvals"
            value={kpis.pendingApprovals}
            change="Executive review"
            icon={<Clock size={16} color="#D97706" />}
            statusColor="#D97706"
            onPress={() => router.push('/(protected)/supply-chain-manager/approvals')}
          />
        </View>

        {/* User Distribution by Role */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>User Distribution by Role</Text>
              <Text style={styles.cardSubtitle}>5 active enterprise personas</Text>
            </View>
            <Pressable onPress={() => router.push('/(protected)/administrator/users')}>
              <Text style={styles.linkText}>View Directory</Text>
            </Pressable>
          </View>

          <View style={styles.distributionBars}>
            {(Object.keys(userDist) as UserRole[]).map((rk) => {
              const count = userDist[rk];
              const pct = Math.round((count / totalUsers) * 100);
              const rDef = ROLES[rk];
              return (
                <View key={rk} style={styles.distRow}>
                  <View style={styles.distLabelRow}>
                    <View style={styles.distLabelLeft}>
                      <View style={[styles.roleDot, { backgroundColor: rDef.badgeColor }]} />
                      <Text style={styles.distRoleName}>{rDef.title}</Text>
                    </View>
                    <Text style={styles.distCountText}>
                      {count} ({pct}%)
                    </Text>
                  </View>
                  <View style={styles.distBarBg}>
                    <View
                      style={[
                        styles.distBarFill,
                        { width: `${Math.max(pct, 4)}%`, backgroundColor: rDef.badgeColor },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Quick Action Navigation Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Administration Stations</Text>
          <Text style={styles.sectionSubtitle}>Direct access to governance suites</Text>
        </View>

        <View style={styles.actionGrid}>
          {quickActions.map((action, idx) => (
            <Pressable
              key={idx}
              style={({ pressed }) => [styles.actionCard, pressed && styles.actionPressed]}
              onPress={() => router.push(action.route as any)}
            >
              <View style={[styles.actionIconBox, { backgroundColor: action.bgColor }]}>
                {action.icon}
              </View>
              <View style={styles.actionTextBox}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDesc}>{action.desc}</Text>
              </View>
              <ArrowRight size={16} color="#94A3B8" />
            </Pressable>
          ))}
        </View>

        {/* Integration Status Cockpit Overview */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Subsystem Connectivity</Text>
              <Text style={styles.cardSubtitle}>Status across 5 enterprise integrations</Text>
            </View>
            <Pressable onPress={() => router.push('/(protected)/administrator/integrations')}>
              <Text style={styles.linkText}>Configure</Text>
            </Pressable>
          </View>

          <View style={styles.subsystemList}>
            <View style={styles.subsystemItem}>
              <View style={styles.subsystemLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#EF4444' }]} />
                <Text style={styles.subsystemName}>FastAPI Application Engine</Text>
              </View>
              <Text style={[styles.subsystemStatus, { color: '#EF4444' }]}>Disconnected</Text>
            </View>

            <View style={styles.subsystemItem}>
              <View style={styles.subsystemLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#64748B' }]} />
                <Text style={styles.subsystemName}>PostgreSQL Relational DB</Text>
              </View>
              <Text style={[styles.subsystemStatus, { color: '#64748B' }]}>Not Configured</Text>
            </View>

            <View style={styles.subsystemItem}>
              <View style={styles.subsystemLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
                <Text style={styles.subsystemName}>AI / ML Risk Prediction</Text>
              </View>
              <Text style={[styles.subsystemStatus, { color: '#2563EB' }]}>Simulated Model</Text>
            </View>

            <View style={styles.subsystemItem}>
              <View style={styles.subsystemLeft}>
                <View style={[styles.statusDot, { backgroundColor: '#2563EB' }]} />
                <Text style={styles.subsystemName}>Polygon Amoy Governance</Text>
              </View>
              <Text style={[styles.subsystemStatus, { color: '#2563EB' }]}>Simulated Tx</Text>
            </View>
          </View>
        </View>

        {/* Recent Administrative Actions */}
        <View style={styles.cardSection}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Recent Governance Audit</Text>
              <Text style={styles.cardSubtitle}>Immutable administrative action trail</Text>
            </View>
            <Pressable onPress={() => router.push('/(protected)/administrator/audit')}>
              <Text style={styles.linkText}>View All</Text>
            </Pressable>
          </View>

          <View style={styles.auditList}>
            {recentAudits.map((event) => (
              <View key={event.id} style={styles.auditItem}>
                <View style={styles.auditDot} />
                <View style={styles.auditInfo}>
                  <View style={styles.auditTitleRow}>
                    <Text style={styles.auditAction}>{event.action}</Text>
                    <Text style={styles.auditTime}>
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.auditDetails} numberOfLines={2}>
                    {event.details}
                  </Text>
                  <Text style={styles.auditActor}>By: {event.actor} ({event.actorRole})</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <AdminBottomNav />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  statusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  statusBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  statusBannerRight: {},
  uptimeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  cardSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#10234D',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  linkText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  distributionBars: {
    gap: 10,
  },
  distRow: {
    gap: 4,
  },
  distLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distRoleName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  distCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  distBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F5F9',
    overflow: 'hidden',
  },
  distBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionGrid: {
    gap: 10,
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionPressed: {
    backgroundColor: '#F8FAFC',
    transform: [{ scale: 0.99 }],
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTextBox: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  subsystemList: {
    gap: 8,
  },
  subsystemItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  subsystemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  subsystemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
  subsystemStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  auditList: {
    gap: 12,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  auditDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#475569',
    marginTop: 6,
  },
  auditInfo: {
    flex: 1,
  },
  auditTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  auditAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  auditTime: {
    fontSize: 10,
    color: '#94A3B8',
  },
  auditDetails: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  auditActor: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});

