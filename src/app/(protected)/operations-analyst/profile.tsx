import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  Key,
  Lock,
  LogOut,
  Shield,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OperationsBottomNav from '../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../features/operations-analyst/components/OperationsHeader';
import useAuth from '../../../hooks/useAuth';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out of TRUSTCHAIN',
      'Are you sure you want to end your current authenticated Operations Analyst session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(public)/signin');
          },
        },
      ]
    );
  };

  const handleItemPress = (title: string) => {
    Alert.alert(title, `This preference panel is linked to enterprise configuration management.`);
  };

  const settingsGroups = [
    {
      group: 'Account & Credentials',
      items: [
        {
          title: 'Personal Information',
          subtitle: 'Name, corporate ID & organization',
          icon: <User size={18} color="#2563EB" />,
          bg: '#EFF6FF',
        },
        {
          title: 'Notification Preferences',
          subtitle: 'Push telemetry, email & SMS escalations',
          icon: <Bell size={18} color="#4F46E5" />,
          bg: '#EEF2FF',
        },
        {
          title: 'Change Password & MFA',
          subtitle: 'FIDO2 security keys & Argon2id password',
          icon: <Key size={18} color="#D97706" />,
          bg: '#FEF3C7',
        },
      ],
    },
    {
      group: 'Application & Localization',
      items: [
        {
          title: 'Language & Regional Formats',
          subtitle: 'English (US) • UTC+05:30 IST',
          icon: <Globe size={18} color="#0D9488" />,
          bg: '#F0FDFA',
        },
        {
          title: 'Help & Operations Support',
          subtitle: '24/7 command center escalation hotline',
          icon: <HelpCircle size={18} color="#0284C7" />,
          bg: '#E0F2FE',
        },
        {
          title: 'About TRUSTCHAIN Mobile',
          subtitle: 'Version 1.2.0 (Build 584) • SOC2 Type II Certified',
          icon: <Info size={18} color="#475569" />,
          bg: '#F1F5F9',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Profile & Settings"
        subtitle="Manage analyst identity, security & preferences"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Profile Identity Card */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitials}>
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'AS'}
            </Text>
          </View>

          <View style={styles.profileMeta}>
            <Text style={styles.userName}>{user?.name || 'Anishwath'}</Text>
            <View style={styles.roleBadge}>
              <Shield size={12} color="#2563EB" style={{ marginRight: 4 }} />
              <Text style={styles.roleText}>Operations Analyst</Text>
            </View>
            <Text style={styles.userEmail}>{user?.email || 'analyst@trustchain.com'}</Text>
            <Text style={styles.userOrg}>{user?.organization || 'Apex Global Logistics'}</Text>
          </View>
        </View>

        {/* Security & Zero-Trust Verification Card */}
        <View style={styles.securityBanner}>
          <ShieldCheck size={20} color="#16A34A" style={{ marginRight: 10, marginTop: 1 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.securityTitle}>Zero-Trust RBAC Enforced</Text>
            <Text style={styles.securityDesc}>
              JWT Session active with hardware-backed SecureStore key storage. Role permissions restricted to disruption investigation, impact modeling, and recovery plan submission.
            </Text>
          </View>
        </View>

        {/* Settings Groups */}
        {settingsGroups.map((group, gIdx) => (
          <View key={gIdx} style={styles.groupSection}>
            <Text style={styles.groupHeader}>{group.group}</Text>
            <View style={styles.groupCard}>
              {group.items.map((item, iIdx) => {
                const isLast = iIdx === group.items.length - 1;
                return (
                  <Pressable
                    key={iIdx}
                    onPress={() => handleItemPress(item.title)}
                    style={({ pressed }) => [
                      styles.settingItem,
                      !isLast && styles.itemBorder,
                      pressed && styles.itemPressed,
                    ]}
                  >
                    <View style={[styles.itemIconCircle, { backgroundColor: item.bg }]}>
                      {item.icon}
                    </View>
                    <View style={styles.itemTextCol}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
                    </View>
                    <ChevronRight size={16} color="#CBD5E1" />
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {/* Sign Out Button */}
        <Pressable
          onPress={handleSignOut}
          style={({ pressed }) => [styles.signOutBtn, pressed && styles.itemPressed]}
        >
          <LogOut size={18} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.signOutText}>Sign Out of Session</Text>
        </Pressable>

        <Text style={styles.footerLegal}>
          TRUSTCHAIN Platform • Encrypted end-to-end with AES-256-GCM
        </Text>
      </ScrollView>

      <OperationsBottomNav activeTab="more" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  profileHeroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 3,
    borderColor: '#DBEAFE',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
  },
  profileMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10234D',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginVertical: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  userOrg: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  securityBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  securityTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  securityDesc: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    lineHeight: 15,
  },
  groupSection: {
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  groupCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  itemPressed: {
    backgroundColor: '#F8FAFC',
  },
  itemIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemTextCol: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10234D',
  },
  itemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 8,
    marginBottom: 16,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
  },
  footerLegal: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 16,
  },
});
