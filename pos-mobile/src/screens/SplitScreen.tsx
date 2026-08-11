import React, { useState, useEffect, useMemo } from "react";
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
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";

type PaymentMethod = "CASH" | "CARD" | "GIFT_CARD" | "MIXED";

interface SplitParticipant {
  id: string;
  name: string;
  amount: number;
  paymentMethod: PaymentMethod | null;
  tipAmount?: number;
  cashTendered?: number;
  giftCardId?: string;
}

export default function SplitScreen({ navigation, route }: any) {
  const { order, orderData } = route.params || {};
  const [orderDetails, setOrderDetails] = useState<any>(order || orderData || {});
  const [loading, setLoading] = useState(false);
  const [participants, setParticipants] = useState<SplitParticipant[]>([
    { id: "1", name: "Person 1", amount: 0, paymentMethod: null },
    { id: "2", name: "Person 2", amount: 0, paymentMethod: null },
  ]);
  const [splitType, setSplitType] = useState<"EQUAL" | "CUSTOM" | "PERCENTAGE">("EQUAL");
  const [numPeople, setNumPeople] = useState(2);

  const totalAmount = useMemo(() => {
    return Number(orderDetails?.totalAmount || 0);
  }, [orderDetails]);

  useEffect(() => {
    // If order is not passed, fetch by ID from route
    if (!order && route.params?.orderId) {
      fetchOrder(route.params.orderId);
    }
  }, []);

  const fetchOrder = async (orderId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      setOrderDetails(res.data);
    } catch (error) {
      Alert.alert("Error", "Could not load order details.");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const updateParticipant = (index: number, field: keyof SplitParticipant, value: any) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const addParticipant = () => {
    const newId = (participants.length + 1).toString();
    setParticipants([
      ...participants,
      { id: newId, name: `Person ${newId}`, amount: 0, paymentMethod: null },
    ]);
    setNumPeople(participants.length + 1);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 2) {
      Alert.alert("Minimum", "At least 2 participants required.");
      return;
    }
    setParticipants(participants.filter((_, i) => i !== index));
    setNumPeople(participants.length - 1);
  };

  const applySplit = () => {
    if (splitType === "EQUAL") {
      const each = totalAmount / participants.length;
      setParticipants(participants.map(p => ({ ...p, amount: each })));
    } else {
      Alert.alert("Custom split", "Enter amounts manually for each person.");
    }
  };

  const handlePay = async () => {
    // Validate all participants have payment method and amounts > 0
    const totalSplit = participants.reduce((sum, p) => sum + p.amount, 0);
    if (Math.abs(totalSplit - totalAmount) > 0.01) {
      Alert.alert("Split mismatch", `Total split (${formatCurrency(totalSplit)}) does not equal order total (${formatCurrency(totalAmount)}).`);
      return;
    }
    const invalid = participants.some(p => !p.paymentMethod || p.amount <= 0);
    if (invalid) {
      Alert.alert("Incomplete", "Please set payment method and amount for each participant.");
      return;
    }

    setLoading(true);
    try {
      const orderId = orderDetails.id;
      // First create splits
      const splits = participants.map((p) => ({
        name: p.name,
        amount: p.amount,
        splitType: "CUSTOM",
      }));
      await api.post(`/orders/${orderId}/split`, { splits });

      // Then pay with splits
      const paymentSplits = participants.map((p) => ({
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        tipAmount: p.tipAmount || 0,
        cashTendered: p.paymentMethod === "CASH" ? p.cashTendered || p.amount : undefined,
      }));
      await api.post(`/orders/${orderId}/pay-split`, { splits: paymentSplits });

      Alert.alert("Success", "Split payment completed.");
      navigation.navigate("Tables");
    } catch (error: any) {
      Alert.alert("Error", error?.response?.data?.message || "Split payment failed.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Split Bill</Text>
        </View>

        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Order Total</Text>
          <Text style={styles.totalAmount}>{formatCurrency(totalAmount)}</Text>
        </View>

        <View style={styles.splitTypeRow}>
          {["EQUAL", "CUSTOM", "PERCENTAGE"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeButton, splitType === type && styles.typeButtonActive]}
              onPress={() => setSplitType(type as any)}
            >
              <Text style={[styles.typeText, splitType === type && styles.typeTextActive]}>
                {type.charAt(0) + type.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.applyButton} onPress={applySplit}>
          <Text style={styles.applyButtonText}>Apply Split</Text>
        </TouchableOpacity>

        {participants.map((p, idx) => (
          <View key={p.id} style={styles.participantCard}>
            <View style={styles.participantHeader}>
              <TextInput
                style={styles.nameInput}
                value={p.name}
                onChangeText={(text) => updateParticipant(idx, "name", text)}
                placeholder="Name"
              />
              <TouchableOpacity onPress={() => removeParticipant(idx)}>
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.amountInput}
              value={p.amount > 0 ? p.amount.toFixed(2) : ""}
              onChangeText={(text) => {
                const val = parseFloat(text) || 0;
                updateParticipant(idx, "amount", val);
              }}
              keyboardType="decimal-pad"
              placeholder="Amount"
            />
            <View style={styles.methodRow}>
              {["CASH", "CARD", "GIFT_CARD"].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.methodButton,
                    p.paymentMethod === method && styles.methodButtonActive,
                  ]}
                  onPress={() => updateParticipant(idx, "paymentMethod", method as PaymentMethod)}
                >
                  <Text style={[styles.methodText, p.paymentMethod === method && styles.methodTextActive]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addParticipant}>
          <Text style={styles.addButtonText}>+ Add Person</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.payButton} onPress={handlePay} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay Split</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, color: "#64748B" },
  scroll: { flex: 1, padding: 16 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  backBtn: { marginRight: 16 },
  backText: { fontSize: 24, color: "#334155" },
  title: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  totalCard: { backgroundColor: "#fff", borderRadius: 16, padding: 20, marginBottom: 20, alignItems: "center" },
  totalLabel: { fontSize: 14, color: "#64748B" },
  totalAmount: { fontSize: 32, fontWeight: "900", color: COLORS.accent, marginTop: 4 },
  splitTypeRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  typeButton: { flex: 1, paddingVertical: 12, backgroundColor: "#F1F5F9", borderRadius: 10, alignItems: "center" },
  typeButtonActive: { backgroundColor: COLORS.accent },
  typeText: { fontWeight: "700", color: "#475569" },
  typeTextActive: { color: "#fff" },
  applyButton: { backgroundColor: COLORS.accent, paddingVertical: 12, borderRadius: 10, alignItems: "center", marginBottom: 16 },
  applyButtonText: { color: "#fff", fontWeight: "800" },
  participantCard: { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  participantHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  nameInput: { fontSize: 16, fontWeight: "700", color: "#0F172A", flex: 1 },
  removeText: { fontSize: 18, color: "#EF4444", paddingHorizontal: 8 },
  amountInput: { backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 18, fontWeight: "800", marginBottom: 10 },
  methodRow: { flexDirection: "row", gap: 8 },
  methodButton: { flex: 1, paddingVertical: 8, backgroundColor: "#F1F5F9", borderRadius: 8, alignItems: "center" },
  methodButtonActive: { backgroundColor: COLORS.accent },
  methodText: { fontWeight: "700", color: "#475569" },
  methodTextActive: { color: "#fff" },
  addButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 20 },
  addButtonText: { color: COLORS.accent, fontWeight: "800" },
  payButton: { backgroundColor: COLORS.accent, borderRadius: 14, paddingVertical: 18, alignItems: "center" },
  payButtonText: { color: "#fff", fontWeight: "900", fontSize: 16 },
});