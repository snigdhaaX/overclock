import * as DocumentPicker from 'expo-document-picker';
import { CheckCircle2, FileUp, XCircle } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AdminBottomNav from '../../../features/administrator/components/AdminBottomNav';
import AdminHeader from '../../../features/administrator/components/AdminHeader';
import { apiRequest } from '../../../services/apiClient';
import { syncNow } from '../../../services/backendSync';

const ENTITIES = [
  { key: 'suppliers', label: 'Suppliers', columns: 'code, name, country, category' },
  { key: 'products', label: 'Products', columns: 'sku, name, category' },
  { key: 'warehouses', label: 'Warehouses', columns: 'code, name, latitude, longitude' },
  { key: 'carriers', label: 'Carriers', columns: 'code, name, capacity' },
  { key: 'inventory', label: 'Inventory', columns: 'warehouse_code, sku, on_hand, reserved, safety' },
  { key: 'shipments', label: 'Shipments', columns: 'shipment_code, supplier_code, carrier_code, warehouse_code, sku, quantity, eta, origin, route_risk, weather_severity, customs_hours, freight_cost' },
  { key: 'orders', label: 'Orders', columns: 'order_code, customer, sku, quantity, required_date, priority, and shipment_code or warehouse_code' },
];

type Mode = 'PARTIAL' | 'STRICT';

interface ImportError {
  row: number;
  field: string | null;
  code: string;
  message: string;
}

interface ImportJob {
  id: string;
  entityType: string;
  fileName: string;
  mode: Mode;
  status: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  mapping: Record<string, string>;
  preview: Record<string, unknown>[];
  errors: ImportError[];
  canConfirm: boolean;
}

interface ImportSummary {
  id: string;
  entityType: string;
  fileName: string;
  status: string;
  acceptedRows: number;
  rejectedRows: number;
  totalRows: number;
}

