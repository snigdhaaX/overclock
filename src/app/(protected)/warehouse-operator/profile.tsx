import { useRouter } from 'expo-router';
import {
  Award,
  Bell,
  Bluetooth,
  Building2,
  CheckCircle2,
  Clock,
  HardDrive,
  LogOut,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  User,
  Volume2,
  Vibrate,
  Wifi,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { WarehouseBottomNav } from '../../../features/warehouse-operator/components/WarehouseBottomNav';
import { WarehouseHeader } from '../../../features/warehouse-operator/components/WarehouseHeader';
import warehouseService from '../../../features/warehouse-operator/services/warehouseService';
import { authService } from '../../../services/auth';

export default function ProfileScreen() {
  const router = useRouter();
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [audioBeep, setAudioBeep] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [scannerType, setScannerType] = useState<'camera' | 'zebra'>('camera');

  const connection = warehouseService.getConnectionStatus();

  const handleSignOut = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out of Warehouse Terminal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          router.replace('/(public)/signin' as any);
        },
      },
    ]);
  };

  const handleToggleOffline = (val: boolean) => {
    setOfflineMode(val);
    warehouseService.toggleConnectionStatus(!val);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <WarehouseHeader
        title="Profile & Hardware"
        subtitle="Operator Credentials · Terminal Hardware Settings"
      />

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>RV</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.operatorName}>Rohit Verma</Text>
              <View style={styles.verifiedBadge}>
                <ShieldCheck size={12} color="#16A36A" />
                <Text style={styles.verifiedText}>L3 Certified</Text>
              </View>
            </View>
            <Text style={styles.roleTitle}>Certified Senior Warehouse Specialist</Text>
            <Text style={styles.empId}>Employee ID: EMP-WH-4029</Text>
          </View>
        </View>

        {/* Assigned Depot & Shift Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Assigned Operational Post</Text>
          <View style={styles.depotRow}>
            <View style={styles.depotIcon}>
              <Building2 size={20} color="#16A36A" />
            </View>
            <View style={styles.depotInfo}>
              <Text style={styles.depotName}>Mumbai Central Hub (WH-MUM)</Text>
              <Text style={styles.depotSub}>Gate Check Receiving Bay 02 & Aisle B</Text>
            </View>
          </View>

          <View style={styles.shiftStrip}>
            <Clock size={14} color="#D97706" />
            <Text style={styles.shiftText}>Shift A · 06:00 to 14:30 IST · On Active Duty</Text>
          </View>
        </View>

        {/* Operator Shift Performance Metrics */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Quality & Performance</Text>
          <View style={styles.perfGrid}>
            <View style={styles.perfItem}>
              <Text style={styles.perfVal}>24</Text>
              <Text style={styles.perfLabel}>Tasks Completed</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={[styles.perfVal, { color: '#16A36A' }]}>99.4%</Text>
              <Text style={styles.perfLabel}>Pick Accuracy</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfVal}>12</Text>
              <Text style={styles.perfLabel}>Receipts Signed</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={[styles.perfVal, { color: '#16A36A' }]}>0</Text>
              <Text style={styles.perfLabel}>Violations</Text>
            </View>
          </View>
        </View>

        {/* Scanner Hardware & Terminal Configuration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Scanner Hardware & Feedback</Text>

          {/* Scanner Mode Toggle */}
          <View style={styles.scannerModeBox}>
            <Pressable
              style={[
                styles.modeBtn,
                scannerType === 'camera' && styles.modeBtnActive,
              ]}
              onPress={() => setScannerType('camera')}
            >
              <Smartphone size={16} color={scannerType === 'camera' ? '#FFFFFF' : '#64748B'} />
              <Text
                style={[
                  styles.modeBtnText,
                  scannerType === 'camera' && styles.modeBtnTextActive,
                ]}
              >
                Built-in Camera
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.modeBtn,
                scannerType === 'zebra' && styles.modeBtnActive,
              ]}
              onPress={() => setScannerType('zebra')}
            >
              <Bluetooth size={16} color={scannerType === 'zebra' ? '#FFFFFF' : '#64748B'} />
              <Text
                style={[
                  styles.modeBtnText,
                  scannerType === 'zebra' && styles.modeBtnTextActive,
                ]}
              >
                Zebra BT Laser
              </Text>
            </Pressable>
          </View>

          {/* Toggle Switches */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Vibrate size={16} color="#10234D" />
              <View>
                <Text style={styles.settingTitle}>Haptic Scan Feedback</Text>
                <Text style={styles.settingSub}>Vibrate terminal on barcode decode</Text>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={setHapticEnabled}
              trackColor={{ false: '#CBD5E1', true: '#DCFCE7' }}
              thumbColor={hapticEnabled ? '#16A36A' : '#F8FAFC'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Volume2 size={16} color="#10234D" />
              <View>
                <Text style={styles.settingTitle}>Audio Beep Confirmation</Text>
                <Text style={styles.settingSub}>Sound audible chirp on valid SKU</Text>
              </View>
            </View>
            <Switch
              value={audioBeep}
              onValueChange={setAudioBeep}
              trackColor={{ false: '#CBD5E1', true: '#DCFCE7' }}
              thumbColor={audioBeep ? '#16A36A' : '#F8FAFC'}
            />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingLeft}>
              <Wifi size={16} color={connection.isOnline ? '#16A36A' : '#DC4545'} />
              <View>
                <Text style={styles.settingTitle}>Offline Depository Cache</Text>
                <Text style={styles.settingSub}>
                  {connection.isOnline ? 'Connected to WMS Cloud' : 'Offline (Local Cache Active)'}
                </Text>
              </View>
            </View>
            <Switch
              value={offlineMode}
              onValueChange={handleToggleOffline}
              trackColor={{ false: '#CBD5E1', true: '#FEE2E2' }}
              thumbColor={offlineMode ? '#DC4545' : '#F8FAFC'}
            />
          </View>
        </View>

        {/* Workspace & Role Navigation */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Enterprise Workspace</Text>

          <Pressable
            style={styles.switchRoleBtn}
            onPress={() => router.push('/(public)/choose-workspace' as any)}
          >
            <RotateCcw size={16} color="#10234D" />
            <Text style={styles.switchRoleText}>Switch Role / Choose Workspace</Text>
          </Pressable>
        </View>

        {/* Sign Out Button */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <LogOut size={16} color="#DC4545" />
          <Text style={styles.signOutBtnText}>Sign Out of Warehouse Terminal</Text>
        </Pressable>

        <View style={{ height: 100 }} />
      </ScrollView>

      <WarehouseBottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
    gap: 14,
    marginBottom: 14,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10234D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
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
  operatorName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A36A',
  },
  roleTitle: {
    fontSize: 12,
    color: '#64748B',
  },
  empId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A36A',
    marginTop: 3,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
    marginBottom: 12,
  },
  depotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  depotIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  depotInfo: {
    flex: 1,
  },
  depotName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  depotSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  shiftStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFBEB',
    padding: 8,
    borderRadius: 8,
  },
  shiftText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#B45309',
  },
  perfGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 12,
  },
  perfItem: {
    alignItems: 'center',
  },
  perfVal: {
    fontSize: 17,
    fontWeight: '800',
    color: '#10234D',
  },
  perfLabel: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 3,
  },
  scannerModeBox: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: '#10234D',
  },
  modeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  modeBtnTextActive: {
    color: '#FFFFFF',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  settingSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  switchRoleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingVertical: 12,
  },
  switchRoleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 4,
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC4545',
  },
});
