import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  FlatList,
  RefreshControl,
} from "react-native";
import { api } from "../services/api";
import { usePaymentStore, type PaymentRecord } from "../store/paymentStore";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import ReceiptModal from "../components/ReceiptModal";

export default function PaymentHistoryScreen({ navigation }: { navigation: any }) {
  const payments = usePaymentStore((s) => s.payments);
  const [serverPayments, setServerPayments] = useState<PaymentRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null);

  const fetchPaidOrders = async () => {
    try {
      const res = await api.get("/orders?status=PAID");
      const mapped: PaymentRecord[] = (res.data || []).map((order: any) => ({
        id: `srv_${order.id}`,
        orderId: order.id,
        orderNumber: order.orderNumber || null,
        tableName: order.table?.name || null,
        splitName: null,
        items: (order.items || []).map((item: any) => ({
          productId: item.productId || item.id,
          name: item.product?.name || item.name || "Item",
          quantity: Number(item.quantity || 1),
          unitPrice: Number(item.unitPrice || 0),
          totalPrice: Number(item.totalPrice || 0),
        })),
        subtotal: Number(order.subtotal || 0),
        tax: Number(order.taxAmount || 0),
        total: Number(order.totalAmount || 0),
        paymentMethod: order.paymentMethod || "CASH",
        amountTendered: null,
        change: null,
        receiptNumber: `RCP-${order.id}`,
        createdAt: order.createdAt || new Date().toISOString(),
      }));
      setServerPayments(mapped);
    } catch (error) {
      // Offline or server unavailable — rely on local payment store
      setServerPayments([]);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPaidOrders();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPaidOrders();
  }, []);

  const allPayments = useMemo(() => {
    const merged = [...payments, ...serverPayments];
    return merged.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [payments, serverPayments]);

  const totalSales = useMemo(
    () => allPayments.reduce((sum, p) => sum + p.total, 0),
    [allPayments]
  );

  const renderItem = ({ item }: { item: PaymentRecord }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => setSelectedPayment(item)}
      activeOpacity={0.8}
    >
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.receiptNumber}>{item.receiptNumber}</Text>
          <Text style={styles.meta}>
            {item.tableName ? `Table ${item.tableName}` : "Takeout"}
            {item.orderNumber ? ` · #${item.orderNumber}` : ""}
          </Text>
        </View>
        <View style={styles.methodPill}>
          <Text style={styles.methodText}>{item.paymentMethod}</Text>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleString()}
        </Text>
        <Text style={styles.total}>{formatCurrency(item.total)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Payment History</Text>
          <Text style={styles.subtitle}>All completed payments</Text>
        </View>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{allPayments.length}</Text>
          <Text style={styles.summaryLabel}>Payments</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{formatCurrency(totalSales)}</Text>
          <Text style={styles.summaryLabel}>Total Sales</Text>
        </View>
      </View>

      <FlatList
        data={allPayments}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No payments yet</Text>
            <Text style={styles.emptySubtitle}>
              Completed payments will appear here.
            </Text>
          </View>
        }
        renderItem={renderItem}
      />

      <ReceiptModal
        visible={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
  },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  subtitle: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  summary: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryValue: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  summaryLabel: { fontSize: 12, color: COLORS.muted, marginTop: 2, fontWeight: "700" },
  listContent: { padding: 16, paddingBottom: 28 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  receiptNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.text,
  },
  meta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  methodPill: {
    backgroundColor: COLORS.accentDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  methodText: {
    color: COLORS.accentLight,
    fontSize: 11,
    fontWeight: "800",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  date: {
    fontSize: 12,
    color: COLORS.muted,
  },
  total: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.accent,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  emptySubtitle: {
    marginTop: 6,
    color: COLORS.muted,
    textAlign: "center",
  },
});
