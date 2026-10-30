import { usePathname, useRouter } from 'expo-router';
import {
  AlertCircle,
  Home,
  LayoutGrid,
  MoreHorizontal,
  Package,
  Sparkles,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MoreOptionsSheet from './MoreOptionsSheet';

export type NavTabKey = 'home' | 'disruptions' | 'recovery' | 'orders' | 'more';

interface OperationsBottomNavProps {
  activeTab?: NavTabKey;
}

export const OperationsBottomNav: React.FC<OperationsBottomNavProps> = ({ activeTab }) => {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const [showMoreSheet, setShowMoreSheet] = useState(false);

  // Derive active tab from pathname if not explicitly provided
  const currentTab: NavTabKey =
    activeTab ||
    (pathname.includes('/disruptions')
      ? 'disruptions'
      : pathname.includes('/recovery')
      ? 'recovery'
      : pathname.includes('/orders')
      ? 'orders'
      : pathname.includes('/risk') ||
        pathname.includes('/notifications') ||
        pathname.includes('/profile')
      ? 'more'
      : 'home');

  const handleTabPress = (key: NavTabKey) => {
    switch (key) {
      case 'home':
        router.push('/(protected)/operations-analyst/home');
        break;
      case 'disruptions':
        router.push('/(protected)/operations-analyst/disruptions');
        break;
      case 'recovery':
        router.push('/(protected)/operations-analyst/recovery/recommendations');
        break;
      case 'orders':
        router.push('/(protected)/operations-analyst/orders');
        break;
      case 'more':
        setShowMoreSheet(true);
        break;
    }
  };

  const navItems = [
    {
      key: 'home' as NavTabKey,
      label: 'Home',
      icon: (active: boolean) => (
        <Home size={22} color={active ? '#2563EB' : '#94A3B8'} />
      ),
    },
    {
      key: 'disruptions' as NavTabKey,
      label: 'Disruptions',
      icon: (active: boolean) => (
        <AlertCircle size={22} color={active ? '#2563EB' : '#94A3B8'} />
      ),
    },
    {
      key: 'recovery' as NavTabKey,
      label: 'Recovery',
      icon: (active: boolean) => (
        <Sparkles size={22} color={active ? '#2563EB' : '#94A3B8'} />
      ),
    },
    {
      key: 'orders' as NavTabKey,
      label: 'Orders',
      icon: (active: boolean) => (
        <Package size={22} color={active ? '#2563EB' : '#94A3B8'} />
      ),
    },
    {
      key: 'more' as NavTabKey,
      label: 'More',
      icon: (active: boolean) => (
        <MoreHorizontal size={22} color={active ? '#2563EB' : '#94A3B8'} />
      ),
    },
  ];

  return (
    <>
      <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        {navItems.map((item) => {
          const isActive = currentTab === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => handleTabPress(item.key)}
              hitSlop={8}
              style={({ pressed }) => [styles.navItem, pressed && styles.itemPressed]}
            >
              <View style={[styles.iconWrapper, isActive && styles.iconActive]}>
                {item.icon(isActive)}
              </View>
              <Text style={[styles.navLabel, isActive && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <MoreOptionsSheet
        visible={showMoreSheet}
        onClose={() => setShowMoreSheet(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    paddingTop: 8,
    paddingHorizontal: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    zIndex: 100,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  iconActive: {
    transform: [{ scale: 1.05 }],
  },
  navLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.1,
  },
  labelActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  itemPressed: {
    opacity: 0.7,
  },
});

export default OperationsBottomNav;
