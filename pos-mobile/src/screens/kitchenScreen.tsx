import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";
import { useRealtimeStore } from "../store/realtimeStore";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

type KitchenStatus = "PENDING" | "PREPARING" | "READY";

type TicketItem = {
  id: string;
  quantity: number;
  product?: {
    name: string;
  };
  modifiers?: {
    nameSnapshot: string;
    priceDelta?: string | number;
  }[];
};

type KitchenTicket = {
  id: string;
  status: KitchenStatus;
  createdAt: string;
  order: {
    id: string;
    orderNumber: number;
    orderType: "DINE_IN" | "TAKEOUT" | "DELIVERY";
    table?: {
      name: string;
    } | null;
    items: TicketItem[];
  };
};

const STATUSES: KitchenStatus[] = ["PENDING", "PREPARING", "READY"];

export default function KitchenScreen({ navigation }: any) {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const kitchenTickets = useRealtimeStore((s) => s.kitchenTickets);

  const fetchTickets = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/kitchen/tickets");
      setTickets(res.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load kitchen tickets.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Real-time kitchen ticket updates
  useEffect(() => {
    if (kitchenTickets.length === 0) return;

    const latestTicket = kitchenTickets[kitchenTickets.length - 1];
    
    setTickets((prevTickets) => {
      const existingIndex = prevTickets.findIndex(t => t.id === latestTicket.ticketId);
      
      if (existingIndex >= 0) {
        // Update existing ticket
        return prevTickets.map((ticket) =>
          ticket.id === latestTicket.ticketId
            ? { ...ticket, status: latestTicket.status as KitchenStatus }
            : ticket
        );
      } else {
        // This is a new ticket, we need to fetch the full data
        fetchTickets();
        return prevTickets;
      }
    });
  }, [kitchenTickets, fetchTickets]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  const updateTicketStatus = async (
    ticketId: string,
    nextStatus: KitchenStatus
  ) => {
    const previousStatus = tickets.find(t => t.id === ticketId)?.status;
    
    // Optimistic update
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId ? { ...ticket, status: nextStatus } : ticket
      )
    );

    try {
      await api.patch(`/kitchen/tickets/${ticketId}/status`, {
        status: nextStatus,
      });
    } catch (error: any) {
      // Rollback on error
      if (previousStatus) {
        setTickets((prev) =>
          prev.map((ticket) =>
            ticket.id === ticketId ? { ...ticket, status: previousStatus } : ticket
          )
        );
      }
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to update ticket."
      );
    }
  };

  const groupedTickets = useMemo(() => {
    return STATUSES.reduce<Record<KitchenStatus, KitchenTicket[]>>(
      (acc, status) => {
        acc[status] = tickets.filter((ticket) => ticket.status === status);
        return acc;
      },
      {
        PENDING: [],
        PREPARING: [],
        READY: [],
      }
    );
  }, [tickets]);

  const getNextStatus = (status: KitchenStatus): KitchenStatus | null => {
    if (status === "PENDING") return "PREPARING";
    if (status === "PREPARING") return "READY";
    return null;
  };

  const getActionText = (status: KitchenStatus) => {
    if (status === "PENDING") return "Start";
    if (status === "PREPARING") return "Mark Ready";
    return "Ready";
  };

  if (loading) {
    return <LoadingSpinner message="Loading kitchen tickets..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchTickets} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backButtonText}>← Home</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Kitchen Display</Text>
          <Text style={styles.subtitle}>Live kitchen ticket workflow</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.columnsWrapper}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {STATUSES.map((status) => (
          <View key={status} style={styles.column}>
            <View style={styles.columnHeader}>
              <Text style={styles.columnTitle}>{status}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countText}>
                  {groupedTickets[status].length}
                </Text>
              </View>
            </View>

            <FlatList
              data={groupedTickets[status]}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ListEmptyComponent={
                <View style={styles.emptyColumn}>
                  <Text style={styles.emptyText}>No tickets</Text>
                </View>
              }
              renderItem={({ item }) => {
                const nextStatus = getNextStatus(item.status);

                return (
                  <View style={styles.ticketCard}>
                    <View style={styles.ticketTop}>
                      <Text style={styles.orderNumber}>
                        #{item.order.orderNumber}
                      </Text>

                      <Text style={styles.orderType}>
                        {item.order.orderType.replace("_", " ")}
                      </Text>
                    </View>

                    <Text style={styles.tableText}>
                      {item.order.table?.name
                        ? `Table ${item.order.table.name}`
                        : "No table"}
                    </Text>

                    <View style={styles.itemsBox}>
                      {item.order.items.map((orderItem) => (
                        <View key={orderItem.id} style={styles.itemBlock}>
                          <Text style={styles.itemName}>
                            {orderItem.quantity}x{" "}
                            {orderItem.product?.name ?? "Item"}
                          </Text>

                          {orderItem.modifiers?.map((modifier, index) => (
                            <Text
                              key={`${modifier.nameSnapshot}-${index}`}
                              style={styles.modifierText}
                            >
                              + {modifier.nameSnapshot}
                            </Text>
                          ))}
                        </View>
                      ))}
                    </View>

                    {nextStatus ? (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => updateTicketStatus(item.id, nextStatus)}
                      >
                        <Text style={styles.actionButtonText}>
                          {getActionText(item.status)}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.readyBox}>
                        <Text style={styles.readyText}>Ready for service</Text>
                      </View>
                    )}
                  </View>
                );
              }}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centered: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
  },
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
  backButtonText: {
    color: "#334155",
    fontWeight: "900",
  },
  title: {
    fontSize: 30,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 2,
  },
  columnsWrapper: {
    paddingHorizontal: 14,
    paddingBottom: 24,
    gap: 12,
  },
  column: {
    width: 300,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  columnHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  columnTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  countBadge: {
    minWidth: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    color: "#F97316",
    fontWeight: "900",
  },
  emptyColumn: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#94A3B8",
    fontWeight: "700",
  },
  ticketCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  ticketTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 20,
    fontWeight: "900",
    color: "#0F172A",
  },
  orderType: {
    fontSize: 11,
    fontWeight: "900",
    color: "#F97316",
  },
  tableText: {
    color: "#64748B",
    fontWeight: "800",
    marginBottom: 12,
  },
  itemsBox: {
    gap: 10,
  },
  itemBlock: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 14,
  },
  itemName: {
    fontWeight: "900",
    color: "#0F172A",
  },
  modifierText: {
    marginTop: 4,
    color: "#64748B",
    fontSize: 12,
    fontWeight: "700",
  },
  actionButton: {
    marginTop: 14,
    backgroundColor: "#F97316",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  readyBox: {
    marginTop: 14,
    backgroundColor: "#DCFCE7",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  readyText: {
    color: "#16A34A",
    fontWeight: "900",
  },
});