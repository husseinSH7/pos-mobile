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
import { printerService, type ReceiptData } from "../services/printer";

type PaymentMethod = "CASH" | "CARD" | "GIFT_CARD" | "MIXED";

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
  const [tipAmount, setTipAmount] = useState("");
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<PaymentRecord | null>(null);
  const [giftCardNumber, setGiftCardNumber] = useState("");
  const [giftCardBalance, setGiftCardBalance] = useState<number | null>(null);
  const [giftCardLoading, setGiftCardLoading] = useState(false);

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

  const tipValue = useMemo(() => {
    const tip = parseFloat(tipAmount) || 0;
    return tip;
  }, [tipAmount]);

  const finalTotal = useMemo(() => {
    return total + tipValue;
  }, [total, tipValue]);

  const items: PaymentItem[] = useMemo(() => {
    const source = split?.items ?? orderData?.items ?? order?.items ?? [];
    return source.map((item: any) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(
        item.unitPrice || item.product?.price || (item.totalPrice ? item.totalPrice / quantity : 0) || 0
      );
      const totalPrice = Number(item.totalPrice || item.totalAmount || unitPrice * quantity || 0);
      return {
        productId: item.productId || item.id,
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
    return selectedMethod === "CASH" ? Math.max(0, value - finalTotal) : 0;
  }, [tendered, finalTotal, selectedMethod]);

  const displayName = split?.name
    ? `${split.name} · #${orderNumber ?? order?.orderNumber ?? "N/A"}`
    : tableName || order?.table?.name || "Payment";

  const handlePay = async () => {
    if (!selectedMethod) {
      Alert.alert("Select payment method", "Please choose Cash, Card, Gift Card or Mixed.");
      return;
    }

    if (selectedMethod === "CASH") {
      const value = parseFloat(tendered || "0");
      if (value < finalTotal) {
        Alert.alert("Insufficient amount", "The tendered amount must cover the total with tip.");
        return;
      }
    }

    if (selectedMethod === "GIFT_CARD") {
      if (!giftCardNumber) {
        Alert.alert("Gift card required", "Please enter a gift card number.");
        return;
      }
      if (giftCardBalance === null || giftCardBalance < finalTotal) {
        Alert.alert("Insufficient gift card balance", "The gift card balance is insufficient for this payment.");
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
          tipAmount: tipValue > 0 ? tipValue : undefined,
          giftCardNumber: selectedMethod === "GIFT_CARD" ? giftCardNumber : undefined,
          giftCardAmount: selectedMethod === "GIFT_CARD" ? finalTotal : undefined,
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
        total: finalTotal,
        paymentMethod: selectedMethod,
        amountTendered: selectedMethod === "CASH" ? parseFloat(tendered) : undefined,
        change: selectedMethod === "CASH" ? change : undefined,
        receiptNumber,
        tipAmount: tipValue > 0 ? tipValue : undefined,
        giftCardNumber: selectedMethod === "GIFT_CARD" ? giftCardNumber : undefined,
        giftCardAmount: selectedMethod === "GIFT_CARD" ? finalTotal : undefined,
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

  const setTipByPercentage = (percentage: number) => {
    setTipPercentage(percentage);
    const calculatedTip = (total * percentage) / 100;
    setTipAmount(calculatedTip.toFixed(2));
  };

  const handleCloseReceipt = () => {
    setReceiptPayment(null);
    if (split) {
      navigation.goBack();
    } else {
      navigation.navigate("Tables");
    }
  };

  const handlePrint = async () => {
    if (!receiptPayment) return;

    try {
      const receiptData: ReceiptData = {
        restaurantName: "Restaurant POS", // TODO: Get from settings
        restaurantAddress: "123 Main St", // TODO: Get from settings
        restaurantPhone: "(555) 123-4567", // TODO: Get from settings
        orderNumber: receiptPayment.orderNumber || 0,
        tableName: receiptPayment.tableName || undefined,
        orderType: receiptPayment.tableName ? 'DINE_IN' : 'TAKEOUT',
        date: new Date(receiptPayment.createdAt).toLocaleString(),
        serverName: "Server", // TODO: Get from auth store
        items: receiptPayment.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          modifiers: item.modifiers,
        })),
        subtotal: receiptPayment.subtotal,
        tax: receiptPayment.tax,
        total: receiptPayment.total,
        tip: receiptPayment.tipAmount || undefined,
        paymentMethod: receiptPayment.paymentMethod,
        tendered: receiptPayment.amountTendered || undefined,
        change: receiptPayment.change || undefined,
      };

      const success = await printerService.printReceipt(receiptData);
      
      if (success) {
        Alert.alert("Print Success", "Receipt sent to printer successfully.");
      } else {
        Alert.alert("Print Failed", "Could not print receipt. Please check printer connection.");
      }
    } catch (error) {
      console.error('Error printing receipt:', error);
      Alert.alert("Print Error", "An error occurred while printing the receipt.");
    }
  };

  const methods: { key: PaymentMethod; label: string; icon: string }[] = [
    { key: "CASH", label: "Cash", icon: "💵" },
    { key: "CARD", label: "Card", icon: "💳" },
    { key: "GIFT_CARD", label: "Gift Card", icon: "🎁" },
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
        <View style={styles.itemsCard}>
          {items.map((item, index) => (
            <View key={`${item.productId}-${index}`} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>
                  {item.quantity}x {item.name}
                </Text>
                {item.modifiers ? (
                  <Text style={styles.itemModifiers}>{item.modifiers}</Text>
                ) : null}
              </View>
              <Text style={styles.itemTotal}>
                {formatCurrency(item.totalPrice)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalAmount}>{formatCurrency(total)}</Text>
        </View>

        <Text style={styles.sectionTitle}>Add Tip</Text>
        <View style={styles.tipButtons}>
          {[10, 15, 18, 20].map((pct) => (
            <TouchableOpacity
              key={pct}
              style={[styles.tipButton, tipPercentage === pct && styles.tipButtonActive]}
              onPress={() => setTipByPercentage(pct)}
            >
              <Text style={[styles.tipButtonText, tipPercentage === pct && styles.tipButtonTextActive]}>
                {pct}%
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.customTipBox}>
          <Text style={styles.customTipLabel}>Custom Tip</Text>
          <TextInput
            style={styles.customTipInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.muted}
            keyboardType="decimal-pad"
            value={tipAmount}
            onChangeText={(text) => {
              setTipAmount(text);
              setTipPercentage(0);
            }}
          />
        </View>

        {tipValue > 0 && (
          <View style={styles.tipSummary}>
            <Text style={styles.tipSummaryLabel}>Tip Amount</Text>
            <Text style={styles.tipSummaryValue}>{formatCurrency(tipValue)}</Text>
          </View>
        )}

        <View style={[styles.totalCard, styles.finalTotalCard]}>
          <Text style={styles.totalLabel}>Total with Tip</Text>
          <Text style={styles.totalAmount}>{formatCurrency(finalTotal)}</Text>
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
              keyboardType="numeric"
              value={tendered}
              onChangeText={setTendered}
              placeholder="0.00"
              placeholderTextColor="#9ca3af"
            />
            {change > 0 && (
              <View style={styles.changeRow}>
                <Text style={styles.changeLabel}>Change Due</Text>
                <Text style={styles.changeValue}>{formatCurrency(change)}</Text>
              </View>
            )}
          </View>
        )}

        {selectedMethod === "GIFT_CARD" && (
          <View style={styles.tenderedBox}>
            <Text style={styles.sectionTitle}>Gift Card Number</Text>
            <TextInput
              style={styles.input}
              value={giftCardNumber}
              onChangeText={setGiftCardNumber}
              placeholder="Enter gift card number"
              placeholderTextColor="#9ca3af"
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.checkBalanceBtn}
              onPress={async () => {
                if (!giftCardNumber) {
                  Alert.alert("Error", "Please enter a gift card number");
                  return;
                }
                setGiftCardLoading(true);
                try {
                  // Mock API call - replace with actual API
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  setGiftCardBalance(50); // Mock balance
                } catch (error) {
                  Alert.alert("Error", "Failed to check gift card balance");
                  setGiftCardBalance(null);
                } finally {
                  setGiftCardLoading(false);
                }
              }}
              disabled={giftCardLoading}
            >
              {giftCardLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.checkBalanceBtnText}>Check Balance</Text>
              )}
            </TouchableOpacity>
            {giftCardBalance !== null && (
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceValue}>{formatCurrency(giftCardBalance)}</Text>
              </View>
            )}
            {giftCardBalance !== null && giftCardBalance < finalTotal && (
              <Text style={styles.insufficientBalanceText}>
                Insufficient balance. Need {formatCurrency(finalTotal - giftCardBalance)} more.
              </Text>
            )}
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
  itemsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemInfo: { flex: 1, paddingRight: 12 },
  itemName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  itemModifiers: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  itemTotal: { fontSize: 15, fontWeight: "800", color: COLORS.text },
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
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  changeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  changeLabel: { fontSize: 14, color: COLORS.muted },
  changeValue: { fontSize: 18, fontWeight: "700", color: COLORS.success },
  checkBalanceBtn: {
    backgroundColor: "#f97316",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
  },
  checkBalanceBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  balanceLabel: { fontSize: 14, color: COLORS.muted },
  balanceValue: { fontSize: 18, fontWeight: "700", color: COLORS.text },
  insufficientBalanceText: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 8,
    fontWeight: "500",
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
    alignSelf: "stretch",
    marginTop: 8,
  },
  splitBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 15,
  },
  tipButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  tipButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  tipButtonActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  tipButtonText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },
  tipButtonTextActive: {
    color: "#fff",
  },
  customTipBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 16,
  },
  customTipLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    marginBottom: 8,
  },
  customTipInput: {
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tipSummaryLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
  },
  tipSummaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.success,
  },
  finalTotalCard: {
    backgroundColor: "rgba(249,115,22,0.08)",
    borderColor: COLORS.accent,
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
    alignSelf: "stretch",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  payBtnDisabled: { opacity: 0.45 },
  payBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
});
