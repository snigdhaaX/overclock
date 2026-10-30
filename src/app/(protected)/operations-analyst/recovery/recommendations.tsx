import { useRouter } from 'expo-router';
import { FilePlus2, Gauge, Info, Sparkles } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OperationsBottomNav from '../../../../features/operations-analyst/components/OperationsBottomNav';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import RecoveryPlanCard from '../../../../features/operations-analyst/components/RecoveryPlanCard';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { RecoveryPlan } from '../../../../features/operations-analyst/types';
import { useSyncVersion } from '@/services/backendSync';

export default function RecoveryRecommendationsScreen() {
  const router = useRouter();
  useSyncVersion();
  const [activeTab, setActiveTab] = useState<'all' | 'ai' | 'alternative'>('all');
  const [selectedPlanId, setSelectedPlanId] = useState<string>(() => operationsService.getRecoveryPlans()[0]?.id ?? 'RP-001');

  const plans = operationsService.getRecoveryPlans(activeTab);

  const handleSimulate = (plan: RecoveryPlan) => {
    setSelectedPlanId(plan.id);
    router.push({
      pathname: '/(protected)/operations-analyst/recovery/simulation',
      params: { planId: plan.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Recovery Strategies"
        subtitle="AI generated mitigation & rerouting alternatives"
        rightAction={
          <Pressable
            onPress={() => router.push('/(protected)/operations-analyst/recovery/create')}
            style={styles.createBtn}
          >
            <FilePlus2 size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>New Plan</Text>
          </Pressable>
        }
      />

      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable
          onPress={() => setActiveTab('all')}
          style={[styles.tabBtn, activeTab === 'all' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All Strategies ({operationsService.getRecoveryPlans().length})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('ai')}
          style={[styles.tabBtn, activeTab === 'ai' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'ai' && styles.tabTextActive]}>
            AI Optimal
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('alternative')}
          style={[styles.tabBtn, activeTab === 'alternative' && styles.tabBtnActive]}
        >
          <Text style={[styles.tabText, activeTab === 'alternative' && styles.tabTextActive]}>
            Alternative
          </Text>
        </Pressable>
      </View>

      {/* Governance Notice */}
      <View style={styles.noticeBanner}>
        <Info size={16} color="#2563EB" style={{ marginRight: 8, marginTop: 1 }} />
        <Text style={styles.noticeText}>
            Ranked suggestions, checked against free stock, capacity and deadlines. A manager must approve a plan before it runs.
        </Text>
      </View>

      <FlatList
        data={plans}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <RecoveryPlanCard
            plan={item}
            isSelected={selectedPlanId === item.id}
            onSelect={() => setSelectedPlanId(item.id)}
            onSimulate={() => handleSimulate(item)}
            onViewDetails={() => handleSimulate(item)}
          />
        )}
      />

      <OperationsBottomNav activeTab="recovery" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    paddingHorizontal: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: '#2563EB',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },
  noticeBanner: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  noticeText: {
    flex: 1,
    fontSize: 11,
    color: '#1E40AF',
    lineHeight: 16,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 110,
  },
});
