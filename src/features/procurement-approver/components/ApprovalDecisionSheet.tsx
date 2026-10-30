import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  X,
} from 'lucide-react-native';
import { ProcurementRequest } from '../types';

export type DecisionMode = 'approve' | 'reject' | 'changes';

interface DecisionSheetProps {
  visible: boolean;
  mode: DecisionMode;
  request: ProcurementRequest;
  onClose: () => void;
  onConfirm: (mode: DecisionMode, text: string) => Promise<void>;
}

export function ApprovalDecisionSheet({
  visible,
  mode,
  request,
  onClose,
  onConfirm,
}: DecisionSheetProps) {
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isApprove = mode === 'approve';
  const isReject = mode === 'reject';
  const isChanges = mode === 'changes';

  const handleAction = async () => {
    setErrorMsg(null);

    if (isReject && (!inputText || inputText.trim().length === 0)) {
      setErrorMsg('A mandatory rejection reason is required to record in the audit log.');
      return;
    }

    if (isChanges && (!inputText || inputText.trim().length === 0)) {
      setErrorMsg('Please specify the requested changes or negotiation terms.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onConfirm(mode, inputText.trim());
      setInputText('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Operation failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getHeaderDetails = () => {
    if (isApprove) {
      return {
        title: 'Confirm Procurement Approval',
        subtitle: 'Authorization will generate an immutable Purchase Order',
        icon: <CheckCircle2 size={24} color="#16A36A" />,
        actionText: 'Authorize & Issue PO',
        btnBg: '#16A36A',
      };
    }
    if (isReject) {
      return {
        title: 'Reject Procurement Request',
        subtitle: 'Mandatory reason required for supply chain audit trail',
        icon: <AlertCircle size={24} color="#DC2626" />,
        actionText: 'Confirm Rejection',
        btnBg: '#DC2626',
      };
    }
    return {
      title: 'Request Changes / Re-Quote',
      subtitle: 'Dispatch comments back to Supply Chain Manager',
      icon: <FileText size={24} color="#0284C7" />,
      actionText: 'Send Change Request',
      btnBg: '#0284C7',
    };
  };

  const config = getHeaderDetails();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <SafeAreaView style={styles.sheetWrapper}>
          <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.handle} />

            {/* Header */}
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <View style={styles.iconCircle}>{config.icon}</View>
                <View>
                  <Text style={styles.title}>{config.title}</Text>
                  <Text style={styles.subtitle}>{config.subtitle}</Text>
                </View>
              </View>
              <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Summary Box */}
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Request ID</Text>
                <Text style={styles.summaryVal}>{request.id}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Supplier</Text>
                <Text style={styles.summaryVal} numberOfLines={1}>
                  {request.supplierName}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Commitment</Text>
                <Text style={styles.summaryValCost}>
                  {request.currency}
                  {request.estimatedCost.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Input field */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>
                {isReject
                  ? 'Reason for Rejection * (Mandatory)'
                  : isChanges
                  ? 'Required Modifications * (Mandatory)'
                  : 'Approval Comments & Handover Notes (Optional)'}
              </Text>
              <TextInput
                style={styles.textInput}
                multiline
                numberOfLines={3}
                placeholder={
                  isReject
                    ? 'Enter specific justification (e.g., benchmark price exceeded, vendor unqualified, or volume mismatch)...'
                    : isChanges
                    ? 'Specify requested changes (e.g., request 10% volume discount, renegotiate shipping terms)...'
                    : 'Add special contract covenants or delivery instructions...'
                }
                placeholderTextColor="#94A3B8"
                value={inputText}
                onChangeText={setInputText}
              />
            </View>

            {/* Error Message */}
            {errorMsg && (
              <View style={styles.errorBox}>
                <AlertTriangle size={14} color="#DC2626" />
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <Pressable style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={[styles.confirmBtn, { backgroundColor: config.btnBg }]}
                onPress={handleAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmText}>{config.actionText}</Text>
                )}
              </Pressable>
            </View>
          </Pressable>
        </SafeAreaView>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetWrapper: {
    justifyContent: 'flex-end',
  },
  sheetCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#CBD5E1',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  summaryVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10234D',
  },
  summaryValCost: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10234D',
  },
  inputSection: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#10234D',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 10,
    borderRadius: 8,
    gap: 8,
    marginBottom: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  confirmBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});

export default ApprovalDecisionSheet;

