import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { api } from "../services/api";

type Customer = {
  id: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  points: number;
  totalSpent: string | number;
  visitCount: number;
};

export default function CustomersScreen({ navigation }: any) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get("/customers");
      setCustomers(res.data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load customers."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return customers;

    return customers.filter((customer) => {
      return (
        customer.fullName.toLowerCase().includes(q) ||
        customer.phone?.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q)
      );
    });
  }, [customers, search]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  const createCustomer = async () => {
    if (!fullName.trim()) {
      Alert.alert("Missing name", "Please enter the customer name.");
      return;
    }

    setCreating(true);

    try {
      const res = await api.post("/customers", {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
      });

      setCustomers((prev) => [res.data, ...prev]);
      setModalVisible(false);
      setFullName("");
      setPhone("");
      setEmail("");
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to create customer."
      );
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#F97316" />
        <Text style={styles.loadingText}>Loading customers...</Text>
      </View>
    );
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
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.subtitle}>Loyalty and customer profiles</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{customers.length}</Text>
          <Text style={styles.summaryLabel}>Customers</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            {customers.reduce((sum, c) => sum + (c.points || 0), 0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Points</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>
            $
            {customers
              .reduce((sum, c) => sum + Number(c.totalSpent || 0), 0)
              .toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Total Spend</Text>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, phone, or email"
          style={styles.searchInput}
        />

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCustomers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No customers found</Text>
            <Text style={styles.emptySubtitle}>
              Create customers to track visits, spend, and loyalty points.
            </Text>

            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.emptyButtonText}>Create Customer</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.customerCard}>
            <View style={styles.customerTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.fullName.charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.customerInfo}>
                <Text style={styles.customerName}>{item.fullName}</Text>
                <Text style={styles.customerMeta}>
                  {item.phone || "No phone"}
                  {item.email ? ` • ${item.email}` : ""}
                </Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{item.points}</Text>
                <Text style={styles.statLabel}>Points</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>{item.visitCount}</Text>
                <Text style={styles.statLabel}>Visits</Text>
              </View>

              <View style={styles.statBox}>
                <Text style={styles.statValue}>
                  ${Number(item.totalSpent || 0).toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>Spent</Text>
              </View>
            </View>
          </View>
        )}
      />

      <Modal transparent visible={modalVisible} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Customer</Text>
            <Text style={styles.modalSubtitle}>
              Create a customer profile for loyalty tracking.
            </Text>

            <Text style={styles.inputLabel}>Full name</Text>
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              placeholder="John Doe"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              value={phone}
              onChangeText={setPhone}
              placeholder="70123456"
              keyboardType="phone-pad"
              style={styles.input}
            />

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="john@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={createCustomer}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Customer</Text>
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
  summaryValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "800",
  },
  searchRow: {
    paddingHorizontal: 18,
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  addButton: {
    backgroundColor: "#F97316",
    paddingHorizontal: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
  },
  listContent: {
    paddingHorizontal: 18,
    paddingBottom: 28,
  },
  customerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  customerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: "#FFF7ED",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#F97316",
    fontWeight: "900",
    fontSize: 22,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#0F172A",
  },
  customerMeta: {
    marginTop: 4,
    color: "#64748B",
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statValue: {
    fontSize: 17,
    fontWeight: "900",
    color: "#0F172A",
  },
  statLabel: {
    marginTop: 3,
    color: "#64748B",
    fontWeight: "800",
    fontSize: 12,
  },
  emptyState: {
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