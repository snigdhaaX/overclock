import { Stack } from 'expo-router';
import React from 'react';

export default function WarehouseOperatorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="tasks" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="product" />
      <Stack.Screen name="receiving" />
      <Stack.Screen name="damage-report" />
      <Stack.Screen name="inventory" />
      <Stack.Screen name="stock-transfer" />
      <Stack.Screen name="outgoing-shipments" />
      <Stack.Screen name="incoming-shipments" />
      <Stack.Screen name="warehouse-map" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
