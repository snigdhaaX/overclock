import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Check,
  ChevronRight,
  Package,
  Plane,
  Plus,
  RefreshCw,
  Truck,
  Users,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ActionCard from '../../../../features/operations-analyst/components/ActionCard';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import operationsService from '../../../../features/operations-analyst/services/operationsService';
import { RecoveryAction, RecoveryPlan } from '../../../../features/operations-analyst/types';

export default function AddRecoveryActionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const planId = params.planId || 'RP-001';

  const [plan, setPlan] = useState<RecoveryPlan>(
    () => operationsService.getRecoveryPlanById(planId) || operationsService.getRecoveryPlans()[0]
  );

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedType, setSelectedType] = useState<RecoveryAction['type']>('transfer_stock');
  const [actionTitle, setActionTitle] = useState('Intra-Warehouse Stock Transfer');
  const [sourceCarrier, setSourceCarrier] = useState('WH-BLR (Bangalore)');
  const [destination, setDestination] = useState('WH-MUM (Mumbai)');
  const [unitsScope, setUnitsScope] = useState('280 units of PRD-012');
  const [estimatedCost, setEstimatedCost] = useState('6500');
  const [leadTime, setLeadTime] = useState('18 hours');

  const availableActionTypes = [
    {
      type: 'transfer_stock' as const,
      title: 'Transfer Stock',
      icon: <Truck size={20} color="#2563EB" />,
      bg: '#EFF6FF',
      desc: 'Re-route available inventory reserve from secondary warehouse node',
    },
    {
      type: 'expedite_shipment' as const,
      title: 'Expedite Shipment',
      icon: <Plane size={20} color="#9333EA" />,
      bg: '#FAF5FF',
      desc: 'Upgrade from ocean freight to priority air freight transit corridor',
    },
    {
      type: 'alternative_supplier' as const,
      title: 'Alternative Supplier',
      icon: <Users size={20} color="#0D9488" />,
      bg: '#F0FDFA',
      desc: 'Issue emergency purchase order to qualified backup tier-1 fabricator',
    },
    {
      type: 'split_fulfilment' as const,
      title: 'Split Fulfilment',
      icon: <RefreshCw size={20} color="#EA580C" />,
      bg: '#FFF7ED',
      desc: 'Distribute delivery across multiple origin facilities or timelines',
    },
  ];

  const handleOpenAddModal = (type: RecoveryAction['type']) => {
    setSelectedType(type);
    if (type === 'transfer_stock') {
      setActionTitle('Intra-Warehouse Stock Transfer');
      setSourceCarrier('WH-BLR (Bangalore)');
      setDestination('WH-MUM (Mumbai)');
      setUnitsScope('280 units');
      setEstimatedCost('6500');
      setLeadTime('18 hours');
    } else if (type === 'expedite_shipment') {
      setActionTitle('Air Freight Expedited Transit');
      setSourceCarrier('Singapore Airlines Air Cargo');
      setDestination('Mumbai CSIA Cargo Bay');
      setUnitsScope('500 units container');
      setEstimatedCost('18500');
      setLeadTime('36 hours');
    } else if (type === 'alternative_supplier') {
      setActionTitle('Dual-Source Supplier Purchase');
      setSourceCarrier('Tech Components Ltd (Shenzhen)');
      setDestination('WH-BLR Hub');
      setUnitsScope('400 units');
      setEstimatedCost('21000');
      setLeadTime('72 hours');
    } else {
      setActionTitle('Tier-1 Split Dispatch');
      setSourceCarrier('Bangalore Logistics Bay');
      setDestination('EduTech Plant Direct');
      setUnitsScope('150 units batch 1');
      setEstimatedCost('3200');
      setLeadTime('12 hours');
    }
    setShowConfigModal(true);
  };

  const handleSaveAction = () => {
    const updatedPlan = operationsService.addActionToPlan(plan.id, {
      type: selectedType,
      title: actionTitle,
      description: `${unitsScope} routed from ${sourceCarrier} to ${destination}.`,
      sourceOrCarrier: sourceCarrier,
      destination: destination,
      unitsOrScope: unitsScope,
      estimatedCost: parseFloat(estimatedCost) || 5000,
      leadTime: leadTime,
      status: 'Configured',
    });
    setPlan({ ...updatedPlan });
    setShowConfigModal(false);
  };

  const handleRemoveAction = (actionId: string) => {
    const updatedPlan = operationsService.removeActionFromPlan(plan.id, actionId);
    setPlan({ ...updatedPlan });
  };

  const handleNext = () => {
    router.push({
      pathname: '/(protected)/operations-analyst/recovery/review',
      params: { planId: plan.id },
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Recovery Actions"
        subtitle="Step 2 of 3: Action Sequence"
        showBack
        onBack={() => router.back()}
      />

      {/* Step Indicator */}
      <View style={styles.stepIndicatorContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleDone]}>
            <Check size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>Basic Info</Text>
        </View>

        <View style={[styles.stepConnector, styles.stepConnectorActive]} />

        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepNumberActive}>2</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Actions</Text>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={styles.stepLabel}>Review</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Planned Sequence Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Configured Action Sequence ({plan.actions.length})
            </Text>
            <Text style={styles.sectionSubtitle}>
              Execution steps to be authorized and dispatched in order
            </Text>
          </View>

          {plan.actions.length === 0 ? (
            <View style={styles.emptyActionsBox}>
              <Text style={styles.emptyActionsTitle}>No Actions Added Yet</Text>
              <Text style={styles.emptyActionsSub}>
                Select an operational recovery tactic below to add it to this recovery plan.
              </Text>
            </View>
          ) : (
            plan.actions.map((act, index) => (
              <ActionCard
                key={act.id}
                action={act}
                stepNumber={index + 1}
                onRemove={() => handleRemoveAction(act.id)}
              />
            ))
          )}
        </View>

        {/* Available Action Library */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Recovery Actions</Text>
          <Text style={styles.sectionSubtitle}>
            Tap a tactic to configure operational parameters and append to sequence
          </Text>

          <View style={styles.typesGrid}>
            {availableActionTypes.map((item) => (
              <Pressable
                key={item.type}
                onPress={() => handleOpenAddModal(item.type)}
                style={({ pressed }) => [styles.actionTypeCard, pressed && styles.cardPressed]}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: item.bg }]}>
                  {item.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTypeTitle}>{item.title}</Text>
                  <Text style={styles.actionTypeDesc}>{item.desc}</Text>
                </View>
                <View style={styles.plusCircle}>
                  <Plus size={16} color="#2563EB" />
                </View>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Footer Controls */}
      <View style={styles.bottomBar}>
        <View style={styles.summaryCol}>
          <Text style={styles.summaryCount}>{plan.actions.length} Actions Configured</Text>
          <Text style={styles.summaryTotal}>
            Total: $
            {plan.actions.reduce((sum, a) => sum + a.estimatedCost, 0).toLocaleString()}
          </Text>
        </View>

        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Next: Review & Submit</Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* Action Configuration Modal */}
      <Modal visible={showConfigModal} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Configure Recovery Action</Text>
              <Pressable onPress={() => setShowConfigModal(false)} hitSlop={10}>
                <X size={20} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.field}>
                <Text style={styles.label}>Action Title</Text>
                <TextInput
                  style={styles.input}
                  value={actionTitle}
                  onChangeText={setActionTitle}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Source / Carrier</Text>
                <TextInput
                  style={styles.input}
                  value={sourceCarrier}
                  onChangeText={setSourceCarrier}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Destination Facility</Text>
                <TextInput
                  style={styles.input}
                  value={destination}
                  onChangeText={setDestination}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Quantity / Scope</Text>
                <TextInput
                  style={styles.input}
                  value={unitsScope}
                  onChangeText={setUnitsScope}
                />
              </View>

              <View style={styles.fieldRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>Estimated Cost ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={estimatedCost}
                    onChangeText={setEstimatedCost}
                    keyboardType="numeric"
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Lead Time</Text>
                  <TextInput
                    style={styles.input}
                    value={leadTime}
                    onChangeText={setLeadTime}
                  />
                </View>
              </View>

              <Pressable onPress={handleSaveAction} style={styles.modalSubmitBtn}>
                <Text style={styles.modalSubmitText}>Add to Sequence</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  stepIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2F6',
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleDone: {
    backgroundColor: '#16A34A',
  },
  stepCircleActive: {
    backgroundColor: '#2563EB',
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  stepLabelActive: {
    color: '#10234D',
    fontWeight: '700',
  },
  stepConnector: {
    width: 28,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 8,
  },
  stepConnectorActive: {
    backgroundColor: '#16A34A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 16,
  },
  emptyActionsBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
  },
  emptyActionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  emptyActionsSub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  typesGrid: {
    gap: 10,
    marginTop: 10,
  },
  actionTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  cardPressed: {
    opacity: 0.8,
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionTypeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
  },
  actionTypeDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  plusCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E6EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  summaryCol: {
    flex: 1,
  },
  summaryCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10234D',
  },
  summaryTotal: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 1,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
  },
  field: {
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#10234D',
  },
  modalSubmitBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  modalSubmitText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
