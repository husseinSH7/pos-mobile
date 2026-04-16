import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { api } from "../services/api";
import { useCartStore } from "../store/cartStore";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";

type PaymentMethod = "CASH" | "CARD" | "MIXED";

export default function PaymentScreen({ navigation }: any) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [loading, setLoading] = useState(false);

  const { total, clearCart } = useCartStore();
  const { orderId, tableName, orderNumber, clearActiveTableOrder } =
    useActiveOrderStore();

  const handlePay = async () => {
    if (!selectedMethod || !orderId) return;

    setLoading(true);
    try {
      await api.post(`/orders/${orderId}/pay`, {
        paymentMethod: selectedMethod,
      });

      clearCart();
      clearActiveTableOrder();
      navigation.navigate("Tables");
    } catch (error: any) {
      const message = error?.response?.data?.message || "Payment failed. Try again.";
      Alert.alert("Payment Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const methods: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: "CASH", label: "Cash", icon: "💵" },
    { key: "CARD", label: "Card", icon: "💳" },
    { key: "MIXED", label: "Mixed", icon: "🔀" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Payment</Text>
          {tableName && (
            <Text style={styles.headerSub}>
              {tableName}
              {orderNumber != null ? ` · #${orderNumber}` : ""}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.body}>
        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total())}</Text>
        </View>

        {/* Payment Method */}
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
      </View>

      {/* Pay Button */}
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
              Confirm Payment · {formatCurrency(total())}
            </Text>
          )}
        </TouchableOpacity>
      </View>
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
  body: { flex: 1, padding: 20, gap: 24 },
  totalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
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
  },
  methods: { flexDirection: "row", gap: 12 },
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
    backgroundColor: "rgba(99,102,241,0.08)",
  },
  methodIcon: { fontSize: 28 },
  methodLabel: { fontSize: 14, fontWeight: "600", color: COLORS.muted },
  methodLabelSelected: { color: COLORS.accent },
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