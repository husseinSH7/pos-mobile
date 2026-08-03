import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";
import type { PaymentRecord } from "../store/paymentStore";

interface ReceiptModalProps {
  visible: boolean;
  payment: PaymentRecord | null;
  onClose: () => void;
  onPrint?: () => void;
}

const { width: screenWidth } = Dimensions.get("window");

export default function ReceiptModal({
  visible,
  payment,
  onClose,
  onPrint,
}: ReceiptModalProps) {
  if (!payment) return null;

  const {
    receiptNumber,
    orderNumber,
    tableName,
    createdAt,
    items,
    subtotal,
    tax,
    total,
    paymentMethod,
    amountTendered,
    change,
  } = payment;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>RECEIPT</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.shopInfo}>
              <Text style={styles.shopName}>Demo Restaurant</Text>
              <Text style={styles.shopMeta}>Thank you for dining with us</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Receipt #</Text>
              <Text style={styles.metaValue}>{receiptNumber}</Text>
            </View>
            {orderNumber ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Order #</Text>
                <Text style={styles.metaValue}>#{orderNumber}</Text>
              </View>
            ) : null}
            {tableName ? (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Table</Text>
                <Text style={styles.metaValue}>{tableName}</Text>
              </View>
            ) : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>
                {new Date(createdAt).toLocaleString()}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Payment</Text>
              <Text style={styles.metaValue}>{paymentMethod}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.itemsHeader}>
              <Text style={[styles.itemText, { flex: 1 }]}>Item</Text>
              <Text style={[styles.itemText, { width: 40, textAlign: "center" }]}>
                Qty
              </Text>
              <Text style={[styles.itemText, { width: 70, textAlign: "right" }]}>
                Total
              </Text>
            </View>

            {items.map((item, index) => (
              <View key={`${item.productId}-${index}`} style={styles.itemRow}>
                <Text style={[styles.itemName, { flex: 1 }]} numberOfLines={2}>
                  {item.name}
                </Text>
                <Text
                  style={[styles.itemQty, { width: 40, textAlign: "center" }]}
                >
                  {item.quantity}
                </Text>
                <Text
                  style={[
                    styles.itemTotal,
                    { width: 70, textAlign: "right" },
                  ]}
                >
                  {formatCurrency(item.totalPrice)}
                </Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalValue}>{formatCurrency(subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Tax</Text>
                <Text style={styles.totalValue}>{formatCurrency(tax)}</Text>
              </View>
              <View style={[styles.totalRow, styles.grandTotal]}>
                <Text style={styles.grandLabel}>Total</Text>
                <Text style={styles.grandValue}>{formatCurrency(total)}</Text>
              </View>

              {typeof amountTendered === "number" && amountTendered > 0 ? (
                <>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tendered</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(amountTendered)}
                    </Text>
                  </View>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Change</Text>
                    <Text style={styles.totalValue}>
                      {formatCurrency(change || 0)}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>

            <Text style={styles.footerNote}>
              Receipt generated by POS Mobile
            </Text>
          </ScrollView>

          <View style={styles.actions}>
            {onPrint ? (
              <TouchableOpacity style={styles.printBtn} onPress={onPrint}>
                <Text style={styles.printText}>Print Receipt</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: Math.min(screenWidth - 40, 420),
    maxHeight: "85%",
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  closeText: {
    color: COLORS.muted,
    fontWeight: "700",
    fontSize: 14,
  },
  body: {
    padding: 20,
  },
  shopInfo: {
    alignItems: "center",
    marginBottom: 12,
  },
  shopName: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.text,
  },
  shopMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaLabel: {
    fontSize: 13,
    color: COLORS.muted,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  itemsHeader: {
    flexDirection: "row",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.muted,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },
  itemName: {
    fontSize: 14,
    color: COLORS.text,
  },
  itemQty: {
    fontSize: 13,
    color: COLORS.text,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.text,
  },
  totals: {
    gap: 6,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalLabel: {
    fontSize: 14,
    color: COLORS.muted,
  },
  totalValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  grandLabel: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.text,
  },
  grandValue: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.accent,
  },
  footerNote: {
    fontSize: 11,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  printBtn: {
    flex: 1,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  printText: {
    color: COLORS.text,
    fontWeight: "700",
    fontSize: 14,
  },
  doneBtn: {
    flex: 1,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  doneText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
