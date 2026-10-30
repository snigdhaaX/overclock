import { useRouter } from 'expo-router';
import { AlertCircle, Calendar, Check, ChevronRight, FileText, Layers } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FormInput from '../../../../components/FormInput';
import OperationsHeader from '../../../../features/operations-analyst/components/OperationsHeader';
import operationsService from '../../../../features/operations-analyst/services/operationsService';

export default function CreateRecoveryPlanScreen() {
  const router = useRouter();

  const [planName, setPlanName] = useState('Plan A — Stock Transfer from WH-BLR');
  const [relatedDisruption, setRelatedDisruption] = useState('SHP-101');
  const [description, setDescription] = useState(
    'Transfer 280 units of PRD-012 from Bangalore facility via priority road transit to cover immediate delivery commitments.'
  );
  const [targetDate, setTargetDate] = useState('2026-10-26');
  const [priority, setPriority] = useState<'Critical' | 'High' | 'Medium'>('High');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!planName.trim()) errs.planName = 'Recovery plan name is required';
    if (!relatedDisruption.trim()) errs.relatedDisruption = 'Related disruption reference is required';
    if (!description.trim()) errs.description = 'Plan strategy description is required';
    if (!targetDate.trim()) errs.targetDate = 'Target completion date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;

    // Save draft plan in service
    const draft = operationsService.saveDraftPlan({
      planName,
      relatedDisruptionId: relatedDisruption,
      description,
      targetCompletionDate: targetDate,
      priority,
    });

    router.push({
      pathname: '/(protected)/operations-analyst/recovery/actions',
      params: { planId: draft.id },
    });
  };

  const handleSaveDraft = () => {
    if (!planName.trim()) {
      setErrors({ planName: 'Please provide at least a plan title to save a draft' });
      return;
    }
    const draft = operationsService.saveDraftPlan({
      planName,
      relatedDisruptionId: relatedDisruption,
      description,
      targetCompletionDate: targetDate,
      priority,
    });
    Alert.alert('Draft Saved', `Recovery plan "${draft.planName}" saved to drafts.`, [
      { text: 'OK', onPress: () => router.push('/(protected)/operations-analyst/recovery/recommendations') },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <OperationsHeader
        title="Create Recovery Plan"
        subtitle="Step 1 of 3: Strategy Baseline"
        showBack
        onBack={() => router.back()}
      />

      {/* Step Indicator Progress Bar */}
      <View style={styles.stepIndicatorContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepCircle, styles.stepCircleActive]}>
            <Text style={styles.stepNumberActive}>1</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Basic Info</Text>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <Text style={styles.stepLabel}>Actions</Text>
        </View>

        <View style={styles.stepConnector} />

        <View style={styles.stepItem}>
          <View style={styles.stepCircle}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={styles.stepLabel}>Review</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Form Card */}
          <View style={styles.card}>
            <Text style={styles.formTitle}>Plan Configuration</Text>

            <FormInput
              label="Recovery Plan Name *"
              value={planName}
              onChangeText={(text) => {
                setPlanName(text);
                if (errors.planName) setErrors({ ...errors, planName: '' });
              }}
              placeholder="e.g. Plan A — Stock Transfer from WH-BLR"
              error={errors.planName}
            />

            <FormInput
              label="Related Disruption ID *"
              value={relatedDisruption}
              onChangeText={(text) => {
                setRelatedDisruption(text);
                if (errors.relatedDisruption) setErrors({ ...errors, relatedDisruption: '' });
              }}
              placeholder="e.g. SHP-101"
              error={errors.relatedDisruption}
            />

            {/* Description textarea */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Operational Strategy & Rationale *</Text>
              <TextInput
                style={[styles.textArea, errors.description ? styles.inputError : null]}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={(text) => {
                  setDescription(text);
                  if (errors.description) setErrors({ ...errors, description: '' });
                }}
                placeholder="Describe how this strategy mitigates downstream customer SLA risk..."
                placeholderTextColor="#94A3B8"
              />
              {errors.description && (
                <Text style={styles.errorText}>{errors.description}</Text>
              )}
            </View>

            <FormInput
              label="Target Completion Date (YYYY-MM-DD) *"
              value={targetDate}
              onChangeText={(text) => {
                setTargetDate(text);
                if (errors.targetDate) setErrors({ ...errors, targetDate: '' });
              }}
              placeholder="2026-10-26"
              error={errors.targetDate}
            />

            {/* Priority Selector */}
            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Plan Priority Level</Text>
              <View style={styles.priorityRow}>
                {(['Critical', 'High', 'Medium'] as const).map((p) => {
                  const isSelected = priority === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setPriority(p)}
                      style={[
                        styles.priorityChip,
                        isSelected && styles.priorityChipSelected,
                      ]}
                    >
                      {isSelected && (
                        <Check size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                      )}
                      <Text
                        style={[
                          styles.priorityText,
                          isSelected && styles.priorityTextSelected,
                        ]}
                      >
                        {p}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer Controls */}
      <View style={styles.bottomBar}>
        <Pressable onPress={handleSaveDraft} style={styles.saveDraftBtn}>
          <Text style={styles.saveDraftText}>Save Draft</Text>
        </Pressable>

        <Pressable onPress={handleNext} style={styles.nextBtn}>
          <Text style={styles.nextBtnText}>Next: Add Actions</Text>
          <ChevronRight size={16} color="#FFFFFF" />
        </Pressable>
      </View>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10234D',
    marginBottom: 16,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#10234D',
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priorityChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  priorityChipSelected: {
    backgroundColor: '#10234D',
    borderColor: '#10234D',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  priorityTextSelected: {
    color: '#FFFFFF',
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 8,
  },
  saveDraftBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
  },
  saveDraftText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  nextBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 13,
  },
  nextBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 4,
  },
});
