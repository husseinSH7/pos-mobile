import React from "react";
import {
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useAuthStore } from "../store/authStore";

export default function SettingsScreen({ navigation }: any) {
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate("Home")}
        >
          <Text style={styles.backText}>← Home</Text>
        </TouchableOpacity>

        <View>
          <Text style={styles.title}>Settings</Text>
          <Text style={styles.subtitle}>System & account settings</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Account</Text>

        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{user?.name ?? "User"}</Text>

        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{user?.role ?? "Staff"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>System</Text>

        <Text style={styles.value}>Multi-tenant POS enabled</Text>
        <Text style={styles.value}>Restaurant ID linked to session</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: 10,
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  backText: {
    color: "#334155",
    fontWeight: "900",
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
  },
  subtitle: {
    color: "#64748B",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 10,
    color: "#0F172A",
  },
  label: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  logoutButton: {
    marginTop: 20,
    backgroundColor: "#DC2626",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },
  logoutText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 15,
  },
});