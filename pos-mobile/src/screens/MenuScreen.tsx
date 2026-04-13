import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import CategoryTabs from "../components/CategoryTabs";
import ProductCard from "../components/ProductCard";
import { api } from "../services/api";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import { Category, Product } from "../utils/types";

export default function MenuScreen({ navigation }: any) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const total = useCartStore((s) => s.total);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const totalCount = cartItems.reduce((sum, i) => sum + i.quantity, 0);

  const fetchMenu = useCallback(async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get("/menu/categories"),
        api.get("/menu/products"),
      ]);

      setCategories(catRes.data);
      setProducts(prodRes.data);

      if (catRes.data.length > 0 && !selectedCategory) {
        setSelectedCategory(catRes.data[0].id);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to load menu. Check your connection.";

      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenu();
  };

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.categoryId === selectedCategory)
    : products;

  const handleAddToCart = (product: Product) => {
    if (!product.available) return;

    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
    });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading menu...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Menu</Text>
          <Text style={styles.screenSub}>Welcome, {user?.name ?? "Staff"}</Text>
        </View>

        <View style={styles.topRight}>
          <TouchableOpacity
            style={styles.orderBtn}
            onPress={() => navigation.navigate("Order")}
          >
            <Text style={styles.orderBtnText}>Order</Text>
            {totalCount > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>↩</Text>
          </TouchableOpacity>
        </View>
      </View>

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
              cartItems.find((c) => c.productId === item.id)?.quantity ?? 0
            }
            onPress={handleAddToCart}
          />
        )}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No items in this category</Text>
          </View>
        }
      />

      {totalCount > 0 && (
        <TouchableOpacity
          style={styles.stickyCart}
          onPress={() => navigation.navigate("Cart")}
          activeOpacity={0.9}
        >
          <View style={styles.stickyLeft}>
            <View style={styles.stickyBadge}>
              <Text style={styles.stickyBadgeText}>{totalCount}</Text>
            </View>
            <Text style={styles.stickyLabel}>View Cart</Text>
          </View>
          <Text style={styles.stickyTotal}>{formatCurrency(total())}</Text>
        </TouchableOpacity>
      )}
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
  loadingText: { color: COLORS.muted, marginTop: 12, fontSize: 14 },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 0.5,
  },
  screenSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  orderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  orderBtnText: { color: COLORS.text, fontWeight: "600", fontSize: 14 },
  cartBadge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  logoutBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: { fontSize: 18, color: COLORS.muted },
  productList: { paddingHorizontal: 12, paddingBottom: 100 },
  row: { justifyContent: "space-between" },
  emptyText: { color: COLORS.muted, fontSize: 14, marginTop: 40 },
  stickyCart: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  stickyLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  stickyBadge: {
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  stickyBadgeText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  stickyLabel: { color: "#fff", fontWeight: "700", fontSize: 16 },
  stickyTotal: { color: "#fff", fontWeight: "800", fontSize: 18 },
});