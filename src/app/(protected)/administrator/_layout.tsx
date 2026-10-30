import { Stack } from 'expo-router';
import React from 'react';

export default function AdministratorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="users" />
      <Stack.Screen name="roles" />
      <Stack.Screen name="organizations" />
      <Stack.Screen name="integrations" />
      <Stack.Screen name="policies" />
      <Stack.Screen name="audit" />
      <Stack.Screen name="system-health" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

