import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Shield, User } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../../../components/BrandLogo';

interface AdminHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {/* Top Bar with Brand & Quick Actions */}
      <View style={styles.topBar}>
        <View style={styles.leftContainer}>
          {showBack ? (
            <Pressable
              onPress={onBack || (() => router.back())}
              style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
              hitSlop={10}
            >
              <ArrowLeft size={20} color="#1E293B" />
            </Pressable>
          ) : (
            <View style={styles.brandRow}>
              <BrandLogo variant="dark" size="sm" layout="horizontal" />
              <View style={styles.roleTag}>
                <Shield size={12} color="#475569" style={{ marginRight: 4 }} />
                <Text style={styles.roleTagText}>ADMIN</Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.rightContainer}>
          {rightAction ? (
            rightAction
          ) : (
            <View style={styles.actionButtons}>
              <Pressable
                style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
                onPress={() => router.push('/(protected)/administrator/audit')}
              >
                <Bell size={18} color="#475569" />
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.profileBtn, pressed && styles.btnPressed]}
                onPress={() => router.push('/(protected)/administrator/profile')}
              >
                <User size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          )}
        </View>
      </View>

      {/* Screen Title & Subtitle */}
      {title && (
        <View style={styles.titleSection}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 40,
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
    letterSpacing: 0.5,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  profileBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  titleSection: {
    marginTop: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
});

export default AdminHeader;

