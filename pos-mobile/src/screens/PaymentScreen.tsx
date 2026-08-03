import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { api } from "../services/api";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { useCartStore } from "../store/cartStore";
import { usePaymentStore, type PaymentItem, type PaymentRecord } from "../store/paymentStore";
import { isOnline } from "../services/network";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import ReceiptModal from "../components/ReceiptModal";

type PaymentMethod = "CASH" | "CARD" | "MIXED";

interface PaymentScreenProps {
  navigation: any;
  route: any;
}

export default function PaymentScreen({ navigation, route }: PaymentScreenProps) {
  const order = route.params?.order;
  const orderData = route.params?.orderData;
  const split = route.params?.split;

  const { activeTableOrder, clearActiveTableOrder } = useActiveOrderStore();
  const tableName = activeTableOrder.tableName;
  const orderNumber = activeTableOrder.orderNumber;
  const clearCart = useCartStore((s) => s.clearCart);
  const addPayment = usePaymentStore((s) => s.addPayment);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [tendered, setTendered] = useState("");
  const [loading, setLoading] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);

  const subtotal = useMemo(() => {
    if (split) return Number(split.subtotal || 0);
    return Number(
      order?.subtotal ?? orderData?.subtotal ?? 0
    );
  }, [order, orderData, split]);

  const tax = useMemo(() => {
    if (split) return Number(split.tax || 0);
    return Number(
      order?.taxAmount ?? orderData?.taxAmount ?? subtotal * 0.1
    );
  }, [order, orderData, split, subtotal]);

  const total = useMemo(() => {
    if (split) return Number(split.total || 0);
    return Number(
      order?.totalAmount ?? orderData?.totalAmount ?? subtotal + tax
    );
  }, [order, orderData, split, subtotal, tax]);

  const items: PaymentItem[] = useMemo(() => {
    const source = split?.items ?? orderData?.items ?? order?.items ?? [];
    return source.map((item: any) => {
      const quantity = Number(item.quantity || 1);
      const totalPrice = Number(item.totalPrice || item.totalAmount || 0);
      const unitPrice = Number(item.unitPrice || (quantity > 0 ? totalPrice / quantity : 0));
      return {
        productId: item.productId || item.id || item.productId,
        name: item.name || item.product?.name || "Item",
        quantity,
        unitPrice,
        totalPrice,
        modifiers: item.modifiers
          ? typeof item.modifiers === "string"
            ? item.modifiers
            : item.modifiers.map((m: any) => m.name || m.nameSnapshot || m.modifierOptionId).join(", ")
          : undefined,
      };
    });
  }, [order, orderData, split]);

  const change = useMemo(() => {
    const value = parseFloat(tendered || "0");
    return selectedMethod === "CASH" ? Math.max(0, value - total) : 0;
  }, [tendered, total, selectedMethod]);

  const displayName = split?.name
    ? `${split.name} · #${orderNumber ?? order?.orderNumber ?? "N/A"}`
    : tableName || order?.table?.name || "Payment";

  const handlePay = async () => {
    if (!selectedMethod) {
      Alert.alert("Select payment method", "Please choose Cash, Card or Mixed.");
      return;
    }

    if (selectedMethod === "CASH") {
      const value = parseFloat(tendered || "0");
      if (value < total) {
        Alert.alert("Insufficient amount", "The tendered amount must cover the total.");
        return;
      }
    }

    setLoading(true);

    try {
      const orderId = order?.id;

      if (orderId && isOnline()) {
        await api.post(`/orders/${orderId}/pay`, {
          paymentMethod: selectedMethod,
          amountTendered: selectedMethod === "CASH" ? parseFloat(tendered) : undefined,
        });
      }

      const receiptNumber = `RCP-${Date.now()}`;
      const now = new Date().toISOString();
      const payment: PaymentRecord = {
        id: receiptNumber,
        createdAt: now,
        orderId: orderId || null,
        orderNumber: orderNumber ?? order?.orderNumber ?? null,
        tableName: tableName || order?.table?.name || null,
        splitName: split?.name || null,
        items,
        subtotal,
        tax,
        total,
        paymentMethod: selectedMethod,
        amountTendered: selectedMethod === "CASH" ? parseFloat(tendered || "0") : null,
        change: selectedMethod === "CASH" ? change : null,
        receiptNumber,
      };

      addPayment(payment);
      setReceiptPayment(payment);

      if (!split) {
        clearCart();
        clearActiveTableOrder();
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Payment failed. Please try again.";
      Alert.alert("Payment Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptPayment(null);
    if (split) {
      navigation.goBack();
    } else {
      navigation.navigate("Tables");
    }
  };

  const handlePrint = () => {
    Alert.alert("Print Receipt", `Receipt ${receiptPayment?.receiptNumber} sent to printer.`);
  };

  const methods: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: "CASH", label: "Cash", icon: "💵" },
    { key: "CARD", label: "Card", icon: "💳" },
    { key: "MIXED", label: "Mixed", icon: "🔀" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{split ? split.name : "Payment"}</Text>
          <Text style={styles.headerSub}>
            {displayName}
            {orderNumber != null || order?.orderNumber != null
              ? ` · #${orderNumber ?? order?.orderNumber}`
              : ""}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <View style={styles.methods}>
          {methods.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[
                styles.methodCard,
                selectedMethod === m.key && styles.methodCardSelected,
              ]}
              onPress={() => setSelectedMethod(m.key)}
              activeOpacity={0.8}
            >
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <Text
                style={[
                  styles.methodLabel,
                  selectedMethod === m.key && styles.methodLabelSelected,
                ]}
              >
                {m.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedMethod === "CASH" && (
          <View style={styles.tenderedBox}>
            <Text style={styles.sectionTitle}>Amount Tendered</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor={COLORS.muted}
              keyboardType="decimal-pad"
              value={tendered}
              onChangeText={setTendered}
            />
            {tendered ? (
              <Text style={styles.changeText}>
                Change: {formatCurrency(change)}
              </Text>
            ) : null}
          </View>
        )}

        {!split && order && (
          <TouchableOpacity
            style={styles.splitBtn}
            onPress={() => navigation.navigate("Split", { order, orderData })}
          >
            <Text style={styles.splitBtnText}>Split Bill</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payBtn,
            (!selectedMethod || loading) && styles.payBtnDisabled,
          ]}
          onPress={handlePay}
          disabled={!selectedMethod || loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>
              Confirm Payment · {formatCurrency(total)}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ReceiptModal
        visible={!!receiptPayment}
        payment={receiptPayment}
        onClose={handleCloseReceipt}
        onPrint={handlePrint}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  backText: { fontSize: 20, color: COLORS.text },
  headerCenter: { flex: 1 },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  body: { flex: 1, padding: 20 },
  totalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  totalLabel: { fontSize: 14, color: COLORS.muted, marginBottom: 8 },
  totalAmount: {
    fontSize: 40,
    fontWeight: "800",
    color: COLORS.accent,
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  methods: { flexDirection: "row", gap: 12, marginBottom: 24 },
  methodCard: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: 8,
  },
  methodCardSelected: {
    borderColor: COLORS.accent,
    backgroundColor: "rgba(249,115,22,0.08)",
  },
  methodIcon: { fontSize: 28 },
  methodLabel: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  methodLabelSelected: { color: COLORS.accent },
  tenderedBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 8,
  },
  changeText: {
    color: COLORS.success,
    fontWeight: "700",
    fontSize: 15,
    marginTop: 10,
  },
  splitBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  splitBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  payBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  payBtnDisabled: { opacity: 0.45 },
  payBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
