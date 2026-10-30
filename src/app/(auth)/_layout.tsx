import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="operations-analyst" />
      <Stack.Screen name="supply-chain-manager" />
      <Stack.Screen name="warehouse-operator" />
      <Stack.Screen name="procurement-approver" />
      <Stack.Screen name="administrator" />
    </Stack>
  );
}
