import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";
import { useActiveOrderStore } from "../store/activeOrderStore";

type ModifierOption = {
  id: string;
  name: string;
  priceDelta: string | number;
};

type ModifierGroup = {
  id: string;
  name: string;
  selectionType: "SINGLE" | "MULTIPLE";
  isRequired: boolean;
  options: ModifierOption[];
};

type Product = {
  id: string;
  name: string;
  price: string | number;
  imageUrl?: string | null;
  categoryId: string;
  modifierGroups?: {
    modifierGroup: ModifierGroup;
  }[];
};

type Category = {
  id: string;
  name: string;
};

type CartModifier = {
  modifierOptionId: string;
  name: string;
  priceDelta: number;
};

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  modifiers: CartModifier[];
  totalPrice: number;
};

export default function OrderScreen({ navigation }: any) {
  const activeTable = useActiveOrderStore((s) => s.activeTableOrder);

  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEOUT" | "DELIVERY">(
    "DINE_IN"
  );

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, ModifierOption[]>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const [catRes, prodRes] = await Promise.all([
        api.get("/menu/categories"),
        api.get("/menu/products?includeModifiers=true"),
      ]);

      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load menu."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === "ALL") return products;
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const tax = 0;
  const total = subtotal + tax;

  const productGroups: ModifierGroup[] =
    selectedProduct?.modifierGroups?.map((x) => x.modifierGroup) ?? [];

  const selectedProductTotal = useMemo(() => {
    if (!selectedProduct) return 0;

    const base = Number(selectedProduct.price);
    const modifiersTotal = Object.values(selectedModifiers)
      .flat()
      .reduce((sum, option) => sum + Number(option.priceDelta || 0), 0);

    return (base + modifiersTotal) * quantity;
  }, [selectedProduct, selectedModifiers, quantity]);

  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setSelectedModifiers({});
    setQuantity(1);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setSelectedModifiers({});
    setQuantity(1);
  };

  const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedModifiers((prev) => {
      const current = prev[group.id] ?? [];

      if (group.selectionType === "SINGLE") {
        return {
          ...prev,
          [group.id]: [option],
        };
      }

      const exists = current.some((x) => x.id === option.id);

      return {
        ...prev,
        [group.id]: exists
          ? current.filter((x) => x.id !== option.id)
          : [...current, option],
      };
    });
  };

  const addSelectedProductToCart = () => {
    if (!selectedProduct) return;

    for (const group of productGroups) {
      if (group.isRequired && !(selectedModifiers[group.id]?.length > 0)) {
        Alert.alert("Required option", `Please select ${group.name}.`);
        return;
      }
    }

    const modifiers = Object.values(selectedModifiers)
      .flat()
      .map((option) => ({
        modifierOptionId: option.id,
        name: option.name,
        priceDelta: Number(option.priceDelta || 0),
      }));

    const unitPrice = Number(selectedProduct.price);
    const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceDelta, 0);

    const cartItem: CartItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      quantity,
      unitPrice,
      modifiers,
      totalPrice: (unitPrice + modifierTotal) * quantity,
    };

    setCart((prev) => [...prev, cartItem]);
    closeProductModal();
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const sendToKitchen = async () => {
    if (cart.length === 0) {
      Alert.alert("Empty order", "Add at least one item first.");
      return;
    }

    setSubmitting(true);

    try {
      await api.post("/orders", {
        tableId: activeTable?.tableId ?? null,
        orderType,
        subtotal,
        taxAmount: tax,
        totalAmount: total,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          modifiers: item.modifiers.map((m) => ({
            modifierOptionId: m.modifierOptionId,
            nameSnapshot: m.name,
            priceDelta: m.priceDelta,
          })),
        })),
      });

      Alert.alert("Success", "Order sent to kitchen.");
      setCart([]);
      navigation.navigate("Tables");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to create order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading sales screen...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Tables")}
        >
          <Text style={styles.backText}>← Tables</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.headerTitle}>Sales</Text>
          <Text style={styles.headerSubtitle}>
            {activeTable?.tableName ? `Table ${activeTable.tableName}` : "New Order"}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.leftPanel}>
          <Text style={styles.panelTitle}>Current Order</Text>

          <View style={styles.orderTypeRow}>
            {(["DINE_IN", "TAKEOUT", "DELIVERY"] as const).map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setOrderType(type)}
                style={[
                  styles.orderTypeButton,
                  orderType === type && styles.orderTypeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.orderTypeText,
                    orderType === type && styles.orderTypeTextActive,
                  ]}
                >
                  {type.replace("_", " ")}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView style={styles.cartList}>
            {cart.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartTitle}>No items yet</Text>
                <Text style={styles.emptyCartText}>
                  Tap products from the menu to add them.
                </Text>
              </View>
            ) : (
              cart.map((item, index) => (
                <TouchableOpacity
                  key={`${item.productId}-${index}`}
                  style={styles.cartItem}
                  onLongPress={() => removeCartItem(index)}
                >
                  <View style={styles.cartItemTop}>
                    <Text style={styles.cartItemName}>
                      {item.quantity}x {item.name}
                    </Text>
                    <Text style={styles.cartItemPrice}>
                      ${item.totalPrice.toFixed(2)}
                    </Text>
                  </View>

                  {item.modifiers.map((modifier) => (
                    <Text
                      key={modifier.modifierOptionId}
                      style={styles.cartModifier}
                    >
                      + {modifier.name}
                      {modifier.priceDelta > 0
                        ? ` (+$${modifier.priceDelta.toFixed(2)})`
                        : ""}
                    </Text>
                  ))}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal</Text>
              <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax</Text>
              <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
            </View>

            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>Total</Text>
              <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.sendButton}
              onPress={sendToKitchen}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send to Kitchen</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.rightPanel}>
          <Text style={styles.panelTitle}>Menu</Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            <TouchableOpacity
              onPress={() => setSelectedCategoryId("ALL")}
              style={[
                styles.categoryTab,
                selectedCategoryId === "ALL" && styles.categoryTabActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategoryId === "ALL" && styles.categoryTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                onPress={() => setSelectedCategoryId(category.id)}
                style={[
                  styles.categoryTab,
                  selectedCategoryId === category.id && styles.categoryTabActive,
                ]}
              >
                <Text
                  style={[
                    styles.categoryText,
                    selectedCategoryId === category.id &&
                      styles.categoryTextActive,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.id}
            numColumns={2}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.productList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productCard}
                onPress={() => openProductModal(item)}
              >
                <View style={styles.productImagePlaceholder}>
                  <Text style={styles.productEmoji}>☕</Text>
                </View>

                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productPrice}>
                  ${Number(item.price).toFixed(2)}
                </Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </View>

      <Modal transparent visible={!!selectedProduct} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedProduct?.name}</Text>
            <Text style={styles.modalPrice}>
              ${selectedProductTotal.toFixed(2)}
            </Text>

            <ScrollView style={styles.modifierList}>
              {productGroups.map((group) => (
                <View key={group.id} style={styles.modifierGroup}>
                  <Text style={styles.modifierGroupTitle}>
                    {group.name}
                    {group.isRequired ? " *" : ""}
                  </Text>

                  {group.options.map((option) => {
                    const selected =
                      selectedModifiers[group.id]?.some(
                        (x) => x.id === option.id
                      ) ?? false;

                    return (
                      <TouchableOpacity
                        key={option.id}
                        style={[
                          styles.modifierOption,
                          selected && styles.modifierOptionSelected,
                        ]}
                        onPress={() => toggleModifier(group, option)}
                      >
                        <Text style={styles.modifierOptionText}>
                          {group.selectionType === "SINGLE"
                            ? selected
                              ? "●"
                              : "○"
                            : selected
                            ? "☑"
                            : "☐"}{" "}
                          {option.name}
                        </Text>

                        <Text style={styles.modifierOptionPrice}>
                          +${Number(option.priceDelta || 0).toFixed(2)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </ScrollView>

            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Text style={styles.qtyText}>−</Text>
              </TouchableOpacity>

              <Text style={styles.qtyNumber}>{quantity}</Text>

              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => setQuantity((q) => q + 1)}
              >
                <Text style={styles.qtyText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={closeProductModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.addButton}
                onPress={addSelectedProductToCart}
              >
                <Text style={styles.addButtonText}>Add to Order</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: { marginTop: 12, color: "#64748B" },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  backButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backText: { fontWeight: "900", color: "#334155" },
  headerTitle: { fontSize: 28, fontWeight: "900", color: "#0F172A" },
  headerSubtitle: { color: "#64748B", marginTop: 2 },
  body: { flex: 1, flexDirection: "row", paddingHorizontal: 14, gap: 12 },
  leftPanel: {
    flex: 0.9,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  rightPanel: {
    flex: 1.3,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
  },
  panelTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 12,
  },
  orderTypeRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  orderTypeButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
  },
  orderTypeButtonActive: { backgroundColor: "#111827" },
  orderTypeText: { fontSize: 11, fontWeight: "900", color: "#475569" },
  orderTypeTextActive: { color: "#FFFFFF" },
  cartList: { flex: 1 },
  emptyCart: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyCartTitle: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  emptyCartText: { color: "#64748B", marginTop: 6, textAlign: "center" },
  cartItem: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cartItemTop: { flexDirection: "row", justifyContent: "space-between" },
  cartItemName: { fontSize: 15, fontWeight: "900", color: "#0F172A" },
  cartItemPrice: { fontWeight: "900", color: "#0F172A" },
  cartModifier: { color: "#64748B", fontSize: 12, marginTop: 4 },
  totalsBox: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },
  totalLabel: { color: "#64748B", fontWeight: "700" },
  totalValue: { color: "#0F172A", fontWeight: "800" },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 14,
  },
  grandTotalLabel: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  grandTotalValue: { fontSize: 20, fontWeight: "900", color: "#0F172A" },
  sendButton: {
    backgroundColor: "#F97316",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
  },
  sendButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 15 },
  categoryScroll: { marginBottom: 12, maxHeight: 46 },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F1F5F9",
    borderRadius: 999,
    marginRight: 8,
  },
  categoryTabActive: { backgroundColor: "#111827" },
  categoryText: { color: "#475569", fontWeight: "900" },
  categoryTextActive: { color: "#FFFFFF" },
  productList: { paddingBottom: 24 },
  productRow: { gap: 12 },
  productCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 22,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  productImagePlaceholder: {
    height: 90,
    borderRadius: 18,
    backgroundColor: "#FFEDD5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  productEmoji: { fontSize: 34 },
  productName: { fontSize: 16, fontWeight: "900", color: "#0F172A" },
  productPrice: { marginTop: 4, color: "#F97316", fontWeight: "900" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 22,
  },
  modalTitle: { fontSize: 26, fontWeight: "900", color: "#0F172A" },
  modalPrice: {
    color: "#F97316",
    fontSize: 20,
    fontWeight: "900",
    marginTop: 4,
    marginBottom: 12,
  },
  modifierList: { maxHeight: 360 },
  modifierGroup: { marginBottom: 16 },
  modifierGroupTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 8,
  },
  modifierOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    padding: 13,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modifierOptionSelected: {
    borderColor: "#F97316",
    backgroundColor: "#FFF7ED",
  },
  modifierOptionText: { fontWeight: "800", color: "#0F172A" },
  modifierOptionPrice: { fontWeight: "900", color: "#64748B" },
  quantityRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 18,
    marginTop: 10,
  },
  qtyButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: { fontSize: 26, fontWeight: "900", color: "#0F172A" },
  qtyNumber: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  modalActions: { flexDirection: "row", gap: 10, marginTop: 18 },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  cancelButtonText: { color: "#334155", fontWeight: "900" },
  addButton: {
    flex: 1,
    backgroundColor: "#F97316",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "900" },
});