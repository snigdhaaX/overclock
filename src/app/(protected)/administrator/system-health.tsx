import { Redirect } from 'expo-router';
import React from 'react';

export default function SystemHealthRedirectScreen() {
  return <Redirect href="/(protected)/administrator/audit?tab=health" />;
}

