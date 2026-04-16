import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from "react-native";
import CartItemRow from "../components/CartItemRow";
import { useCartStore } from "../store/cartStore";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";

export default function CartScreen({ navigation }: any) {
  const { items, removeItem, updateQuantity, clearCart, subtotal, tax, total } =
    useCartStore();

  const { tableName, orderNumber } = useActiveOrderStore();

  const handleClearCart = () => {
    Alert.alert("Clear Order", "Remove all items from this order?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearCart();
          navigation.navigate("Order");
        },
      },
    ]);
  };

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
          <Text style={styles.title}>Review Order</Text>
          {tableName && (
            <Text style={styles.headerSub}>
              {tableName}
              {orderNumber != null ? ` · #${orderNumber}` : ""}
            </Text>
          )}
        </View>
        {items.length > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Order is empty</Text>
          <Text style={styles.emptySub}>Add items from the menu</Text>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.navigate("Order")}
          >
            <Text style={styles.menuBtnText}>Back to Order</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(item) => item.productId}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <CartItemRow
                item={item}
                onIncrease={() =>
                  updateQuantity(item.productId, item.quantity + 1)
                }
                onDecrease={() =>
                  updateQuantity(item.productId, item.quantity - 1)
                }
                onRemove={() => removeItem(item.productId)}
              />
            )}
          />

          <View style={styles.footer}>
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(subtotal())}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (10%)</Text>
                <Text style={styles.summaryValue}>{formatCurrency(tax())}</Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatCurrency(total())}</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.addMoreBtn}
                onPress={() => navigation.navigate("Order")}
                activeOpacity={0.8}
              >
                <Text style={styles.addMoreText}>+ Add Items</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={() => navigation.navigate("Payment")}
                activeOpacity={0.85}
              >
                <Text style={styles.checkoutBtnText}>
                  Pay {formatCurrency(total())}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
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
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#3A1A1A",
  },
  clearText: { color: COLORS.error, fontWeight: "600", fontSize: 13 },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emptyIcon: { fontSize: 52 },
  emptyTitle: { color: COLORS.text, fontSize: 18, fontWeight: "700" },
  emptySub: { color: COLORS.muted, fontSize: 14 },
  menuBtn: {
    marginTop: 12,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  menuBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  list: { padding: 16, paddingBottom: 8 },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    padding: 16,
    gap: 12,
  },
  summaryBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  summaryLabel: { color: COLORS.muted, fontSize: 14 },
  summaryValue: { color: COLORS.text, fontSize: 14, fontWeight: "600" },
  totalRow: {
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: { color: COLORS.text, fontSize: 17, fontWeight: "700" },
  totalValue: { color: COLORS.accent, fontSize: 20, fontWeight: "800" },
  actions: { flexDirection: "row", gap: 10 },
  addMoreBtn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  addMoreText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  checkoutBtn: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: COLORS.accent,
    alignItems: "center",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});