export default function DataImportScreen() {
  const [entity, setEntity] = useState(ENTITIES[0].key);
  const [mode, setMode] = useState<Mode>('PARTIAL');
  const [job, setJob] = useState<ImportJob | null>(null);
  const [history, setHistory] = useState<ImportSummary[]>([]);
  const [busy, setBusy] = useState<'upload' | 'confirm' | null>(null);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      setHistory(await apiRequest<ImportSummary[]>('/imports'));
    } catch {
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    apiRequest<ImportSummary[]>('/imports').then(setHistory).catch(() => setHistory([]));
  }, []);

  const handlePick = async () => {
    setError('');
    const picked = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/comma-separated-values', 'application/json', 'text/plain', 'application/vnd.ms-excel'], copyToCacheDirectory: true });
    if (picked.canceled) return;
    const file = picked.assets[0];
    const format = file.name.toLowerCase().endsWith('.json') ? 'json' : file.name.toLowerCase().endsWith('.csv') ? 'csv' : null;
    if (!format) {
      setError('Choose a .csv or .json file.');
      return;
    }
    setBusy('upload');
    setJob(null);
    try {
      const content = await (await fetch(file.uri)).text();
      setJob(await apiRequest<ImportJob>(`/imports/${format}`, { method: 'POST', body: { entity_type: entity, file_name: file.name, content, mode }, timeoutMs: 60000 }));
      await loadHistory();
    } catch (err: any) {
      setError(err?.message ?? 'This file could not be uploaded.');
    } finally {
      setBusy(null);
    }
  };

  const handleConfirm = async () => {
    if (!job) return;
    setError('');
    setBusy('confirm');
    try {
      setJob(await apiRequest<ImportJob>(`/imports/${job.id}/confirm`, { method: 'POST', timeoutMs: 60000 }));
      await Promise.all([loadHistory(), syncNow()]);
    } catch (err: any) {
      setError(err?.message ?? 'This import could not be completed.');
    } finally {
      setBusy(null);
    }
  };

  const selected = ENTITIES.find((e) => e.key === entity) ?? ENTITIES[0];
  const completed = job?.status === 'COMPLETED';

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <AdminHeader title="Data Import" subtitle="Upload CSV or JSON for every role to use" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. What are you importing?</Text>
          <View style={styles.chips}>
            {ENTITIES.map((e) => (
              <Pressable key={e.key} onPress={() => setEntity(e.key)} style={[styles.chip, entity === e.key && styles.chipOn]} accessibilityRole="button">
                <Text style={[styles.chipText, entity === e.key && styles.chipTextOn]}>{e.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>Columns: {selected.columns}</Text>

          <Text style={[styles.cardTitle, styles.spaced]}>2. If some rows are invalid</Text>
          <View style={styles.chips}>
            <Pressable onPress={() => setMode('PARTIAL')} style={[styles.chip, mode === 'PARTIAL' && styles.chipOn]} accessibilityRole="button">
              <Text style={[styles.chipText, mode === 'PARTIAL' && styles.chipTextOn]}>Import the valid rows</Text>
            </Pressable>
            <Pressable onPress={() => setMode('STRICT')} style={[styles.chip, mode === 'STRICT' && styles.chipOn]} accessibilityRole="button">
              <Text style={[styles.chipText, mode === 'STRICT' && styles.chipTextOn]}>Reject the whole file</Text>
            </Pressable>
          </View>

          <Pressable onPress={handlePick} disabled={busy !== null} style={[styles.primary, styles.spaced]} accessibilityRole="button">
            {busy === 'upload' ? <ActivityIndicator color="#FFFFFF" /> : (
              <>
                <FileUp size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.primaryText}>Choose CSV or JSON file</Text>
              </>
            )}
          </Pressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {job ? (
          <View style={styles.card}>
            <View style={styles.reportHeader}>
              {completed ? <CheckCircle2 size={20} color="#16A34A" /> : job.status === 'REJECTED' ? <XCircle size={20} color="#DC2626" /> : <FileUp size={20} color="#2563EB" />}
              <Text style={styles.cardTitle}>{completed ? 'Import complete' : job.status === 'REJECTED' ? 'Import rejected' : 'Check before importing'}</Text>
            </View>
            <Text style={styles.fileName}>{job.fileName} · {job.entityType}</Text>
            <View style={styles.counts}>
              <Count label="Rows" value={job.totalRows} />
              <Count label={completed ? 'Imported' : 'Valid'} value={job.acceptedRows} tone="#16A34A" />
              <Count label="Rejected" value={job.rejectedRows} tone={job.rejectedRows ? '#DC2626' : undefined} />
            </View>

            <Text style={styles.sectionLabel}>Columns matched</Text>
            <Text style={styles.hint}>{Object.entries(job.mapping).map(([field, column]) => (field === column ? field : `${field} ← ${column}`)).join(', ')}</Text>

            {job.preview.length > 0 && !completed ? (
              <>
                <Text style={styles.sectionLabel}>Valid rows (first {job.preview.length})</Text>
                {job.preview.slice(0, 5).map((row) => (
                  <Text key={String(row.row)} style={styles.previewRow} numberOfLines={2}>
                    Row {String(row.row)}: {Object.entries(row).filter(([k]) => k !== 'row').map(([, v]) => String(v)).join(' · ')}
                  </Text>
                ))}
              </>
            ) : null}

            {job.errors.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Rejected rows</Text>
                {job.errors.map((e, index) => (
                  <Text key={`${e.row}-${e.field}-${index}`} style={styles.errorRow}>Row {e.row}: {e.message}</Text>
                ))}
              </>
            ) : null}

            {job.status === 'VALIDATED' ? (
              <>
                {job.mode === 'STRICT' && job.rejectedRows > 0 ? <Text style={styles.error}>Strict mode: fix the rejected rows and upload again.</Text> : null}
                <Pressable onPress={handleConfirm} disabled={!job.canConfirm || busy !== null} style={[styles.primary, styles.spaced, !job.canConfirm && styles.disabled]} accessibilityRole="button">
                  {busy === 'confirm' ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Confirm import of {job.acceptedRows} rows</Text>}
                </Pressable>
              </>
            ) : null}
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent imports</Text>
            {history.slice(0, 8).map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyName} numberOfLines={1}>{h.fileName}</Text>
                  <Text style={styles.hint}>{h.entityType} · {h.acceptedRows} valid, {h.rejectedRows} rejected</Text>
                </View>
                <Text style={[styles.status, h.status === 'COMPLETED' ? styles.statusGood : h.status === 'REJECTED' ? styles.statusBad : styles.statusWait]}>{h.status}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
      <AdminBottomNav />
    </SafeAreaView>
  );
}

const Count: React.FC<{ label: string; value: number; tone?: string }> = ({ label, value, tone }) => (
  <View style={styles.count}>
    <Text style={[styles.countValue, tone ? { color: tone } : null]}>{value}</Text>
    <Text style={styles.countLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F5F7FB' },
  scroll: { padding: 16, paddingBottom: 110, gap: 14 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#E6EAF1', padding: 14, gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#10234D' },
  spaced: { marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 10, minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: '#D5DCE8', backgroundColor: '#FFFFFF' },
  chipOn: { backgroundColor: '#10234D', borderColor: '#10234D' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#334155' },
  chipTextOn: { color: '#FFFFFF' },
  hint: { fontSize: 12, lineHeight: 17, color: '#64748B' },
  primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 48, borderRadius: 12, backgroundColor: '#2563EB' },
  primaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  disabled: { opacity: 0.45 },
  error: { fontSize: 13, lineHeight: 18, color: '#B91C1C', fontWeight: '600' },
  reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fileName: { fontSize: 12, color: '#475569' },
  counts: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  count: { flex: 1, backgroundColor: '#F5F7FB', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  countValue: { fontSize: 20, fontWeight: '800', color: '#10234D' },
  countLabel: { fontSize: 11, color: '#64748B' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#10234D', marginTop: 6 },
  previewRow: { fontSize: 12, lineHeight: 17, color: '#334155' },
  errorRow: { fontSize: 12, lineHeight: 17, color: '#B91C1C' },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F4F9' },
  historyName: { fontSize: 13, fontWeight: '600', color: '#10234D' },
  status: { fontSize: 10, fontWeight: '800', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, overflow: 'hidden' },
  statusGood: { backgroundColor: '#DCFCE7', color: '#166534' },
  statusBad: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  statusWait: { backgroundColor: '#FEF3C7', color: '#92400E' },
});
