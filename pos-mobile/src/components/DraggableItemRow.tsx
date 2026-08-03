import React, { useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  PanResponder,
  Animated,
  type PanResponderGestureState,
} from "react-native";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";

export interface DraggableItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  modifiers?: string;
}

interface DraggableItemRowProps {
  item: DraggableItem;
  pan: Animated.ValueXY;
  onDragStart: (
    item: DraggableItem,
    layout: { x: number; y: number; width: number; height: number }
  ) => void;
  onDragEnd: (gestureState: PanResponderGestureState) => void;
}

export default function DraggableItemRow({
  item,
  pan,
  onDragStart,
  onDragEnd,
}: DraggableItemRowProps) {
  const rowRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        rowRef.current?.measureInWindow((x, y, width, height) => {
          onDragStart(item, { x, y, width, height });
        });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        onDragEnd(gestureState);
      },
      onPanResponderTerminate: (_, gestureState) => {
        onDragEnd(gestureState);
      },
    })
  ).current;

  return (
    <View ref={rowRef} style={styles.row}>
      <View style={styles.dragHandle} {...panResponder.panHandlers}>
        <Text style={styles.dragIcon}>≡</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.name}</Text>
        {item.modifiers ? (
          <Text style={styles.modifiers}>{item.modifiers}</Text>
        ) : null}
        <Text style={styles.unitPrice}>
          {formatCurrency(item.unitPrice)} each
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.total}>{formatCurrency(item.totalPrice)}</Text>
        <Text style={styles.quantity}>x{item.quantity}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dragHandle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  dragIcon: {
    color: COLORS.muted,
    fontSize: 18,
    fontWeight: "800",
  },
  info: {
    flex: 1,
  },
  name: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 15,
  },
  modifiers: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
  unitPrice: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 4,
  },
  right: {
    alignItems: "flex-end",
  },
  total: {
    color: COLORS.accent,
    fontWeight: "800",
    fontSize: 16,
  },
  quantity: {
    color: COLORS.muted,
    fontSize: 12,
    marginTop: 2,
  },
});
