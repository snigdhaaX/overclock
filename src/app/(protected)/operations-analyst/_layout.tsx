import { Stack } from 'expo-router';
import React from 'react';

export default function OperationsAnalystLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F5F7FB' },
      }}
    >
      <Stack.Screen name="home" />
      <Stack.Screen name="disruptions" />
      <Stack.Screen name="recovery" />
      <Stack.Screen name="risk" />
      <Stack.Screen name="orders" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
