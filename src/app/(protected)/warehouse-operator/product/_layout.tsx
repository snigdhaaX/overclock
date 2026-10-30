import { Stack } from 'expo-router';
import React from 'react';

export default function ProductLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[sku]" />
    </Stack>
  );
}
