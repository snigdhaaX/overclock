import { Stack } from 'expo-router';
import React from 'react';

export default function SupplyChainManagerLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="network" />
      <Stack.Screen name="disruptions" />
      <Stack.Screen name="impact" />
      <Stack.Screen name="intelligence" />
      <Stack.Screen name="approvals" />
      <Stack.Screen name="recovery" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen name="warehouses" />
      <Stack.Screen name="warehouse-supplier" />
      <Stack.Screen name="risk-analysis" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="audit" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
