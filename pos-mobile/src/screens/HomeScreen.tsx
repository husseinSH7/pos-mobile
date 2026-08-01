import React, { useEffect } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSyncStore } from "../store/syncStore";
import SyncStatusIndicator from "../components/SyncStatusIndicator";
import { initializeNetworkMonitoring } from "../services/network";

export default function HomeScreen({ navigation }: any) {
  const { loadSyncStatus } = useSyncStore();

  useEffect(() => {
    // Initialize network monitoring
    initializeNetworkMonitoring();
    
    // Load initial sync status
    loadSyncStatus();
  }, [loadSyncStatus]);

  const modules = [
    {
      title: "Sales",
      description: "Create orders and checkout",
      icon: "POS",
      screen: "Tables",
    },
    {
      title: "Tables",
      description: "Manage dine-in tables",
      icon: "TBL",
      screen: "Tables",
    },
    {
      title: "Orders",
      description: "View active and previous orders",
      icon: "ORD",
      screen: "Orders",
    },
    {
      title: "Kitchen",
      description: "Track kitchen tickets",
      icon: "KDS",
      screen: "Kitchen",
    },
    {
      title: "Customers",
      description: "Loyalty and customer profiles",
      icon: "CRM",
      screen: "Customers",
    },
    {
      title: "Shift",
      description: "Manage staff shifts",
      icon: "SFT",
      screen: "Shift",
    },
    {
      title: "Settings",
      description: "Restaurant and staff settings",
      icon: "SET",
      screen: "Settings",
    },
  ];

  return (
    <View style={styles.container}>
      <SyncStatusIndicator />
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Text style={styles.title}>Demo Restaurant</Text>
          <Text style={styles.subtitle}>Select a module to continue</Text>

        <View style={styles.grid}>
          {modules.map((module) => (
            <Pressable
              key={module.title}
              style={styles.card}
              onPress={() => navigation.navigate(module.screen)}
            >
              <Text style={styles.icon}>{module.icon}</Text>
              <Text style={styles.cardTitle}>{module.title}</Text>
              <Text style={styles.cardDescription}>{module.description}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 24,
    fontSize: 15,
    color: "#6B7280",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  card: {
    width: "47%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 20,
    minHeight: 150,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  icon: {
    fontSize: 22,
    fontWeight: "900",
    color: "#F97316",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  cardDescription: {
    marginTop: 8,
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
});
