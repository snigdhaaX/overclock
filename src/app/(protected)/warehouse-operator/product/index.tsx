import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  MapPin,
  Package,
  QrCode,
  Search,
  X,
} from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import warehouseService from '../../../../features/warehouse-operator/services/warehouseService';
import { WarehouseProduct } from '../../../../features/warehouse-operator/types';

export default function ProductIndexScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const products = warehouseService.getWarehouseInventory('all', search);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#10234D" />
        </Pressable>
        <Text style={styles.headerTitle}>Product Catalog</Text>
        <Pressable
          style={styles.scanBtn}
          onPress={() => router.push('/(protected)/warehouse-operator/scan' as any)}
        >
          <QrCode size={18} color="#16A36A" />
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <Search size={16} color="#64748B" />
        <TextInput
          style={styles.input}
          placeholder="Search by SKU, Product Name, Category..."
          placeholderTextColor="#94A3B8"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <X size={16} color="#64748B" />
          </Pressable>
        )}
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {products.map((p) => (
          <Pressable
            key={p.sku}
            style={styles.card}
            onPress={() => router.push(`/(protected)/warehouse-operator/product/${p.sku}` as any)}
          >
            <View style={styles.cardLeft}>
              <View style={styles.iconBox}>
                <Package size={20} color="#16A36A" />
              </View>
              <View style={styles.info}>
                <Text style={styles.skuText}>{p.sku}</Text>
                <Text style={styles.nameText}>{p.name}</Text>
                <Text style={styles.categoryText}>{p.category}</Text>
              </View>
            </View>

            <View style={styles.cardRight}>
              <Text style={styles.stockVal}>{p.availableQuantity}</Text>
              <Text style={styles.stockLabel}>units available</Text>
              <ArrowRight size={14} color="#CBD5E1" style={{ marginTop: 4 }} />
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E6EAF1',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  scanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E6EAF1',
    gap: 8,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#10234D',
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E6EAF1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  skuText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A36A',
  },
  nameText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10234D',
    marginTop: 1,
  },
  categoryText: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  stockVal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10234D',
  },
  stockLabel: {
    fontSize: 10,
    color: '#64748B',
  },
});
