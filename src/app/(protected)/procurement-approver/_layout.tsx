import { Stack } from 'expo-router';
import React from 'react';

export default function ProcurementApproverLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="requests" />
      <Stack.Screen name="suppliers" />
      <Stack.Screen name="purchase-orders" />
      <Stack.Screen name="risk-analysis" />
      <Stack.Screen name="approval-history" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}

