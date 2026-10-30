import { useRouter } from 'expo-router';
import {
  Bell,
  Building,
  CheckCircle2,
  ChevronRight,
  Globe,
  HelpCircle,
  Info,
  Key,
  Lock,
  LogOut,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ProcurementBottomNav } from '../../../features/procurement-approver/components/ProcurementBottomNav';
import { ProcurementHeader } from '../../../features/procurement-approver/components/ProcurementHeader';
import useAuth from '../../../hooks/useAuth';

export default function ProcurementProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [modalTitle, setModalTitle] = useState<string | null>(null);
  const [modalMessage, setModalMessage] = useState<string | null>(null);

  const handleOpenDialog = (title: string, message: string) => {
    setModalTitle(title);
    setModalMessage(message);
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your Procurement Approver account?',
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ProcurementHeader
        title="Profile & Governance"
        subtitle="Approver Credentials & System Settings"
        showBack
        onBack={() => router.back()}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* User Card */}
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.avatarText}>PS</Text>
          </View>

          <View style={styles.userMeta}>
            <Text style={styles.userName}>Priya Sharma</Text>
            <View style={styles.roleBadge}>
              <ShieldCheck size={12} color="#8B5CF6" />
              <Text style={styles.roleText}>Procurement Approver</Text>
            </View>
            <Text style={styles.orgText}>Trustchain Enterprise Solutions Ltd.</Text>
          </View>
        </View>

        {/* Governance & Authority Credentials */}
        <View style={styles.authorityCard}>
          <Text style={styles.authorityHeader}>SIGN-OFF DELEGATION AUTHORITY</Text>

          <View style={styles.thresholdRow}>
            <View>
              <Text style={styles.thresholdLabel}>Authorized Approval Ceiling</Text>
              <Text style={styles.thresholdAmount}>₹2,500,000</Text>
            </View>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>LEVEL 4</Text>
            </View>
          </View>

          <Text style={styles.thresholdNote}>
            Requests exceeding ₹2,500,000 require executive co-signature or VP Procurement escalation.
          </Text>

          <View style={styles.infoDivider} />

          <View style={styles.gridRow}>
            <View style={styles.gridCol}>
              <Mail size={13} color="#64748B" />
              <Text style={styles.gridVal}>procurement@trustchain.com</Text>
            </View>
            <View style={styles.gridCol}>
              <Building size={13} color="#64748B" />
              <Text style={styles.gridVal}>Direct Sourcing Ops</Text>
            </View>
          </View>
        </View>

        {/* Sourcing & Governance Settings */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>PREFERENCES & ACCOUNT</Text>

          <Pressable
            style={styles.settingItem}
            onPress={() =>
              handleOpenDialog(
                'Personal Information',
                'Priya Sharma\nRole: Procurement Approver\nDepartment: Strategic Sourcing & Vendor Governance\nLocation: Mumbai Regional Office\nFIDO2 Hardware Authenticated'
              )
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: '#EFF6FF' }]}>
              <User size={16} color="#2563EB" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Personal Information</Text>
              <Text style={styles.settingSubtitle}>
                Executive contact, title & division dossier
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() =>
              handleOpenDialog(
                'Notification Preferences',
                'Real-time alerts enabled for:\n• Urgent emergency sourcing requests\n• Supplier risk threshold escalations\n• Purchase order EDI transmission confirmations\n• Vendor qualification milestone updates'
              )
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: '#FAF5FF' }]}>
              <Bell size={16} color="#8B5CF6" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Notification Preferences</Text>
              <Text style={styles.settingSubtitle}>
                Push alerts, threshold warnings & SLA triggers
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() =>
              handleOpenDialog(
                'Security & Change Password',
                'Cryptographic Session Active\nBiometric Unlock: FaceID / Fingerprint Active\nLedger Signing Key: Anchored to Secure Enclave\nLast Password Rotation: 14 Oct 2026'
              )
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: '#FEF3C7' }]}>
              <Key size={16} color="#D97706" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Security & Change Password</Text>
              <Text style={styles.settingSubtitle}>
                Hardware tokens & biometric authorization
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() =>
              handleOpenDialog(
                'Language & Regional',
                'Primary Language: English (India / US)\nCurrency Format: Indian Rupee (₹ Lakhs & Crores)\nTimezone: Asia/Kolkata (IST · UTC+05:30)'
              )
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: '#F0FDF4' }]}>
              <Globe size={16} color="#15803D" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Language & Regional Format</Text>
              <Text style={styles.settingSubtitle}>
                English · INR (₹) · Asia/Kolkata (UTC+05:30)
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Compliance & Platform */}
        <View style={styles.settingsGroup}>
          <Text style={styles.groupHeader}>COMPLIANCE & SYSTEM</Text>

          <Pressable
            style={styles.settingItem}
            onPress={() =>
              handleOpenDialog(
                'Help & Support Hotline',
                'Procurement Desk Support Hotline: 1800-TRUSTCHAIN (Ext 401)\nIncident Response: procurement-ops@trustchain.com\nAudit Escalations: compliance@trustchain.com'
              )
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: '#E0F2FE' }]}>
              <HelpCircle size={16} color="#0284C7" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>Help & Support Hotline</Text>
              <Text style={styles.settingSubtitle}>
                24/7 Procurement desk & emergency hotline
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>

          <Pressable
            style={styles.settingItem}
            onPress={() =>
              handleOpenDialog(
                'About TRUSTCHAIN',
                'TRUSTCHAIN Enterprise Sourcing Suite\nVersion 5.0.0 (Phase 5 Build)\nBlockchain Anchoring: Polygon Amoy Testnet\nRole: Procurement Approver\nGovernance: Multi-Signature Policy Enforced'
              )
            }
          >
            <View style={[styles.settingIcon, { backgroundColor: '#F1F5F9' }]}>
              <Info size={16} color="#475569" />
            </View>
            <View style={styles.settingTextCol}>
              <Text style={styles.settingTitle}>About TRUSTCHAIN</Text>
              <Text style={styles.settingSubtitle}>
                v5.0.0 (Phase 5) · Multi-Signature Policy Enforced
              </Text>
            </View>
            <ChevronRight size={16} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={16} color="#DC2626" />
          <Text style={styles.signOutText}>Sign Out Securely</Text>
        </Pressable>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={!!modalTitle}
        transparent
        animationType="fade"
        onRequestClose={() => setModalTitle(null)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalTitle(null)}
        >
          <Pressable style={styles.modalBox} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitleText}>{modalTitle}</Text>
            <Text style={styles.modalMsgText}>{modalMessage}</Text>
            <Pressable
              style={styles.modalOkBtn}
              onPress={() => setModalTitle(null)}
            >
              <Text style={styles.modalOkText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <ProcurementBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 95,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  userAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userMeta: {
    flex: 1,
  },
  userName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10234D',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FAF5FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#F3E8FF',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  orgText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
  },
  authorityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  authorityHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8B5CF6',
    letterSpacing: 0.6,
    marginBottom: 12,
  },
  thresholdRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  thresholdLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  thresholdAmount: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10234D',
    marginTop: 2,
  },
  levelBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DBEAFE',
  },
  levelText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2563EB',
    letterSpacing: 0.5,
  },
  thresholdNote: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridVal: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  settingsGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  groupHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
    marginBottom: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  settingIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingTextCol: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  settingSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEE2E2',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginTop: 6,
    marginBottom: 20,
  },
  signOutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 380,
  },
  modalTitleText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 10,
  },
  modalMsgText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalOkBtn: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalOkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

