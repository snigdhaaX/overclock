import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  FileText,
  Globe,
  LogOut,
  Package,
  Shield,
  ShieldCheck,
  ShoppingCart,
  Users,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import BrandLogo from '../../components/BrandLogo';
import PrimaryButton from '../../components/PrimaryButton';
import ScreenContainer from '../../components/ScreenContainer';
import Colors from '../../constants/colors';
import { BorderRadius, Shadows, Spacing } from '../../constants/spacing';
import Typography from '../../constants/typography';
import useAuth from '../../hooks/useAuth';
import { ROLES, UserRole } from '../../types/roles';

export default function DashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: string }>();
  const { user, logout } = useAuth();

  const activeRoleKey: UserRole =
    (params.role as UserRole) || user?.assignedRole || 'operations-analyst';
  const roleDef = ROLES[activeRoleKey] || ROLES['operations-analyst'];

  React.useEffect(() => {
    if (activeRoleKey === 'operations-analyst') {
      router.replace('/(protected)/operations-analyst/home');
    } else if (activeRoleKey === 'supply-chain-manager') {
      router.replace('/(protected)/supply-chain-manager/home' as any);
    } else if (activeRoleKey === 'warehouse-operator') {
      router.replace('/(protected)/warehouse-operator/home' as any);
    }
  }, [activeRoleKey]);

  const handleSignOut = async () => {
    await logout();
    router.replace('/(public)/signin');
  };

  const renderRoleMetrics = () => {
    switch (activeRoleKey) {
      case 'operations-analyst':
        return [
          { label: 'Active Disruptions', value: '14', change: '+2 today', icon: <AlertTriangle size={20} color={Colors.warning} /> },
          { label: 'AI Recovery Plans', value: '3 Ready', change: '94% Confidence', icon: <Zap size={20} color={Colors.primary} /> },
          { label: 'Telemetry Stream', value: '99.8%', change: 'Real-time AIS', icon: <Activity size={20} color={Colors.success} /> },
        ];
      case 'supply-chain-manager':
        return [
          { label: 'Pending Approvals', value: '4 Plans', change: 'Urgent response', icon: <CheckCircle size={20} color="#0D9488" /> },
          { label: 'Trade Corridors', value: '8 Active', change: 'Pacific / Atlantic', icon: <Globe size={20} color={Colors.primary} /> },
          { label: 'Blockchain Audit', value: '100% Synced', change: 'Verified blocks', icon: <ShieldCheck size={20} color={Colors.success} /> },
        ];
      case 'warehouse-operator':
        return [
          { label: 'Inbound Shipments', value: '1,420 pkgs', change: 'Terminal 4', icon: <Package size={20} color="#16A34A" /> },
          { label: 'Automated AGVs', value: '12 / 12', change: 'All online', icon: <Activity size={20} color={Colors.primary} /> },
          { label: 'Discrepancy Rate', value: '0.00%', change: 'Zero errors', icon: <CheckCircle size={20} color={Colors.success} /> },
        ];
      case 'procurement-approver':
        return [
          { label: 'Contracts Under Review', value: '$2.4M', change: '3 vendors', icon: <FileText size={20} color="#9333EA" /> },
          { label: 'Alternate Suppliers', value: '12 Validated', change: 'Risk rating A+', icon: <ShoppingCart size={20} color={Colors.primary} /> },
          { label: 'Cost Optimization', value: '-14.8%', change: 'AI renegotiated', icon: <Zap size={20} color={Colors.success} /> },
        ];
      case 'administrator':
        return [
          { label: 'Enterprise Users', value: '48 Active', change: '5 roles', icon: <Users size={20} color="#1E293B" /> },
          { label: 'RBAC Security Policies', value: '16 Enforced', change: 'Argon2 / JWT', icon: <Shield size={20} color={Colors.primary} /> },
          { label: 'Compliance Audit', value: 'SOC2 / ISO', change: 'Compliant', icon: <ShieldCheck size={20} color={Colors.success} /> },
        ];
      default:
        return [];
    }
  };

  return (
    <ScreenContainer
      backgroundColor="#F7FAFF"
      statusBarStyle="dark-content"
      headerTitle={<BrandLogo variant="dark" size="sm" layout="horizontal" />}
      headerRight={
        <Pressable
          onPress={handleSignOut}
          hitSlop={10}
          style={({ pressed }) => [styles.logoutBtn, pressed && styles.logoutBtnPressed]}
        >
          <LogOut size={18} color={Colors.danger} />
        </Pressable>
      }
      contentContainerStyle={styles.container}
    >
      {/* User Welcome Card */}
      <View style={styles.userCard}>
        <View style={styles.userInfoRow}>
          <View style={[styles.avatarCircle, { backgroundColor: roleDef.badgeColor }]}>
            <Text style={styles.avatarText}>
              {(user?.name || 'User')
                .split(' ')
                .map((n) => n[0])
                .join('')}
            </Text>
          </View>

          <View style={styles.userTextInfo}>
            <Text style={styles.userName}>{user?.name || 'Enterprise Operator'}</Text>
            <Text style={styles.userOrg}>{user?.organization || 'Apex Global Logistics'}</Text>
          </View>
        </View>

        <View style={styles.roleBadgeRow}>
          <View style={[styles.roleBadge, { backgroundColor: roleDef.lightColor }]}>
            <Text style={[styles.roleBadgeText, { color: roleDef.badgeColor }]}>
              {roleDef.title}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>VERIFIED SESSION</Text>
          </View>
        </View>
      </View>

      {/* Metrics Section */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Real-Time Operations Telemetry</Text>
      </View>

      <View style={styles.metricsGrid}>
        {renderRoleMetrics().map((m, idx) => (
          <View key={idx} style={styles.metricCard}>
            <View style={styles.metricIconBox}>{m.icon}</View>
            <Text style={styles.metricValue}>{m.value}</Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
            <Text style={styles.metricChange}>{m.change}</Text>
          </View>
        ))}
      </View>

      {/* Quick Role Switcher for easy testing of all 5 role experiences */}
      <View style={styles.switcherSection}>
        <Text style={styles.switcherHeader}>Explore Other Role Portals</Text>
        <Text style={styles.switcherSub}>
          Click below to test any of the 5 specialized authentication experiences:
        </Text>

        <View style={styles.roleButtonsList}>
          {(Object.keys(ROLES) as UserRole[]).map((rk) => {
            const r = ROLES[rk];
            return (
              <Pressable
                key={rk}
                onPress={() => router.push(r.route as any)}
                style={({ pressed }) => [
                  styles.roleButton,
                  pressed && styles.roleButtonPressed,
                ]}
              >
                <View style={[styles.roleDotSmall, { backgroundColor: r.badgeColor }]} />
                <Text style={styles.roleButtonText}>{r.title}</Text>
                <ArrowRight size={14} color={Colors.textSecondary} />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Sign Out CTA */}
      <PrimaryButton
        title="Sign Out"
        onPress={handleSignOut}
        variant="outline"
        size="md"
        style={{ marginTop: 24, marginBottom: 32 }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xxl,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnPressed: {
    backgroundColor: '#FECACA',
  },
  userCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    ...Typography.h3,
    color: Colors.white,
  },
  userTextInfo: {
    flex: 1,
  },
  userName: {
    ...Typography.h2,
    fontSize: 18,
    color: Colors.deepNavy,
  },
  userOrg: {
    ...Typography.bodyMedium,
    color: Colors.textSecondary,
    fontSize: 13,
  },
  roleBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  roleBadgeText: {
    ...Typography.labelMedium,
    fontSize: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
    marginRight: 5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.success,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    ...Typography.h3,
    fontSize: 16,
    color: Colors.deepNavy,
  },
  metricsGrid: {
    gap: 10,
    marginBottom: Spacing.xl,
  },
  metricCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  metricValue: {
    ...Typography.h2,
    fontSize: 22,
    color: Colors.deepNavy,
    marginBottom: 2,
  },
  metricLabel: {
    ...Typography.bodyMedium,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  metricChange: {
    ...Typography.caption,
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  switcherSection: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.subtle,
  },
  switcherHeader: {
    ...Typography.h3,
    fontSize: 15,
    color: Colors.deepNavy,
    marginBottom: 4,
  },
  switcherSub: {
    ...Typography.bodySmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  roleButtonsList: {
    gap: 8,
  },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  roleButtonPressed: {
    backgroundColor: Colors.lightBlue,
  },
  roleDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  roleButtonText: {
    flex: 1,
    ...Typography.bodyMedium,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
