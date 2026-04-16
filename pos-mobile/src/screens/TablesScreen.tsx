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
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { COLORS } from "../utils/colors";

interface Table {
  id: string;
  name: string;
  seats: number | null;
  area: string | null;
  isActive: boolean;
  hasOpenOrder?: boolean;
  openOrderId?: string | null;
}

export default function TablesScreen({ navigation }: any) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingTableId, setLoadingTableId] = useState<string | null>(null);
  const [creatingTable, setCreatingTable] = useState(false);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setActiveTableOrder = useActiveOrderStore((s) => s.setActiveTableOrder);

  const fetchTables = useCallback(async () => {
    try {
      const res = await api.get("/tables");
      setTables(res.data);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to load tables.";
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const handleCreateTable = async () => {
    setCreatingTable(true);
    try {
      const res = await api.post("/tables", {
        seats: 4,
        area: "Main Hall",
      });

      const newTable = res.data;
      setTables((prev) => [...prev, newTable]);

      Alert.alert("Success", `${newTable.name} created successfully.`);
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Failed to create table.";
      Alert.alert("Error", message);
    } finally {
      setCreatingTable(false);
    }
  };

  const handleTablePress = async (table: Table) => {
    setLoadingTableId(table.id);

    try {
      setActiveTableOrder({
        tableId: table.id,
        tableName: table.name,
        orderId: null,
        orderNumber: null,
      });

      navigation.navigate("Order");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Could not open table. Try again.";
      Alert.alert("Error", message);
    } finally {
      setLoadingTableId(null);
    }
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading tables...</Text>
      </View>
    );
  }

  const visibleTables = tables.filter((t) => t.isActive);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.screenTitle}>Tables</Text>
          <Text style={styles.screenSub}>Welcome, {user?.name ?? "Staff"}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>↩</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionsBar}>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={handleCreateTable}
          disabled={creatingTable}
        >
          {creatingTable ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.createBtnText}>+ Create Table</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={visibleTables}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
          />
        }
        renderItem={({ item }) => {
          const isLoading = loadingTableId === item.id;
          const isOccupied = !!item.hasOpenOrder;

          return (
            <TouchableOpacity
              style={[
                styles.card,
                isOccupied ? styles.cardOccupied : styles.cardFree,
              ]}
              onPress={() => handleTablePress(item)}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <>
                  <View style={styles.cardTop}>
                    <Text style={styles.tableName}>{item.name}</Text>
                    <View
                      style={[
                        styles.statusDot,
                        {
                          backgroundColor: isOccupied
                            ? COLORS.error
                            : "#22c55e",
                        },
                      ]}
                    />
                  </View>

                  {item.area ? (
                    <Text style={styles.tableArea}>{item.area}</Text>
                  ) : null}

                  {item.seats ? (
                    <Text style={styles.tableMeta}>
                      {item.seats} seat{item.seats !== 1 ? "s" : ""}
                    </Text>
                  ) : null}

                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: isOccupied
                          ? "rgba(239,68,68,0.12)"
                          : "rgba(34,197,94,0.12)",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: isOccupied ? COLORS.error : "#22c55e" },
                      ]}
                    >
                      {isOccupied ? "Occupied" : "Available"}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <Text style={styles.emptyText}>No tables found</Text>
            <TouchableOpacity
              style={styles.emptyCreateBtn}
              onPress={handleCreateTable}
              disabled={creatingTable}
            >
              {creatingTable ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.emptyCreateBtnText}>Create First Table</Text>
              )}
            </TouchableOpacity>
          </View>
        }
      />
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
  actionsBar: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  createBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 12,
    paddingBottom: 24,
    paddingTop: 8,
    flexGrow: 1,
  },
  row: { justifyContent: "space-between" },
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  cardFree: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
  },
  cardOccupied: {
    backgroundColor: COLORS.surface,
    borderColor: "rgba(239,68,68,0.3)",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tableName: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  tableArea: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  tableMeta: {
    fontSize: 12,
    color: COLORS.muted,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyText: { color: COLORS.muted, fontSize: 14, marginBottom: 12 },
  emptyCreateBtn: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyCreateBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});