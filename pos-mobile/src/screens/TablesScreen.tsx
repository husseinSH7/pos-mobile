import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { useActiveOrderStore } from "../store/activeOrderStore";
import { COLORS } from "../utils/colors";

interface TableArea {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
  seats: number | null;
  area?: string | null;
  areaId?: string | null;
  areaName?: string | null;
  areaRelation?: TableArea | null;
  isActive: boolean;
  status?: "AVAILABLE" | "OCCUPIED" | "RESERVED" | "DISABLED";
  hasOpenOrder?: boolean;
  openOrderId?: string | null;
}

export default function TablesScreen({ navigation }: any) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedArea, setSelectedArea] = useState<string>("All");
  const [loadingTableId, setLoadingTableId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("4");
  const [newTableArea, setNewTableArea] = useState("Main Hall");

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setActiveTableOrder = useActiveOrderStore((s) => s.setActiveTableOrder);

  const getTableAreaName = (table: Table) => {
    return (
      table.areaName ||
      table.areaRelation?.name ||
      table.area ||
      "Main Hall"
    );
  };

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

  const visibleTables = tables.filter((t) => t.isActive);

  const areas = useMemo(() => {
    const unique = Array.from(
      new Set(visibleTables.map((table) => getTableAreaName(table)))
    );

    return ["All", ...unique];
  }, [visibleTables]);

  const filteredTables =
    selectedArea === "All"
      ? visibleTables
      : visibleTables.filter(
          (table) => getTableAreaName(table) === selectedArea
        );

  const onRefresh = () => {
    setRefreshing(true);
    fetchTables();
  };

  const handleCreateTable = async () => {
    if (!newTableName.trim()) {
      Alert.alert("Missing table name", "Please enter a table name.");
      return;
    }

    setCreatingTable(true);

    try {
      const res = await api.post("/tables", {
        name: newTableName.trim(),
        seats: Number(newTableSeats) || 2,
        area: newTableArea.trim() || "Main Hall",
      });

      setTables((prev) => [...prev, res.data]);
      setModalVisible(false);
      setNewTableName("");
      setNewTableSeats("4");
      setNewTableArea("Main Hall");

      Alert.alert("Success", `Table ${res.data.name} created successfully.`);
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
        orderId: table.openOrderId ?? null,
        orderNumber: null,
      });

      navigation.navigate("Order");
    } catch (error: any) {
      const message =
        error?.response?.data?.message || "Could not open table.";
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

  const handleBackHome = () => {
    navigation.navigate("Home");
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading tables...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Tables</Text>
          <Text style={styles.title}>Dining Areas</Text>
          <Text style={styles.subtitle}>
            Welcome, {user?.name ?? "Staff"}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.smallButton} onPress={handleBackHome}>
            <Text style={styles.smallButtonText}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>↩</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{visibleTables.length}</Text>
          <Text style={styles.summaryLabel}>Tables</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {visibleTables.filter((t) => t.hasOpenOrder || t.status === "OCCUPIED").length}
          </Text>
          <Text style={styles.summaryLabel}>Occupied</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {visibleTables.filter((t) => !t.hasOpenOrder && t.status !== "OCCUPIED").length}
          </Text>
          <Text style={styles.summaryLabel}>Available</Text>
        </View>
      </View>

      <View style={styles.areaTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {areas.map((area) => {
            const active = selectedArea === area;

            return (
              <TouchableOpacity
                key={area}
                onPress={() => setSelectedArea(area)}
                style={[styles.areaTab, active && styles.areaTabActive]}
              >
                <Text
                  style={[
                    styles.areaTabText,
                    active && styles.areaTabTextActive,
                  ]}
                >
                  {area}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.actionRow}>
        <Text style={styles.sectionTitle}>
          {selectedArea === "All" ? "All Tables" : selectedArea}
        </Text>

        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.createButtonText}>+ Add Table</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredTables}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.tableRow}
        contentContainerStyle={styles.listContent}
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
          const isOccupied = !!item.hasOpenOrder || item.status === "OCCUPIED";
          const areaName = getTableAreaName(item);

          return (
            <TouchableOpacity
              style={[
                styles.tableCard,
                isOccupied ? styles.tableCardOccupied : styles.tableCardFree,
              ]}
              onPress={() => handleTablePress(item)}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <>
                  <View style={styles.cardTop}>
                    <View>
                      <Text style={styles.tableLabel}>Table</Text>
                      <Text style={styles.tableName}>{item.name}</Text>
                    </View>

                    <View
                      style={[
                        styles.statusPill,
                        isOccupied
                          ? styles.statusPillOccupied
                          : styles.statusPillAvailable,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isOccupied
                            ? styles.statusTextOccupied
                            : styles.statusTextAvailable,
                        ]}
                      >
                        {isOccupied ? "Occupied" : "Available"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardMeta}>
                    <Text style={styles.metaText}>📍 {areaName}</Text>
                    <Text style={styles.metaText}>
                      👥 {item.seats ?? 2} seats
                    </Text>
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.footerText}>
                      {isOccupied ? "Open order" : "Tap to start order"}
                    </Text>
                  </View>
                </>
              )}
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No tables found</Text>
            <Text style={styles.emptySubtitle}>
              Add your first table to start dine-in orders.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Create First Table</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Table</Text>
            <Text style={styles.modalSubtitle}>
              Create a flexible table that can be shown in list or layout mode.
            </Text>

            <Text style={styles.inputLabel}>Table name</Text>
            <TextInput
              value={newTableName}
              onChangeText={setNewTableName}
              placeholder="Example: 12"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Seats</Text>
            <TextInput
              value={newTableSeats}
              onChangeText={setNewTableSeats}
              keyboardType="number-pad"
              placeholder="4"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Area</Text>
            <TextInput
              value={newTableArea}
              onChangeText={setNewTableArea}
              placeholder="Main Hall"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={creatingTable}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleCreateTable}
                disabled={creatingTable}
              >
                {creatingTable ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Table</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    fontSize: 14,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  eyebrow: {
    color: "#F97316",
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#0F172A",
    marginTop: 2,
  },
  subtitle: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  smallButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  smallButtonText: {
    color: "#334155",
    fontWeight: "800",
  },
  logoutButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    fontSize: 18,
    color: "#64748B",
  },
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
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "700",
  },
  areaTabsWrapper: {
    paddingLeft: 18,
    marginBottom: 12,
  },
  areaTab: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 10,
  },
  areaTabActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  areaTabText: {
    color: "#475569",
    fontWeight: "800",
    fontSize: 13,
  },
  areaTabTextActive: {
    color: "#FFFFFF",
  },
  actionRow: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0F172A",
  },
  createButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 14,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 28,
    flexGrow: 1,
  },
  tableRow: {
    justifyContent: "space-between",
  },
  tableCard: {
    flex: 1,
    minHeight: 170,
    margin: 7,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  tableCardFree: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E2E8F0",
  },
  tableCardOccupied: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FDBA74",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  tableLabel: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tableName: {
    fontSize: 34,
    color: "#0F172A",
    fontWeight: "900",
    marginTop: 2,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusPillAvailable: {
    backgroundColor: "#DCFCE7",
  },
  statusPillOccupied: {
    backgroundColor: "#FEE2E2",
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "900",
  },
  statusTextAvailable: {
    color: "#16A34A",
  },
  statusTextOccupied: {
    color: "#DC2626",
  },
  cardMeta: {
    gap: 5,
  },
  metaText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  cardFooter: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.25)",
    paddingTop: 10,
  },
  footerText: {
    color: "#64748B",
    fontSize: 13,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    minHeight: 320,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  emptySubtitle: {
    marginTop: 8,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: 18,
    backgroundColor: "#F97316",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    padding: 22,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
  },
  modalSubtitle: {
    color: "#64748B",
    marginTop: 6,
    marginBottom: 18,
    lineHeight: 20,
  },
  inputLabel: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    fontSize: 15,
    color: "#0F172A",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#334155",
    fontWeight: "900",
  },
  saveButton: {
    flex: 1,
    backgroundColor: "#F97316",
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
});