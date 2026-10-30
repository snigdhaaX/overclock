import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RequestPriority, RequestStatus, SupplierQualification } from '../types';

interface StatusBadgeProps {
  status: RequestStatus | SupplierQualification;
  size?: 'sm' | 'md';
}

export function ProcurementStatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getBadgeConfig = () => {
    switch (status) {
      case 'approved':
        return { label: 'APPROVED', bg: '#DCFCE7', text: '#15803D' };
      case 'pending':
        return { label: 'PENDING APPROVAL', bg: '#FEF3C7', text: '#B45309' };
      case 'pending_qualification':
        return { label: 'PENDING QUALIFICATION', bg: '#EDE9FE', text: '#6D28D9' };
      case 'rejected':
        return { label: 'REJECTED', bg: '#FEE2E2', text: '#B91C1C' };
      case 'changes_requested':
        return { label: 'CHANGES REQUESTED', bg: '#E0F2FE', text: '#0369A1' };
      case 'at_risk':
        return { label: 'AT RISK', bg: '#FEE2E2', text: '#B91C1C' };
      case 'under_review':
        return { label: 'UNDER REVIEW', bg: '#FEF3C7', text: '#B45309' };
      default:
        return { label: String(status).toUpperCase(), bg: '#F1F5F9', text: '#475569' };
    }
  };

  const config = getBadgeConfig();
  const isSm = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, isSm && styles.badgeSm]}>
      <Text style={[styles.badgeText, { color: config.text }, isSm && styles.badgeTextSm]}>
        {config.label}
      </Text>
    </View>
  );
}

export function ProcurementPriorityBadge({ priority }: { priority: RequestPriority }) {
  const getConfig = () => {
    switch (priority) {
      case 'Critical':
        return { bg: '#FEE2E2', text: '#991B1B' };
      case 'Urgent':
        return { bg: '#FEE2E2', text: '#DC2626' };
      case 'High':
        return { bg: '#FFEDD5', text: '#EA580C' };
      case 'Medium':
        return { bg: '#FEF3C7', text: '#D97706' };
      case 'Low':
      default:
        return { bg: '#F1F5F9', text: '#64748B' };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.priorityBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.priorityText, { color: config.text }]}>{priority.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badgeTextSm: {
    fontSize: 10,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
