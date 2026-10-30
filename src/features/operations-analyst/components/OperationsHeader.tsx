import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, User as UserIcon } from 'lucide-react-native';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import BrandLogo from '../../../components/BrandLogo';
import operationsService from '../services/operationsService';

interface OperationsHeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showGreeting?: boolean;
  userName?: string;
  rightAction?: React.ReactNode;
}

export const OperationsHeader: React.FC<OperationsHeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showGreeting = false,
  userName = 'Anishwath',
  rightAction,
}) => {
  const router = useRouter();
  const unreadCount = operationsService.getUnreadNotificationsCount();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.leftArea}>
          {showBack ? (
            <Pressable
              onPress={handleBack}
              hitSlop={10}
              style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
            >
              <ArrowLeft size={20} color="#10234D" />
            </Pressable>
          ) : (
            <View style={styles.brandRow}>
              <BrandLogo variant="dark" size="sm" layout="horizontal" />
            </View>
          )}
        </View>

        <View style={styles.rightArea}>
          {rightAction ? (
            rightAction
          ) : (
            <>
              {/* Notification Bell */}
              <Pressable
                onPress={() => router.push('/(protected)/operations-analyst/notifications')}
                hitSlop={8}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.btnPressed]}
              >
                <Bell size={20} color="#10234D" />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{unreadCount}</Text>
                  </View>
                )}
              </Pressable>

              {/* Profile Avatar */}
              <Pressable
                onPress={() => router.push('/(protected)/operations-analyst/profile')}
                hitSlop={8}
                style={({ pressed }) => [styles.avatarBtn, pressed && styles.btnPressed]}
              >
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>A</Text>
                </View>
              </Pressable>
            </>
          )}
        </View>
      </View>

      {/* Greeting or Screen Title */}
      {showGreeting ? (
        <View style={styles.textContainer}>
          <Text style={styles.greetingTitle}>Good morning, {userName}</Text>
          <Text style={styles.greetingSubtitle}>
            Here's what's happening across your supply chain today.
          </Text>
        </View>
      ) : title ? (
        <View style={styles.textContainer}>
          <Text style={styles.screenTitle}>{title}</Text>
          {subtitle && <Text style={styles.screenSubtitle}>{subtitle}</Text>}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
  },
  leftArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  avatarBtn: {
    padding: 1,
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#DBEAFE',
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPressed: {
    opacity: 0.7,
  },
  textContainer: {
    marginTop: 12,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#10234D',
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
    lineHeight: 18,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10234D',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
});

export default OperationsHeader;
