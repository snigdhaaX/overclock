import { Stack } from 'expo-router';
import React from 'react';

export default function RecoveryLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="recommendations" />
      <Stack.Screen name="simulation" />
      <Stack.Screen name="create" />
      <Stack.Screen name="actions" />
      <Stack.Screen name="review" />
      <Stack.Screen name="execution" />
    </Stack>
  );
}
