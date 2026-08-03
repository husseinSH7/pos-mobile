import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";
import { useRealtimeStore } from "../store/realtimeStore";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

type Order = {
  id: string;
  orderNumber: number;
  orderType: "DINE_IN" | "TAKEOUT" | "DELIVERY";
  status: "OPEN" | "PAID" | "VOIDED" | "COMPLETED";
  totalAmount: string | number;
  createdAt: string;
  table?: {
    name: string;
  } | null;
  customer?: {
    fullName: string;
  } | null;
  items: {
    id: string;
    quantity: number;
    product?: {
      name: string;
    } | null;
  }[];
};

export default function OrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const recentOrders = useRealtimeStore((s) => s.recentOrders);

  const fetchOrders = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/orders");
      setOrders(res.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load orders.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Real-time order updates
  useEffect(() => {
    if (recentOrders.length === 0) return;

    const latestOrder = recentOrders[0];
    
    setOrders((prevOrders) => {
      const existingIndex = prevOrders.findIndex(o => o.id === latestOrder.orderId);
      
      if (existingIndex >= 0) {
        // Update existing order
        return prevOrders.map((order) =>
          order.id === latestOrder.orderId
            ? { ...order, status: latestOrder.status as "OPEN" | "PAID" | "VOIDED" | "COMPLETED" }
            : order
        );
      } else {
        // This is a new order, we need to fetch the full data
        fetchOrders();
        return prevOrders;
      }
    });
  }, [recentOrders, fetchOrders]);

  const summary = useMemo(() => {
    return {
      open: orders.filter((order) => order.status === "OPEN").length,
      total: orders.reduce(
        (sum, order) => sum + Number(order.totalAmount || 0),
        0
      ),
    };
  }, [orders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  if (loading) {
    return <LoadingSpinner message="Loading orders..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchOrders} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backButtonText}>Home</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>Active and recent orders</Text>
        </View>
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => navigation.navigate("PaymentHistory")}
        >
          <Text style={styles.historyButtonText}>History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{orders.length}</Text>
          <Text style={styles.summaryLabel}>Recent</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{summary.open}</Text>
          <Text style={styles.summaryLabel}>Open</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>${summary.total.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Sales</Text>
        </View>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No orders yet</Text>
            <Text style={styles.emptySubtitle}>
              Create an order from Sales to see it here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.cardTop}>
              <View>
                <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
                <Text style={styles.orderMeta}>
                  {item.table?.name ? `Table ${item.table.name}` : item.orderType}
                  {item.customer?.fullName ? ` - ${item.customer.fullName}` : ""}
                </Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>

            <View style={styles.itemsBox}>
              {item.items.slice(0, 3).map((orderItem) => (
                <Text key={orderItem.id} style={styles.itemText}>
                  {orderItem.quantity}x {orderItem.product?.name ?? "Item"}
                </Text>
              ))}
            </View>

            {item.status === "OPEN" && (
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.payButton]}
                  onPress={() =>
                    navigation.navigate("Payment", { order: item })
                  }
                >
                  <Text style={styles.actionButtonText}>Pay</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.splitButton]}
                  onPress={() =>
                    navigation.navigate("Split", { order: item })
                  }
                >
                  <Text style={styles.actionButtonText}>Split</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.cardFooter}>
              <Text style={styles.dateText}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              <Text style={styles.totalText}>
                ${Number(item.totalAmount || 0).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
      />
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
    paddingVertical: 16,
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
  backButtonText: { color: "#334155", fontWeight: "900" },
  title: { fontSize: 30, fontWeight: "900", color: "#0F172A" },
  subtitle: { color: "#64748B", marginTop: 2 },
  summaryRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    gap: 10,
    marginBottom: 14,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryValue: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "800",
  },
  listContent: { paddingHorizontal: 18, paddingBottom: 28 },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  orderNumber: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  orderMeta: { marginTop: 3, color: "#64748B", fontWeight: "700" },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#FFF7ED",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: { color: "#F97316", fontWeight: "900", fontSize: 11 },
  itemsBox: { marginTop: 14, gap: 5 },
  itemText: { color: "#334155", fontWeight: "700" },
  cardFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: { color: "#94A3B8", fontSize: 12, fontWeight: "700" },
  totalText: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
  emptyState: {
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  emptySubtitle: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  historyButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginLeft: "auto",
  },
  historyButtonText: { color: "#334155", fontWeight: "900", fontSize: 13 },
  cardActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  payButton: {
    backgroundColor: "#0F172A",
  },
  splitButton: {
    backgroundColor: "#F97316",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 13,
  },
});
