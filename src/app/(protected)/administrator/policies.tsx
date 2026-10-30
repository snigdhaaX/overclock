import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  Clock,
  Info,
  Lock,
  Package,
  RotateCcw,
  Save,
  Shield,
  Sliders,
  Users,
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import PolicyCard from '../../../features/administrator/components/PolicyCard';
import adminService from '../../../features/administrator/services/adminService';
import { SystemRiskPolicies } from '../../../features/administrator/types';

export default function RiskPoliciesScreen() {
  const router = useRouter();
  const [policies, setPolicies] = useState<SystemRiskPolicies>(adminService.getPolicies());
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const unsubscribe = adminService.subscribe(() => {
      setPolicies(adminService.getPolicies());
    });
    return unsubscribe;
  }, []);

  const handleSave = () => {
    Alert.alert(
      'Confirm Policy Changes',
      'Updating enterprise risk and governance policies will enforce new threshold boundaries across all active role portals. Do you want to publish these changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish Policies',
          style: 'default',
          onPress: () => {
            adminService.updatePolicies(policies);
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
          },
        },
      ]
    );
  };

  const handleResetDefaults = () => {
    Alert.alert('Reset to Defaults', 'Reset all risk and security policies to baseline demonstration defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setPolicies(adminService.getPolicies());
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <AdminHeader
        title="Global Risk Policies"
        subtitle="Operational Thresholds & Security Governance"
        rightAction={
          <Pressable
            style={({ pressed }) => [styles.saveBtn, pressed && styles.btnPressed]}
            onPress={handleSave}
          >
            <Save size={15} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.saveBtnText}>Save</Text>
          </Pressable>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Saved Success Toast */}
        {isSaved && (
          <View style={styles.savedBanner}>
            <CheckCircle size={16} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.savedText}>
              Enterprise policies updated and published to audit ledger.
            </Text>
          </View>
        )}

        {/* Audit Metadata Info */}
        <View style={styles.metadataCard}>
          <Text style={styles.metadataLabel}>Active Policy Set: Default Enterprise Baseline v2.4</Text>
          <Text style={styles.metadataText}>Last modified: {policies.updatedBy}</Text>
        </View>

        {/* Category 1: Risk Severity Thresholds */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <AlertTriangle size={16} color="#DC2626" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Disruption Severity Scoring</Text>
          </View>

          <PolicyCard
            title="Critical Risk Score Trigger"
            description="Incidents exceeding this score trigger immediate red alert banners and executive escalation."
            value={policies.criticalRiskThreshold}
            unit="/ 100"
            badgeText="Critical Tier"
            onIncrement={() =>
              setPolicies({
                ...policies,
                criticalRiskThreshold: Math.min(policies.criticalRiskThreshold + 5, 95),
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                criticalRiskThreshold: Math.max(policies.criticalRiskThreshold - 5, 70),
              })
            }
          />

          <PolicyCard
            title="High Risk Score Trigger"
            description="Corridors scoring above this threshold require Operations Analyst mitigation plan formulation."
            value={policies.highRiskThreshold}
            unit="/ 100"
            badgeText="High Tier"
            onIncrement={() =>
              setPolicies({
                ...policies,
                highRiskThreshold: Math.min(policies.highRiskThreshold + 5, 75),
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                highRiskThreshold: Math.max(policies.highRiskThreshold - 5, 50),
              })
            }
          />

          <PolicyCard
            title="Automated Disruption Escalation"
            description="Hours an unmitigated disruption may remain pending before notifying Supply Chain Managers."
            value={policies.autoEscalateDelayHours}
            unit="hours"
            onIncrement={() =>
              setPolicies({
                ...policies,
                autoEscalateDelayHours: Math.min(policies.autoEscalateDelayHours + 1, 12),
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                autoEscalateDelayHours: Math.max(policies.autoEscalateDelayHours - 1, 1),
              })
            }
          />
        </View>

        {/* Category 2: Financial & Statutory Delegation Caps */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={16} color="#2563EB" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Financial Delegation Authority</Text>
          </View>

          <PolicyCard
            title="Procurement Approver Delegation Ceiling"
            description="Statutory authority limit enforced on emergency vendor purchases (Phase 5 statutory ceiling: ₹25.0 Lakhs)."
            value={`₹${(policies.procurementApprovalLimit / 100000).toFixed(1)}L`}
            badgeText="Statutory Ceiling"
            onIncrement={() =>
              setPolicies({
                ...policies,
                procurementApprovalLimit: policies.procurementApprovalLimit + 500000,
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                procurementApprovalLimit: Math.max(
                  policies.procurementApprovalLimit - 500000,
                  1000000
                ),
              })
            }
          />

          <PolicyCard
            title="Supply Chain Manager Authorization Limit"
            description="Maximum financial recovery plan budget authorized under sole manager sign-off."
            value={`₹${(policies.managerApprovalLimit / 100000).toFixed(1)}L`}
            badgeText="Manager Authority"
            onIncrement={() =>
              setPolicies({
                ...policies,
                managerApprovalLimit: policies.managerApprovalLimit + 200000,
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                managerApprovalLimit: Math.max(policies.managerApprovalLimit - 200000, 500000),
              })
            }
          />

          <PolicyCard
            title="Dual-Executive Sign-Off Enforcement"
            description="Require co-authorization by Finance Director for requisitions exceeding ₹25,00,000."
            isBoolean
            boolValue={policies.dualExecutiveSignoffRequired}
            onBoolChange={(val) =>
              setPolicies({ ...policies, dualExecutiveSignoffRequired: val })
            }
          />
        </View>

        {/* Category 3: Vendor Compliance Policies */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Sliders size={16} color="#0D9488" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Supplier Compliance & Quality</Text>
          </View>

          <PolicyCard
            title="Minimum On-Time Delivery (OTD) SLA"
            description="Suppliers falling below this rate are automatically flagged for counterparty risk audit."
            value={policies.minimumSupplierOtdRate}
            unit="%"
            onIncrement={() =>
              setPolicies({
                ...policies,
                minimumSupplierOtdRate: Math.min(policies.minimumSupplierOtdRate + 1, 98),
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                minimumSupplierOtdRate: Math.max(policies.minimumSupplierOtdRate - 1, 70),
              })
            }
          />

          <PolicyCard
            title="Minimum Quality Rating"
            description="Minimum incoming freight acceptance score required to maintain approved vendor status."
            value={policies.minimumSupplierQualityScore}
            unit="%"
            onIncrement={() =>
              setPolicies({
                ...policies,
                minimumSupplierQualityScore: Math.min(
                  policies.minimumSupplierQualityScore + 1,
                  99
                ),
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                minimumSupplierQualityScore: Math.max(
                  policies.minimumSupplierQualityScore - 1,
                  75
                ),
              })
            }
          />
        </View>

        {/* Category 4: Security & Session Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Lock size={16} color="#475569" style={{ marginRight: 6 }} />
            <Text style={styles.sectionTitle}>Identity & Session Governance</Text>
          </View>

          <PolicyCard
            title="Session Inactivity Expiry"
            description="Minutes of idle mobile application time before requiring re-authentication."
            value={policies.sessionTimeoutMinutes}
            unit="mins"
            onIncrement={() =>
              setPolicies({
                ...policies,
                sessionTimeoutMinutes: Math.min(policies.sessionTimeoutMinutes + 15, 240),
              })
            }
            onDecrement={() =>
              setPolicies({
                ...policies,
                sessionTimeoutMinutes: Math.max(policies.sessionTimeoutMinutes - 15, 15),
              })
            }
          />

          <PolicyCard
            title="Mandatory Multi-Factor Authentication (MFA)"
            description="Enforce hardware OTP or Authenticator app for Administrator and Manager roles."
            isBoolean
            boolValue={policies.mfaRequired}
            onBoolChange={(val) => setPolicies({ ...policies, mfaRequired: val })}
          />
        </View>

        {/* Reset Actions */}
        <Pressable
          style={({ pressed }) => [styles.resetBtn, pressed && styles.btnPressed]}
          onPress={handleResetDefaults}
        >
          <RotateCcw size={14} color="#64748B" style={{ marginRight: 6 }} />
          <Text style={styles.resetBtnText}>Restore Baseline Policy Defaults</Text>
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
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  savedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#16A34A',
    flex: 1,
  },
  metadataCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 2,
  },
  metadataText: {
    fontSize: 11,
    color: '#64748B',
  },
  section: {
    marginBottom: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 6,
    marginBottom: 12,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});

