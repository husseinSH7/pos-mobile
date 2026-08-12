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
import { useRealtimeStore } from "../store/realtimeStore";
import { COLORS } from "../utils/colors";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";

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
  status?: "AVAILABLE" | "OCCUPIED" | "PAID" | "RESERVED" | "NEEDS_ATTENTION" | "DISABLED";
  hasOpenOrder?: boolean;
  openOrderId?: string | null;
  guestCount?: number;
  serverId?: string | null;
  serverName?: string | null;
  occupiedAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  x?: number | null;
  y?: number | null;
  width?: number | null;
  height?: number | null;
  shape?: "RECTANGLE" | "SQUARE" | "ROUND" | null;
  rotation?: number | null;
}

export default function TablesScreen({ navigation }: any) {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedArea, setSelectedArea] = useState<string>("All");
  const [loadingTableId, setLoadingTableId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "floor">("list");

  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [selectedTableForTransfer, setSelectedTableForTransfer] = useState<Table | null>(null);
  const [targetTableId, setTargetTableId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState(false);

  const [mergeModalVisible, setMergeModalVisible] = useState(false);
  const [selectedTablesForMerge, setSelectedTablesForMerge] = useState<Table[]>([]);
  const [targetTableForMerge, setTargetTableForMerge] = useState<Table | null>(null);
  const [merging, setMerging] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [creatingTable, setCreatingTable] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableSeats, setNewTableSeats] = useState("4");
  const [newTableArea, setNewTableArea] = useState("Main Hall");

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setActiveTableOrder = useActiveOrderStore((s) => s.setActiveTableOrder);
  const tableUpdates = useRealtimeStore((s) => s.tableUpdates);

  const getTableAreaName = (table: Table) => {
    return (
      table.areaName ||
      table.areaRelation?.name ||
      table.area ||
      "Main Hall"
    );
  };

  const getTableStatusColor = (status?: string) => {
    switch (status) {
      case "AVAILABLE":
        return "#DCFCE7";
      case "OCCUPIED":
        return "#DBEAFE";
      case "PAID":
        return "#FEF3C7";
      case "RESERVED":
        return "#E0E7FF";
      case "NEEDS_ATTENTION":
        return "#FEE2E2";
      case "DISABLED":
        return "#F1F5F9";
      default:
        return "#DCFCE7";
    }
  };

  const getTableStatusTextColor = (status?: string) => {
    switch (status) {
      case "AVAILABLE":
        return "#16A34A";
      case "OCCUPIED":
        return "#2563EB";
      case "PAID":
        return "#D97706";
      case "RESERVED":
        return "#4F46E5";
      case "NEEDS_ATTENTION":
        return "#DC2626";
      case "DISABLED":
        return "#64748B";
      default:
        return "#16A34A";
    }
  };

  const getTableStatusLabel = (status?: string) => {
    switch (status) {
      case "AVAILABLE":
        return "Available";
      case "OCCUPIED":
        return "Occupied";
      case "PAID":
        return "Paid";
      case "RESERVED":
        return "Reserved";
      case "NEEDS_ATTENTION":
        return "Needs Attention";
      case "DISABLED":
        return "Disabled";
      default:
        return "Available";
    }
  };

  const fetchTables = useCallback(async () => {
    try {
      setError(null);
      const res = await api.get("/tables");
      setTables(res.data);
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to load tables.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  // Real-time table status updates
  useEffect(() => {
    if (tableUpdates.length === 0) return;

    const latestUpdate = tableUpdates[0];
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === latestUpdate.tableId
          ? {
              ...table,
              status: latestUpdate.status as "AVAILABLE" | "OCCUPIED" | "PAID" | "RESERVED" | "NEEDS_ATTENTION" | "DISABLED",
              hasOpenOrder: latestUpdate.status === "OCCUPIED",
              openOrderId: latestUpdate.orderId || null,
              guestCount: latestUpdate.guestCount,
              serverId: latestUpdate.serverId,
            }
          : table
      )
    );
  }, [tableUpdates]);

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

    // Optimistic update
    const tempTable: Table = {
      id: `temp-${Date.now()}`,
      name: newTableName.trim(),
      seats: Number(newTableSeats) || 2,
      area: newTableArea.trim() || "Main Hall",
      areaName: newTableArea.trim() || "Main Hall",
      isActive: true,
      status: "AVAILABLE",
      hasOpenOrder: false,
      openOrderId: null,
    };

    setTables((prev) => [...prev, tempTable]);
    setModalVisible(false);
    setNewTableName("");
    setNewTableSeats("4");
    setNewTableArea("Main Hall");

    try {
      const res = await api.post("/tables", {
        name: tempTable.name,
        seats: tempTable.seats,
        area: tempTable.area,
      });
      setTables((prev) => prev.map((t) => t.id === tempTable.id ? res.data : t));
    } catch (error: any) {
      setTables((prev) => prev.filter((t) => t.id !== tempTable.id));
      const message = error?.response?.data?.message || "Failed to create table.";
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
      const message = error?.response?.data?.message || "Could not open table.";
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

  const handleTransferTable = async () => {
    if (!selectedTableForTransfer || !targetTableId) {
      Alert.alert("Error", "Please select a target table");
      return;
    }

    setTransferring(true);

    try {
      await api.post(`/tables/${selectedTableForTransfer.id}/transfer`, {
        targetTableId,
      });

      Alert.alert("Success", "Table transferred successfully");
      setTransferModalVisible(false);
      setSelectedTableForTransfer(null);
      setTargetTableId(null);
      fetchTables();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to transfer table";
      Alert.alert("Error", message);
    } finally {
      setTransferring(false);
    }
  };

  const handleMergeTables = async () => {
    if (selectedTablesForMerge.length === 0 || !targetTableForMerge) {
      Alert.alert("Error", "Please select tables to merge");
      return;
    }

    setMerging(true);

    try {
      const sourceTableIds = selectedTablesForMerge.map(t => t.id);
      await api.post("/tables/merge", {
        sourceTableIds,
        targetTableId: targetTableForMerge.id,
      });

      Alert.alert("Success", "Tables merged successfully");
      setMergeModalVisible(false);
      setSelectedTablesForMerge([]);
      setTargetTableForMerge(null);
      fetchTables();
    } catch (error: any) {
      const message = error?.response?.data?.message || "Failed to merge tables";
      Alert.alert("Error", message);
    } finally {
      setMerging(false);
    }
  };

  const handleBackHome = () => {
    navigation.navigate("Home");
  };

  if (loading) {
    return <LoadingSpinner message="Loading tables..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchTables} />;
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

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.iconButton, viewMode === "list" && styles.iconButtonActive]}
            onPress={() => setViewMode("list")}
          >
            <Text style={styles.iconButtonText}>☰</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, viewMode === "floor" && styles.iconButtonActive]}
            onPress={() => setViewMode("floor")}
          >
            <Text style={styles.iconButtonText}>▦</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.createButton}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createButtonText}>+ Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === "list" ? (
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
            const statusColor = getTableStatusColor(item.status);
            const statusTextColor = getTableStatusTextColor(item.status);
            const statusLabel = getTableStatusLabel(item.status);

            return (
              <TouchableOpacity
                style={[
                  styles.tableCard,
                  { backgroundColor: statusColor, borderColor: statusTextColor },
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
                          { backgroundColor: statusTextColor },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            { color: "#FFFFFF" },
                          ]}
                        >
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.cardMeta}>
                      <Text style={styles.metaText}>📍 {areaName}</Text>
                      <Text style={styles.metaText}>
                        👥 {item.seats ?? 2} seats
                      </Text>
                      {item.guestCount && item.guestCount > 0 && (
                        <Text style={styles.metaText}>
                          👫 {item.guestCount} guests
                        </Text>
                      )}
                    </View>

                    <View style={styles.cardFooter}>
                      <Text style={styles.footerText}>
                        {isOccupied ? "Open order" : "Tap to start order"}
                      </Text>
                    </View>

                    {/* Pay button for occupied tables */}
                    {isOccupied && item.openOrderId && (
                      <TouchableOpacity
                        style={styles.payButton}
                        onPress={() => navigation.navigate("Payment", { orderId: item.openOrderId })}
                      >
                        <Text style={styles.payButtonText}>Pay</Text>
                      </TouchableOpacity>
                    )}
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
      ) : (
        <FloorPlanView
          tables={filteredTables}
          onTablePress={handleTablePress}
          loadingTableId={loadingTableId}
          getTableStatusColor={getTableStatusColor}
          getTableStatusTextColor={getTableStatusTextColor}
          getTableStatusLabel={getTableStatusLabel}
        />
      )}

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

      {/* Transfer Table Modal */}
      <Modal transparent visible={transferModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Transfer Table</Text>
            <Text style={styles.modalSubtitle}>
              Move order from {selectedTableForTransfer?.name} to another table
            </Text>

            <Text style={styles.inputLabel}>Select Target Table</Text>
            <ScrollView style={styles.tableSelector} nestedScrollEnabled>
              {filteredTables
                .filter(t => t.id !== selectedTableForTransfer?.id && t.status === "AVAILABLE")
                .map(table => (
                  <TouchableOpacity
                    key={table.id}
                    style={[
                      styles.tableOption,
                      targetTableId === table.id && styles.tableOptionSelected,
                    ]}
                    onPress={() => setTargetTableId(table.id)}
                  >
                    <Text style={styles.tableOptionName}>{table.name}</Text>
                    <Text style={styles.tableOptionSeats}>{table.seats} seats</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setTransferModalVisible(false);
                  setSelectedTableForTransfer(null);
                  setTargetTableId(null);
                }}
                disabled={transferring}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleTransferTable}
                disabled={transferring || !targetTableId}
              >
                {transferring ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Transfer</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Merge Tables Modal */}
      <Modal transparent visible={mergeModalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Merge Tables</Text>
            <Text style={styles.modalSubtitle}>
              Combine orders from multiple tables into one
            </Text>

            <Text style={styles.inputLabel}>Select Source Tables</Text>
            <ScrollView style={styles.tableSelector} nestedScrollEnabled>
              {filteredTables
                .filter(t => t.status === "OCCUPIED" || t.hasOpenOrder)
                .map(table => (
                  <TouchableOpacity
                    key={table.id}
                    style={[
                      styles.tableOption,
                      selectedTablesForMerge.some(t => t.id === table.id) && styles.tableOptionSelected,
                    ]}
                    onPress={() => {
                      if (selectedTablesForMerge.some(t => t.id === table.id)) {
                        setSelectedTablesForMerge(prev => prev.filter(t => t.id !== table.id));
                      } else {
                        setSelectedTablesForMerge(prev => [...prev, table]);
                      }
                    }}
                  >
                    <Text style={styles.tableOptionName}>{table.name}</Text>
                    <Text style={styles.tableOptionSeats}>{table.seats} seats</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Select Target Table</Text>
            <ScrollView style={styles.tableSelector} nestedScrollEnabled>
              {filteredTables
                .filter(t => t.status === "AVAILABLE" && !selectedTablesForMerge.some(s => s.id === t.id))
                .map(table => (
                  <TouchableOpacity
                    key={table.id}
                    style={[
                      styles.tableOption,
                      targetTableForMerge?.id === table.id && styles.tableOptionSelected,
                    ]}
                    onPress={() => setTargetTableForMerge(table)}
                  >
                    <Text style={styles.tableOptionName}>{table.name}</Text>
                    <Text style={styles.tableOptionSeats}>{table.seats} seats</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setMergeModalVisible(false);
                  setSelectedTablesForMerge([]);
                  setTargetTableForMerge(null);
                }}
                disabled={merging}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleMergeTables}
                disabled={merging || selectedTablesForMerge.length === 0 || !targetTableForMerge}
              >
                {merging ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Merge</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function FloorPlanView({
  tables,
  onTablePress,
  loadingTableId,
  getTableStatusColor,
  getTableStatusTextColor,
  getTableStatusLabel,
}: {
  tables: Table[];
  onTablePress: (table: Table) => void;
  loadingTableId: string | null;
  getTableStatusColor: (status?: string) => string;
  getTableStatusTextColor: (status?: string) => string;
  getTableStatusLabel: (status?: string) => string;
}) {
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);

  const handleTableLongPress = (table: Table) => {
    setSelectedTable(table);
  };

  return (
    <View style={styles.floorPlanContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.floorPlanScroll}
      >
        <View style={styles.floorPlanCanvas}>
          {tables.map((table) => {
            const isLoading = loadingTableId === table.id;
            const statusColor = getTableStatusColor(table.status);
            const statusTextColor = getTableStatusTextColor(table.status);
            const statusLabel = getTableStatusLabel(table.status);

            // Default position if not set
            const x = table.x ?? 50;
            const y = table.y ?? 50;
            const width = table.width ?? 80;
            const height = table.height ?? 80;

            return (
              <TouchableOpacity
                key={table.id}
                style={[
                  styles.floorPlanTable,
                  {
                    left: `${x}%`,
                    top: `${y}%`,
                    width: width,
                    height: height,
                    backgroundColor: statusColor,
                    borderColor: statusTextColor,
                  },
                ]}
                onPress={() => onTablePress(table)}
                onLongPress={() => handleTableLongPress(table)}
                activeOpacity={0.85}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color={statusTextColor} />
                ) : (
                  <>
                    <Text style={[styles.floorPlanTableName, { color: statusTextColor }]}>
                      {table.name}
                    </Text>
                    <Text style={[styles.floorPlanTableStatus, { color: statusTextColor }]}>
                      {statusLabel}
                    </Text>
                    {table.guestCount && table.guestCount > 0 && (
                      <Text style={[styles.floorPlanGuestCount, { color: statusTextColor }]}>
                        {table.guestCount}
                      </Text>
                    )}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      {selectedTable && (
        <Modal transparent visible={!!selectedTable} animationType="fade">
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedTable(null)}
          >
            <View style={styles.tableDetailCard}>
              <Text style={styles.tableDetailTitle}>{selectedTable.name}</Text>
              <Text style={styles.tableDetailLabel}>
                Status: {getTableStatusLabel(selectedTable.status)}
              </Text>
              <Text style={styles.tableDetailLabel}>
                Seats: {selectedTable.seats ?? 2}
              </Text>
              {selectedTable.guestCount && (
                <Text style={styles.tableDetailLabel}>
                  Guests: {selectedTable.guestCount}
                </Text>
              )}
              {selectedTable.serverName && (
                <Text style={styles.tableDetailLabel}>
                  Server: {selectedTable.serverName}
                </Text>
              )}
              {selectedTable.notes && (
                <Text style={styles.tableDetailLabel}>
                  Notes: {selectedTable.notes}
                </Text>
              )}

              <TouchableOpacity
                style={styles.detailCloseButton}
                onPress={() => setSelectedTable(null)}
              >
                <Text style={styles.detailCloseButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
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
  actionButtons: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  iconButtonText: {
    fontSize: 18,
    color: "#64748B",
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
  payButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 8,
  },
  payButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
  floorPlanContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  floorPlanScroll: {
    flexGrow: 1,
  },
  floorPlanCanvas: {
    width: 800,
    height: 600,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#E2E8F0",
    position: "relative",
  },
  floorPlanTable: {
    position: "absolute",
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floorPlanTableName: {
    fontSize: 16,
    fontWeight: "900",
  },
  floorPlanTableStatus: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  floorPlanGuestCount: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  tableDetailCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    width: "85%",
    maxWidth: 320,
  },
  tableDetailTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#0F172A",
    marginBottom: 16,
  },
  tableDetailLabel: {
    fontSize: 15,
    color: "#475569",
    marginBottom: 8,
  },
  detailCloseButton: {
    backgroundColor: "#F97316",
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 16,
  },
  detailCloseButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
  tableSelector: {
    maxHeight: 150,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
  },
  tableOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  tableOptionSelected: {
    backgroundColor: "#DBEAFE",
  },
  tableOptionName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  tableOptionSeats: {
    fontSize: 13,
    color: "#64748B",
  },
});