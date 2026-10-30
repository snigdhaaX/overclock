import { useRouter } from 'expo-router';
import { Bell, ChevronLeft, LogOut, ShieldCheck } from 'lucide-react-native';
import React from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../../../components/BrandLogo';
import useAuth from '../../../hooks/useAuth';

interface ManagerHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLogo?: boolean;
  greeting?: string;
}

export const ManagerHeader: React.FC<ManagerHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showLogo = true,
  greeting,
}) => {
  const router = useRouter();
  const { logout, user } = useAuth();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === 'web') {
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm('Are you sure you want to terminate your active Supply Chain Manager session?')
        : true;
      if (ok) {
        logout().then(() => {
          router.replace('/(public)/signin');
        });
      }
      return;
    }
    Alert.alert(
      'Sign Out of TRUSTCHAIN',
      'Are you sure you want to terminate your active Supply Chain Manager session?',
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

  const avatarInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'DV';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
              hitSlop={8}
            >
              <ChevronLeft size={22} color="#10234D" />
            </Pressable>
          ) : showLogo ? (
            <BrandLogo variant="dark" size="sm" layout="horizontal" />
          ) : null}
        </View>

        <View style={styles.rightGroup}>
          {/* Manager Role Badge */}
          <View style={styles.roleBadge}>
            <ShieldCheck size={12} color="#0D9488" style={{ marginRight: 4 }} />
            <Text style={styles.roleBadgeText}>Manager</Text>
          </View>

          {/* Notifications Button */}
          <Pressable
            onPress={() => router.push('/(protected)/supply-chain-manager/profile' as any)}
            style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed]}
            hitSlop={8}
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#10234D" />
            <View style={styles.badgeDot}>
              <Text style={styles.badgeDotText}>3</Text>
            </View>
          </Pressable>

          {/* Profile Shortcut */}
          <Pressable
            onPress={() => router.push('/(protected)/supply-chain-manager/profile' as any)}
            style={styles.avatarButton}
            accessibilityLabel="Profile"
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{avatarInitials}</Text>
            </View>
          </Pressable>

          {/* Direct Sign Out Button */}
          <Pressable
            onPress={handleSignOut}
            style={({ pressed }) => [styles.settingsButton, styles.logoutButton, pressed && styles.iconButtonPressed]}
            hitSlop={8}
            accessibilityLabel="Sign out"
          >
            <LogOut size={16} color="#DC2626" />
          </Pressable>
        </View>
      </View>

      {(title || greeting) && (
        <View style={styles.titleSection}>
          {greeting && <Text style={styles.greetingText}>{greeting}</Text>}
          {title && <Text style={styles.screenTitle}>{title}</Text>}
          {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDFA',
    borderWidth: 1,
    borderColor: '#CCFBF1',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0D9488',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F5F7FB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconButtonPressed: {
    backgroundColor: '#E2E8F0',
  },
  badgeDot: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#DC2626',
    borderRadius: 7,
    minWidth: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeDotText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarButton: {
    marginLeft: 2,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0D9488',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CCFBF1',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  settingsButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  titleSection: {
    marginTop: 10,
  },
  greetingText: {
    fontSize: 13,
    color: '#0D9488',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 18,
  },
});

export default ManagerHeader;
