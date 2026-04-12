import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import { Product } from "../utils/types";

interface ProductCardProps {
  product: Product;
  quantityInCart: number;
  onPress: (product: Product) => void;
}

export default function ProductCard({ product, quantityInCart, onPress }: ProductCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, !product.available && styles.cardUnavailable]}
      onPress={() => onPress(product)}
      activeOpacity={product.available ? 0.75 : 1}
    >
      <View style={styles.strip} />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {product.description ? (
          <Text style={styles.desc} numberOfLines={2}>
            {product.description}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={styles.price}>{formatCurrency(product.price)}</Text>
          {quantityInCart > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{quantityInCart}</Text>
            </View>
          )}
          {!product.available && (
            <Text style={styles.unavailable}>Unavailable</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  cardUnavailable: {
    opacity: 0.4,
  },
  strip: {
    height: 4,
    backgroundColor: COLORS.accent,
  },
  body: {
    padding: 14,
  },
  name: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  desc: {
    color: COLORS.muted,
    fontSize: 12,
    marginBottom: 8,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  price: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 16,
  },
  badge: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  unavailable: {
    color: COLORS.muted,
    fontSize: 11,
  },
});