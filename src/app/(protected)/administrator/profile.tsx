import { useRouter } from 'expo-router';
import {
  Bell,
  Building,
  CheckCircle,
  ChevronRight,
  Globe,
  HelpCircle,
  Key,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldAlert,
  Smartphone,
  User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import useAuth from '../../../hooks/useAuth';

export default function AdminProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [governanceAlerts, setGovernanceAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of the Administrator Portal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(public)/signin');
        },
      },
    ]);
  };

  const handleChangePassword = () => {
    Alert.alert(
      'Credential Security',
      'A secure password reset link has been dispatched to your verified enterprise mailbox (admin@trustchain.com).'
    );
  };

  return (
    <View style={styles.container}>
      <AdminHeader title="Administrator Profile" subtitle="Account Security & Platform Settings" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Administrator Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>ER</Text>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName}>{user?.name || 'Elena Rostova'}</Text>
              <View style={styles.adminBadge}>
                <Shield size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                <Text style={styles.adminBadgeText}>ADMIN</Text>
              </View>
            </View>
            <Text style={styles.profileEmail}>{user?.email || 'admin@trustchain.com'}</Text>
            <Text style={styles.profileOrg}>{user?.organization || 'TRUSTCHAIN Security & Compliance'}</Text>
          </View>
        </View>

        {/* Governance & Delegation Authority Banner */}
        <View style={styles.authorityCard}>
          <View style={styles.authorityHeader}>
            <ShieldAlert size={16} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.authorityTitle}>Platform Authority</Text>
          </View>
          <Text style={styles.authorityDesc}>
            Super-Administrator privileges: Root RBAC governance, policy configuration, audit trail oversight, and integration management across all 5 user tiers.
          </Text>
          <View style={styles.permissionsPills}>
            <View style={styles.permPill}><Text style={styles.permPillText}>admin:all</Text></View>
            <View style={styles.permPill}><Text style={styles.permPillText}>users:manage</Text></View>
            <View style={styles.permPill}><Text style={styles.permPillText}>audit:view</Text></View>
            <View style={styles.permPill}><Text style={styles.permPillText}>policies:write</Text></View>
          </View>
        </View>

        {/* Security Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account & Authentication Security</Text>

          <View style={styles.settingsGroup}>
            <Pressable
              style={({ pressed }) => [styles.settingRow, pressed && styles.rowPressed]}
              onPress={handleChangePassword}
            >
              <View style={styles.settingIconBox}>
                <Key size={16} color="#475569" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingSub}>Last modified 45 days ago</Text>
              </View>
              <ChevronRight size={18} color="#94A3B8" />
            </Pressable>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Lock size={16} color="#475569" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Two-Factor Authentication (2FA)</Text>
                <Text style={styles.settingSub}>Enforced for all administrative accounts</Text>
              </View>
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>ACTIVE</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.settingsGroup}>
            <View style={styles.switchRow}>
              <View style={styles.settingIconBox}>
                <ShieldAlert size={16} color="#DC2626" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Critical Disruption Escalations</Text>
                <Text style={styles.settingSub}>Immediate alerts for incidents scoring &ge; 80</Text>
              </View>
              <Switch
                value={securityAlerts}
                onValueChange={setSecurityAlerts}
                trackColor={{ false: '#CBD5E1', true: '#475569' }}
                thumbColor={securityAlerts ? '#FFFFFF' : '#F8FAFC'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.settingIconBox}>
                <Bell size={16} color="#2563EB" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>User Registration & Role Requests</Text>
                <Text style={styles.settingSub}>Notify when new accounts require approval</Text>
              </View>
              <Switch
                value={governanceAlerts}
                onValueChange={setGovernanceAlerts}
                trackColor={{ false: '#CBD5E1', true: '#475569' }}
                thumbColor={governanceAlerts ? '#FFFFFF' : '#F8FAFC'}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.switchRow}>
              <View style={styles.settingIconBox}>
                <Mail size={16} color="#0D9488" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Weekly Platform Audit Digest</Text>
                <Text style={styles.settingSub}>Consolidated weekly governance summary</Text>
              </View>
              <Switch
                value={weeklyDigest}
                onValueChange={setWeeklyDigest}
                trackColor={{ false: '#CBD5E1', true: '#475569' }}
                thumbColor={weeklyDigest ? '#FFFFFF' : '#F8FAFC'}
              />
            </View>
          </View>
        </View>

        {/* Platform Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Version & Governance</Text>

          <View style={styles.settingsGroup}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Smartphone size={16} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>TRUSTCHAIN Mobile Core</Text>
                <Text style={styles.settingSub}>v1.0.0-rc1 · Expo SDK 58 (Fabric Enabled)</Text>
              </View>
              <View style={styles.versionTag}>
                <Text style={styles.versionTagText}>PROD-READY</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.settingRow}>
              <View style={styles.settingIconBox}>
                <Globe size={16} color="#64748B" />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Environment Profile</Text>
                <Text style={styles.settingSub}>Local Demonstration Runtime (Pre-Backend)</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sign Out Action Button */}
        <Pressable
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.btnPressed]}
          onPress={handleSignOut}
        >
          <LogOut size={16} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.signOutBtnText}>Sign Out of Administrator Account</Text>
        </Pressable>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 18,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  profileEmail: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  profileOrg: {
    fontSize: 11,
    color: '#94A3B8',
  },
  authorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    marginBottom: 16,
  },
  authorityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  authorityTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10234D',
  },
  authorityDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 10,
  },
  permissionsPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  permPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  permPillText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'monospace',
    color: '#334155',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  settingTextContainer: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  settingSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 58,
  },
  statusPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  versionTag: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  versionTagText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#475569',
  },
  rowPressed: {
    backgroundColor: '#F8FAFC',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 6,
    marginBottom: 20,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
});

