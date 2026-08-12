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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { useAuthStore } from "../store/authStore";
import { useSyncStore } from "../store/syncStore";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

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
  course?: string | null;
};

export default function OrderScreen({ navigation }: any) {
  const activeTable = useActiveOrderStore((s) => s.activeTableOrder);
  const setActiveTableOrder = useActiveOrderStore((s) => s.setActiveTableOrder);
  const user = useAuthStore((s) => s.user);
  const { loadSyncStatus } = useSyncStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("ALL");

  // Cart = new items (not yet sent to kitchen)
  const [cart, setCart] = useState<CartItem[]>([]);
  // Ordered items = already sent (read-only)
  const [orderedItems, setOrderedItems] = useState<CartItem[]>([]);

  const [orderType, setOrderType] = useState<"DINE_IN" | "TAKEOUT" | "DELIVERY">(
    "DINE_IN"
  );
  const [selectedCourse, setSelectedCourse] = useState<string>("");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedModifiers, setSelectedModifiers] = useState<
    Record<string, ModifierOption[]>
  >({});
  const [quickModifiers, setQuickModifiers] = useState<ModifierOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [orderNotes, setOrderNotes] = useState("");
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);

  // ─── Load Menu ──────────────────────────────────────────────
  const loadMenu = async () => {
    try {
      setError(null);
      const [catRes, prodRes] = await Promise.all([
        api.get("/menu/categories"),
        api.get("/menu/products?includeModifiers=true"),
      ]);
      setCategories(catRes.data);
      setProducts(prodRes.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "Failed to load menu.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  // ─── Load existing order items ──────────────────────────────
  useEffect(() => {
    const loadExistingOrder = async () => {
      if (activeTable.orderId) {
        try {
          const res = await api.get(`/orders/${activeTable.orderId}`);
          const order = res.data;
          const items = order.items.map((item: any) => ({
            productId: item.productId,
            name: item.product?.name || item.name || "Item",
            quantity: Number(item.quantity || 1),
            unitPrice: Number(item.unitPrice || 0),
            modifiers: (item.modifiers || []).map((m: any) => ({
              modifierOptionId: m.modifierOptionId,
              name: m.nameSnapshot || m.name,
              priceDelta: Number(m.priceDelta || 0),
            })),
            totalPrice: Number(item.totalPrice || 0),
            course: item.course || null,
          }));
          setOrderedItems(items);
          setOrderType(order.orderType || "DINE_IN");
          setOrderNotes(order.notes || "");
        } catch (error) {
          console.error("Failed to load existing order", error);
        }
      }
    };
    if (!loading) {
      loadExistingOrder();
    }
  }, [activeTable.orderId, loading]);

  // ─── Compute totals ────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (selectedCategoryId === "ALL") return products;
    return products.filter((p) => p.categoryId === selectedCategoryId);
  }, [products, selectedCategoryId]);

  const orderedSubtotal = orderedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const subtotal = orderedSubtotal + cartSubtotal;
  const tax = 0;
  const total = subtotal + tax;

  const productGroups: ModifierGroup[] =
    selectedProduct?.modifierGroups?.map((x) => x.modifierGroup) ?? [];

  const allQuickModifiers = useMemo(() => {
    const modifierCounts = new Map<string, { option: ModifierOption; count: number }>();
    products.forEach(product => {
      product.modifierGroups?.forEach(group => {
        group.modifierGroup.options.forEach(option => {
          const key = option.id;
          const existing = modifierCounts.get(key);
          if (existing) {
            existing.count++;
          } else {
            modifierCounts.set(key, { option, count: 1 });
          }
        });
      });
    });
    return Array.from(modifierCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.option);
  }, [products]);

  const selectedProductTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    const base = Number(selectedProduct.price);
    const modifiersTotal = Object.values(selectedModifiers)
      .flat()
      .reduce((sum, option) => sum + Number(option.priceDelta || 0), 0);
    const quickModifiersTotal = quickModifiers.reduce((sum, m) => sum + Number(m.priceDelta || 0), 0);
    return (base + modifiersTotal + quickModifiersTotal) * quantity;
  }, [selectedProduct, selectedModifiers, quickModifiers, quantity]);

  // ─── Modal handlers ────────────────────────────────────────────
  const openProductModal = (product: Product) => {
    setSelectedProduct(product);
    setSelectedModifiers({});
    setQuickModifiers([]);
    setQuantity(1);
    setSelectedCourse("");
    setEditingCartIndex(null);
  };

  const openEditCartItem = (index: number) => {
    const item = cart[index];
    if (!item) return;
    const product = products.find((p) => p.id === item.productId);
    if (!product) {
      Alert.alert("Product not found", "This item can only be removed.");
      return;
    }
    const reconstructed: Record<string, ModifierOption[]> = {};
    product.modifierGroups?.forEach((group) => {
      const selected = group.modifierGroup.options.filter((option) =>
        item.modifiers.some((m) => m.modifierOptionId === option.id)
      );
      if (selected.length > 0) {
        reconstructed[group.modifierGroup.id] = selected;
      }
    });
    setSelectedProduct(product);
    setSelectedModifiers(reconstructed);
    setQuickModifiers([]);
    setQuantity(item.quantity);
    setSelectedCourse(item.course || "");
    setEditingCartIndex(index);
  };

  const closeProductModal = () => {
    setSelectedProduct(null);
    setSelectedModifiers({});
    setQuickModifiers([]);
    setQuantity(1);
    setSelectedCourse("");
    setEditingCartIndex(null);
  };

  const toggleQuickModifier = (option: ModifierOption) => {
    setQuickModifiers(prev => {
      const exists = prev.some(m => m.id === option.id);
      if (exists) {
        return prev.filter(m => m.id !== option.id);
      }
      return [...prev, option];
    });
  };

  const toggleModifier = (group: ModifierGroup, option: ModifierOption) => {
    setSelectedModifiers((prev) => {
      const current = prev[group.id] ?? [];
      if (group.selectionType === "SINGLE") {
        return { ...prev, [group.id]: [option] };
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
    const modifiers = [
      ...Object.values(selectedModifiers)
        .flat()
        .map((option) => ({
          modifierOptionId: option.id,
          name: option.name,
          priceDelta: Number(option.priceDelta || 0),
        })),
      ...quickModifiers.map((option) => ({
        modifierOptionId: option.id,
        name: option.name,
        priceDelta: Number(option.priceDelta || 0),
      })),
    ];
    const unitPrice = Number(selectedProduct.price);
    const modifierTotal = modifiers.reduce((sum, m) => sum + m.priceDelta, 0);
    const cartItem: CartItem = {
      productId: selectedProduct.id,
      name: selectedProduct.name,
      quantity,
      unitPrice,
      modifiers,
      course: selectedCourse || null,
      totalPrice: (unitPrice + modifierTotal) * quantity,
    };
    if (editingCartIndex !== null) {
      setCart((prev) => {
        const next = [...prev];
        next[editingCartIndex] = cartItem;
        return next;
      });
    } else {
      setCart((prev) => [...prev, cartItem]);
    }
    closeProductModal();
  };

  const removeCartItem = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  // ─── Send to Kitchen ─────────────────────────────────────────
  const sendToKitchen = async () => {
    if (cart.length === 0) {
      Alert.alert("Empty order", "Add at least one item first.");
      return;
    }

    setSubmitting(true);

    const newItems = cart.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      modifiers: item.modifiers.map((m) => ({
        modifierOptionId: m.modifierOptionId,
        nameSnapshot: m.name,
        priceDelta: m.priceDelta,
      })),
    }));

    try {
      let orderId = activeTable.orderId;
      let orderNumber = activeTable.orderNumber;

      if (orderId) {
        await api.put(`/orders/${orderId}/items`, { items: newItems });
      } else {
        const payload = {
          tableId: activeTable.tableId || undefined,
          orderType,
          notes: orderNotes || undefined,
          items: newItems,
        };
        const response = await api.post("/orders", payload);
        orderId = response.data.id;
        orderNumber = response.data.orderNumber;
        setActiveTableOrder({
          ...activeTable,
          orderId,
          orderNumber,
        });
      }

      // Clear cart after sending to kitchen
      setCart([]);
      setOrderNotes("");
      navigation.navigate("Tables");
    } catch (error: any) {
      console.error("❌ Send to kitchen error:", error);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to send order."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading menu..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadMenu} />;
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

          <View style={styles.courseRow}>
            <Text style={styles.courseLabel}>Course:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.courseScroll}>
              {["", "Appetizer", "Main", "Dessert", "Drink"].map((course) => (
                <TouchableOpacity
                  key={course || "none"}
                  onPress={() => setSelectedCourse(course)}
                  style={[
                    styles.courseButton,
                    selectedCourse === course && styles.courseButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.courseButtonText,
                      selectedCourse === course && styles.courseButtonTextActive,
                    ]}
                  >
                    {course || "None"}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ─── Ordered items (already sent) ─── */}
          {orderedItems.length > 0 && (
            <View style={styles.orderedSection}>
              <Text style={styles.orderedLabel}>Sent to Kitchen</Text>
              {orderedItems.map((item, index) => (
                <View key={`ordered-${index}`} style={styles.orderedItem}>
                  <Text style={styles.orderedItemName}>
                    {item.quantity}x {item.name}
                  </Text>
                  <Text style={styles.orderedItemPrice}>
                    ${item.totalPrice.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ─── Cart (new items) ─── */}
          <ScrollView style={styles.cartList}>
            {cart.length === 0 && orderedItems.length === 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartTitle}>No items yet</Text>
                <Text style={styles.emptyCartText}>
                  Tap products from the menu to add them.
                </Text>
              </View>
            ) : cart.length === 0 && orderedItems.length > 0 ? (
              <View style={styles.emptyCart}>
                <Text style={styles.emptyCartTitle}>All items sent</Text>
                <Text style={styles.emptyCartText}>
                  Tap products to add more items to this order.
                </Text>
              </View>
            ) : (
              cart.map((item, index) => (
                <TouchableOpacity
                  key={`cart-${item.productId}-${index}`}
                  style={styles.cartItem}
                  onLongPress={() => openEditCartItem(index)}
                >
                  <View style={styles.cartItemTop}>
                    <Text style={styles.cartItemName}>
                      {item.quantity}x {item.name}
                    </Text>
                    <View style={styles.cartItemActions}>
                      <Text style={styles.cartItemPrice}>
                        ${item.totalPrice.toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeCartItem(index)}
                      >
                        <Text style={styles.removeButtonText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  {item.course ? (
                    <Text style={styles.cartCourse}>{item.course}</Text>
                  ) : null}
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

          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Kitchen notes</Text>
            <TextInput
              style={styles.notesInput}
              value={orderNotes}
              onChangeText={setOrderNotes}
              placeholder="Add notes for the kitchen..."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
            />
          </View>

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
              disabled={submitting || cart.length === 0}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>
                  Send to Kitchen {cart.length > 0 ? `(${cart.length})` : ""}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Right Panel: Menu */}
        <View style={styles.rightPanel}>
          <Text style={styles.panelTitle}>Menu</Text>

          {allQuickModifiers.length > 0 && (
            <View style={styles.quickModifiersContainer}>
              <Text style={styles.quickModifiersLabel}>Quick Modifiers</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickModifiersScroll}
              >
                {allQuickModifiers.map((option) => {
                  const isSelected = quickModifiers.some(m => m.id === option.id);
                  return (
                    <TouchableOpacity
                      key={option.id}
                      style={[styles.quickModifierChip, isSelected && styles.quickModifierChipActive]}
                      onPress={() => toggleQuickModifier(option)}
                    >
                      <Text style={[styles.quickModifierText, isSelected && styles.quickModifierTextActive]}>
                        {option.name}
                        {Number(option.priceDelta) > 0 ? ` (+$${Number(option.priceDelta).toFixed(2)})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

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
            <Text style={styles.modalTitle}>
              {editingCartIndex !== null ? "Edit Item" : selectedProduct?.name}
            </Text>
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
                <Text style={styles.addButtonText}>
                  {editingCartIndex !== null ? "Update Item" : "Add to Order"}
                </Text>
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
  quickModifiersContainer: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickModifiersLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickModifiersScroll: {
    flexDirection: "row",
  },
  quickModifierChip: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  quickModifierChipActive: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
  },
  quickModifierText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  quickModifierTextActive: {
    color: "#92400E",
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
  courseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  courseLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  courseScroll: {
    flex: 1,
  },
  courseButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    marginRight: 6,
  },
  courseButtonActive: {
    backgroundColor: "#F97316",
  },
  courseButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  courseButtonTextActive: {
    color: "#FFFFFF",
  },
  orderedSection: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  orderedLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
  },
  orderedItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  orderedItemName: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "600",
  },
  orderedItemPrice: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
  },
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
  cartItemActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  removeButton: {
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: { color: "#DC2626", fontWeight: "900", fontSize: 16, lineHeight: 20 },
  cartCourse: { color: "#F97316", fontSize: 12, fontWeight: "800", marginTop: 2 },
  cartModifier: { color: "#64748B", fontSize: 12, marginTop: 4 },
  notesBox: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
    marginBottom: 6,
  },
  notesInput: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#0F172A",
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
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