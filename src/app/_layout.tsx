import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../hooks/useAuth';

export default function RootLayout() {
  const content = (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F7FAFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="(public)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(protected)" />
    </Stack>
  );

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="auto" />
        {Platform.OS === 'web' ? (
          <View style={styles.webContainer}>
            <View style={styles.phoneFrame}>{content}</View>
          </View>
        ) : (
          content
        )}
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    backgroundColor: '#0B132B',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    minHeight: '100vh' as any,
  },
  phoneFrame: {
    width: '100%',
    maxWidth: 412,
    height: '100%',
    maxHeight: 890,
    backgroundColor: '#F7FAFF',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.5,
    shadowRadius: 32,
    elevation: 10,
  },
});
