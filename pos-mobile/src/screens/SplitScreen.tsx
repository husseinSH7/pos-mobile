import React, { useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Alert,
  type PanResponderGestureState,
} from "react-native";
import DraggableItemRow, { type DraggableItem } from "../components/DraggableItemRow";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";

interface Split {
  id: string;
  name: string;
  color: string;
  items: DraggableItem[];
}

const SPLIT_COLORS = ["#F97316", "#3B82F6", "#10B981", "#8B5CF6", "#EC4899"];

export default function SplitScreen({ navigation, route }: any) {
  const order = route.params?.order;
  const orderData = route.params?.orderData;

  const originalItems: DraggableItem[] = useMemo(() => {
    const source = orderData?.items ?? order?.items ?? [];
    return source.map((item: any) => {
      const quantity = Number(item.quantity || 1);
      const totalPrice = Number(
        item.totalPrice ?? item.totalAmount ?? 0
      );
      const unitPrice = Number(
        item.unitPrice || (quantity > 0 ? totalPrice / quantity : 0)
      );
      return {
        id: item.id || item.productId || `item_${Math.random().toString(36).substr(2, 8)}`,
        productId: item.productId || item.id,
        name: item.name || item.product?.name || "Item",
        quantity,
        unitPrice,
        totalPrice,
        modifiers: item.modifiers
          ? typeof item.modifiers === "string"
            ? item.modifiers
            : item.modifiers.map((m: any) => m.name).join(", ")
          : undefined,
      };
    });
  }, [order, orderData]);

  const [sourceItems, setSourceItems] = useState<DraggableItem[]>(originalItems);
  const [splits, setSplits] = useState<Split[]>([
    { id: "split-1", name: "Check 1", color: SPLIT_COLORS[0], items: [] },
    { id: "split-2", name: "Check 2", color: SPLIT_COLORS[1], items: [] },
  ]);

  const [dragging, setDragging] = useState<{
    item: DraggableItem;
    width: number;
    height: number;
  } | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const splitRefs = useRef<Record<string, View | null>>({});
  const splitLayouts = useRef<Record<string, { x: number; y: number; width: number; height: number }>>({});

  const addSplit = () => {
    setSplits((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}`,
        name: `Check ${prev.length + 1}`,
        color: SPLIT_COLORS[prev.length % SPLIT_COLORS.length],
        items: [],
      },
    ]);
  };

  const resetSplits = () => {
    setSourceItems(originalItems);
    setSplits((prev) => prev.map((s) => ({ ...s, items: [] })));
  };

  const splitTotal = (items: DraggableItem[]) =>
    items.reduce((sum, item) => sum + item.totalPrice, 0);

  const moveItemToSplit = (item: DraggableItem, splitId: string) => {
    setSourceItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (!existing) return prev;

      if (existing.quantity > 1) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.quantity - 1,
                totalPrice: (i.quantity - 1) * i.unitPrice,
              }
            : i
        );
      }
      return prev.filter((i) => i.id !== item.id);
    });

    setSplits((prev) =>
      prev.map((split) => {
        if (split.id !== splitId) return split;
        const existing = split.items.find((i) => i.id === item.id);
        if (existing) {
          return {
            ...split,
            items: split.items.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    quantity: i.quantity + 1,
                    totalPrice: (i.quantity + 1) * i.unitPrice,
                  }
                : i
            ),
          };
        }
        return {
          ...split,
          items: [
            ...split.items,
            { ...item, quantity: 1, totalPrice: item.unitPrice },
          ],
        };
      })
    );
  };

  const returnToSource = (item: DraggableItem, splitId: string) => {
    setSplits((prev) =>
      prev.map((split) => {
        if (split.id !== splitId) return split;
        const existing = split.items.find((i) => i.id === item.id);
        if (!existing) return split;

        if (existing.quantity > 1) {
          return {
            ...split,
            items: split.items.map((i) =>
              i.id === item.id
                ? {
                    ...i,
                    quantity: i.quantity - 1,
                    totalPrice: (i.quantity - 1) * i.unitPrice,
                  }
                : i
            ),
          };
        }
        return { ...split, items: split.items.filter((i) => i.id !== item.id) };
      })
    );

    setSourceItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                quantity: i.quantity + 1,
                totalPrice: (i.quantity + 1) * i.unitPrice,
              }
            : i
        );
      }
      return [...prev, { ...item, quantity: 1, totalPrice: item.unitPrice }];
    });
  };

  const handleDragStart = (
    item: DraggableItem,
    layout: { x: number; y: number; width: number; height: number }
  ) => {
    pan.setOffset({ x: layout.x, y: layout.y });
    pan.setValue({ x: 0, y: 0 });
    setDragging({ item, width: layout.width, height: layout.height });

    // Measure all drop targets
    Object.entries(splitRefs.current).forEach(([id, ref]) => {
      ref?.measureInWindow((x, y, width, height) => {
        splitLayouts.current[id] = { x, y, width, height };
      });
    });
  };

  const handleDragEnd = (gestureState: PanResponderGestureState) => {
    const { moveX, moveY } = gestureState;
    let targetId: string | null = null;

    for (const [id, rect] of Object.entries(splitLayouts.current)) {
      if (
        moveX >= rect.x &&
        moveX <= rect.x + rect.width &&
        moveY >= rect.y &&
        moveY <= rect.y + rect.height
      ) {
        targetId = id;
        break;
      }
    }

    if (targetId && dragging) {
      moveItemToSplit(dragging.item, targetId);
    }

    setDragging(null);
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });
  };

  const handlePaySplit = (split: Split) => {
    if (split.items.length === 0) {
      Alert.alert("Empty split", "Add at least one item before paying.");
      return;
    }

    const subtotal = splitTotal(split.items);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    navigation.navigate("Payment", {
      split: {
        name: split.name,
        items: split.items,
        subtotal,
        tax,
        total,
      },
      order,
      orderData,
    });
  };

  const allSplitsTotal = useMemo(
    () => splits.reduce((sum, split) => sum + splitTotal(split.items), 0),
    [splits]
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Split Bill</Text>
          <Text style={styles.headerSub}>
            Drag items from the order into checks
          </Text>
        </View>
      </View>

      <View style={styles.splitsContainer}>
        <View style={styles.splitsHeader}>
          <Text style={styles.sectionTitle}>Checks</Text>
          <TouchableOpacity onPress={addSplit} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!dragging}
          contentContainerStyle={styles.splitsRowContent}
          style={styles.splitsRow}
        >
          {splits.map((split) => (
            <View
              key={split.id}
              ref={(ref) => { splitRefs.current[split.id] = ref; }}
              style={[styles.splitCard, { borderColor: split.color }]}
            >
              <Text style={[styles.splitName, { color: split.color }]}>
                {split.name}
              </Text>
              <Text style={styles.splitTotal}>
                {formatCurrency(splitTotal(split.items))}
              </Text>
              <ScrollView style={styles.splitItems} nestedScrollEnabled>
                {split.items.map((item, index) => (
                  <View key={`${item.id}-${index}`} style={styles.splitItemRow}>
                    <View style={styles.splitItemInfo}>
                      <Text style={styles.splitItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.splitItemMeta}>
                        x{item.quantity} · {formatCurrency(item.totalPrice)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => returnToSource(item, split.id)}
                      style={styles.removeBtn}
                    >
                      <Text style={styles.removeText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={[styles.paySplitBtn, { backgroundColor: split.color }]}
                onPress={() => handlePaySplit(split)}
              >
                <Text style={styles.paySplitText}>Pay {split.name}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.sourceHeader}>
        <Text style={styles.sectionTitle}>Unassigned Items</Text>
        <View style={styles.sourceTotals}>
          <Text style={styles.sourceTotal}>
            Split: {formatCurrency(allSplitsTotal)}
          </Text>
          <Text style={styles.sourceTotal}>
            Left: {formatCurrency(
              sourceItems.reduce((sum, item) => sum + item.totalPrice, 0)
            )}
          </Text>
        </View>
        <TouchableOpacity onPress={resetSplits} style={styles.resetBtn}>
          <Text style={styles.resetText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.sourceList}
        contentContainerStyle={styles.sourceListContent}
        scrollEnabled={!dragging}
      >
        {sourceItems.length === 0 ? (
          <Text style={styles.emptyText}>All items have been split</Text>
        ) : (
          sourceItems.map((item) => (
            <DraggableItemRow
              key={item.id}
              item={item}
              pan={pan}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            />
          ))
        )}
      </ScrollView>

      {dragging && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.dragOverlay,
            {
              width: dragging.width,
              height: dragging.height,
              transform: [{ translateX: pan.x }, { translateY: pan.y }],
            },
          ]}
        >
          <View style={styles.dragOverlayInner}>
            <Text style={styles.dragOverlayName}>{dragging.item.name}</Text>
            <Text style={styles.dragOverlayTotal}>
              {formatCurrency(dragging.item.unitPrice)}
            </Text>
          </View>
        </Animated.View>
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
  splitsContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  splitsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    color: COLORS.accent,
    fontWeight: "700",
    fontSize: 13,
  },
  splitsRow: {
    maxHeight: 320,
  },
  splitsRowContent: {
    flexDirection: "row",
    gap: 10,
    paddingRight: 16,
  },
  splitCard: {
    width: 220,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginRight: 10,
  },
  splitName: {
    fontSize: 15,
    fontWeight: "800",
  },
  splitTotal: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    marginVertical: 8,
  },
  splitItems: {
    maxHeight: 180,
    marginBottom: 10,
  },
  splitItemRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bg,
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
  },
  splitItemInfo: {
    flex: 1,
  },
  splitItemName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "700",
  },
  splitItemMeta: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 2,
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: "#3A1A1A",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  removeText: {
    color: COLORS.error,
    fontSize: 11,
    fontWeight: "700",
  },
  paySplitBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  paySplitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  sourceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sourceTotals: {
    flexDirection: "row",
    gap: 10,
  },
  sourceTotal: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  resetBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  resetText: {
    color: COLORS.error,
    fontWeight: "700",
    fontSize: 13,
  },
  sourceList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sourceListContent: {
    paddingBottom: 20,
  },
  emptyText: {
    color: COLORS.muted,
    textAlign: "center",
    paddingVertical: 40,
  },
  dragOverlay: {
    position: "absolute",
    left: 0,
    top: 0,
    zIndex: 999,
  },
  dragOverlayInner: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.accent,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dragOverlayName: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
    flex: 1,
  },
  dragOverlayTotal: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 15,
  },
});
