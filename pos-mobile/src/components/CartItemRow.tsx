import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import { CartItem } from "../store/cartStore";

interface CartItemRowProps {
  item: CartItem;
  onIncrease: () => void;
  onDecrease: () => void;
  onRemove: () => void;
}

export default function CartItemRow({ item, onIncrease, onDecrease, onRemove }: CartItemRowProps) {
  const itemTotal = item.price * item.quantity;

  return (
    <View style={styles.row}>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.modifiers?.map((m) => (
          <Text key={m.id} style={styles.modifier}>
            + {m.name} ({formatCurrency(m.price)})
          </Text>
        ))}
        <Text style={styles.unitPrice}>{formatCurrency(item.price)} each</Text>
      </View>

      <View style={styles.right}>
        <Text style={styles.total}>{formatCurrency(itemTotal)}</Text>
        <View style={styles.controls}>
          <TouchableOpacity style={styles.btn} onPress={onDecrease}>
            <Text style={styles.btnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.qty}>{item.quantity}</Text>
          <TouchableOpacity style={styles.btn} onPress={onIncrease}>
            <Text style={styles.btnText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  info: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 2,
  },
  modifier: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 1,
  },
  unitPrice: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
  },
  total: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 16,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  btn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
  },
  qty: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 16,
    minWidth: 20,
    textAlign: "center",
  },
  removeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#3A1A1A",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBtnText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: "700",
  },
});