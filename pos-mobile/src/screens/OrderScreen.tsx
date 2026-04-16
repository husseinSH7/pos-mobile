import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import CategoryTabs from "../components/CategoryTabs";
import ProductCard from "../components/ProductCard";
import CartItemRow from "../components/CartItemRow";
import { api } from "../services/api";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import { Category, Product } from "../utils/types";

export default function OrderScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const items = useCartStore((s) => s.items);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const decreaseItem = useCartStore((s) => s.decreaseItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const getSubtotal = useCartStore((s) => s.getSubtotal);

  const activeTableOrder = useActiveOrderStore((s) => s.activeTableOrder);

  const tableName = activeTableOrder.tableName;
  const orderNumber = activeTableOrder.orderNumber;

  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = getSubtotal();
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const fetchMenu = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get("/menu/categories"),
        api.get("/menu/products"),
      ]);

      setCategories(catRes.data);
      setProducts(prodRes.data);

      if (catRes.data.length > 0) {
        setSelectedCategory((prev) => prev ?? catRes.data[0].id);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to load menu.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchMenu();
  }, [isAuthenticated, fetchMenu]);

  const onRefresh = () => {
    if (!isAuthenticated) return;
    setRefreshing(true);
    fetchMenu();
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  const handleAddProduct = async (product: Product) => {
    if (!product.available) return;

    setAddingProductId(product.id);
    try {
      addItem({
        productId: product.id,
        name: product.name,
        price: Number(product.price),
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to add item.";
      Alert.alert("Error", message);
    } finally {
      setAddingProductId(null);
    }
  };

  const handleClearCart = () => {
    Alert.alert("Clear Order", "Remove all items from this order?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearCart },
    ]);
  };

  const handleProceedToCheckout = async () => {
    try {
      if (!activeTableOrder.tableId) {
        Alert.alert("Error", "No table selected.");
        return;
      }

      if (!items.length) {
        Alert.alert("Error", "Cart is empty.");
        return;
      }

      const payload = {
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          notes: item.notes,
        })),
      };

      const res = await api.post(
        `/tables/${activeTableOrder.tableId}/checkout`,
        payload
      );

      const order = res.data;

      useActiveOrderStore.getState().setActiveTableOrder({
        tableId: activeTableOrder.tableId,
        tableName: activeTableOrder.tableName,
        orderId: order.id,
        orderNumber: order.orderNumber,
      });

      navigation.navigate("Cart");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to checkout order.";
      Alert.alert("Error", message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("Tables")}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.title}>{tableName ?? "Order"}</Text>
          {orderNumber != null && (
            <Text style={styles.orderNum}>Order #{orderNumber}</Text>
          )}
        </View>

        {totalCount > 0 && (
          <TouchableOpacity onPress={handleClearCart} style={styles.clearBtn}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.menuPanel}>
          <CategoryTabs
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
          />

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.accent}
              />
            }
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                quantityInCart={
                  items.find((c) => c.productId === item.id)?.quantity ?? 0
                }
                onPress={handleAddProduct}
                loading={addingProductId === item.id}
              />
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No items here</Text>
            }
          />
        </View>

        <View style={styles.cartPanel}>
          <Text style={styles.cartTitle}>Current Order</Text>

          {items.length === 0 ? (
            <View style={styles.emptyCart}>
              <Text style={styles.emptyCartIcon}>🛒</Text>
              <Text style={styles.emptyCartText}>No items added</Text>
              <Text style={styles.emptyCartSub}>Tap products to add them</Text>
            </View>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => item.productId}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 12 }}
              renderItem={({ item }) => (
                <CartItemRow
                  item={item}
                  onIncrease={() =>
                    addItem({
                      productId: item.productId,
                      name: item.name,
                      price: item.price,
                      notes: item.notes,
                    })
                  }
                  onDecrease={() => decreaseItem(item.productId)}
                  onRemove={() => removeItem(item.productId)}
                />
              )}
            />
          )}

          {items.length > 0 && (
            <View style={styles.summary}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(subtotal)}
                </Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax (10%)</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(tax)}
                </Text>
              </View>

              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(total)}
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                onPress={handleProceedToCheckout}
                activeOpacity={0.85}
              >
                <Text style={styles.checkoutBtnText}>
                  Proceed to Checkout →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.bg,
  },
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
  orderNum: { fontSize: 12, color: COLORS.muted, marginTop: 1 },
  clearBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#3A1A1A",
  },
  clearText: { color: COLORS.error, fontWeight: "600", fontSize: 13 },
  body: { flex: 1, flexDirection: "row" },
  menuPanel: { flex: 55, borderRightWidth: 1, borderRightColor: COLORS.border },
  row: { justifyContent: "space-between" },
  productList: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 20 },
  emptyText: { color: COLORS.muted, textAlign: "center", marginTop: 40 },
  cartPanel: { flex: 45, paddingHorizontal: 12, paddingTop: 12 },
  cartTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  },
  emptyCart: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCartIcon: { fontSize: 36 },
  emptyCartText: { color: COLORS.text, fontWeight: "600", fontSize: 15 },
  emptyCartSub: { color: COLORS.muted, fontSize: 12 },
  summary: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 12,
    gap: 6,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryLabel: { color: COLORS.muted, fontSize: 13 },
  summaryValue: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: "700" },
  totalValue: { color: COLORS.accent, fontSize: 18, fontWeight: "800" },
  checkoutBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});