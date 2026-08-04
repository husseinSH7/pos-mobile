import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { api } from "../services/api";
import { COLORS } from "../utils/colors";
import { formatCurrency } from "../utils/currency";

type Reservation = {
  id: string;
  customerName: string;
  customerPhone?: string;
  guestCount: number;
  date: string;
  time: string;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  specialRequests?: string;
};

type TimeSlot = {
  time: string;
  available: boolean;
  availableTables: string[];
};

export default function ReservationsScreen({ navigation }: any) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [newReservation, setNewReservation] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    guestCount: "2",
    date: new Date().toISOString().split('T')[0],
    time: "",
    notes: "",
    specialRequests: "",
  });
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  useEffect(() => {
    loadReservations();
  }, [selectedDate]);

  const loadReservations = async () => {
    try {
      const res = await api.get(`/reservations?date=${selectedDate}`);
      setReservations(res.data);
    } catch (error: any) {
      Alert.alert("Error", "Failed to load reservations");
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    setCheckingAvailability(true);
    try {
      const res = await api.get(`/reservations/availability?date=${newReservation.date}&guestCount=${newReservation.guestCount}`);
      setAvailability(res.data.timeSlots);
    } catch (error: any) {
      Alert.alert("Error", "Failed to check availability");
    } finally {
      setCheckingAvailability(false);
    }
  };

  const createReservation = async () => {
    try {
      await api.post("/reservations", newReservation);
      setShowAddModal(false);
      setNewReservation({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        guestCount: "2",
        date: new Date().toISOString().split('T')[0],
        time: "",
        notes: "",
        specialRequests: "",
      });
      loadReservations();
      Alert.alert("Success", "Reservation created successfully");
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to create reservation");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.put(`/reservations/${id}/status`, { status });
      loadReservations();
    } catch (error: any) {
      Alert.alert("Error", "Failed to update reservation");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "CONFIRMED": return "#16A34A";
      case "SEATED": return "#2563EB";
      case "CANCELLED": return "#64748B";
      case "NO_SHOW": return "#DC2626";
      default: return "#F59E0B";
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
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
          <Text style={styles.title}>Reservations</Text>
          <Text style={styles.subtitle}>Manage reservations and waitlist</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.dateSelector}>
        <TextInput
          style={styles.dateInput}
          value={selectedDate}
          onChangeText={setSelectedDate}
          placeholder="Select date"
        />
      </View>

      <ScrollView style={styles.content}>
        {reservations.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No reservations</Text>
            <Text style={styles.emptyText}>No reservations for this date</Text>
          </View>
        ) : (
          reservations.map((reservation) => (
            <View key={reservation.id} style={styles.reservationCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.customerName}>{reservation.customerName}</Text>
                  <Text style={styles.reservationTime}>
                    {new Date(reservation.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(reservation.status) }]}>
                  <Text style={styles.statusText}>{reservation.status}</Text>
                </View>
              </View>

              <View style={styles.cardDetails}>
                <Text style={styles.detailText}>{reservation.guestCount} guests</Text>
                {reservation.customerPhone && (
                  <Text style={styles.detailText}>{reservation.customerPhone}</Text>
                )}
                {reservation.specialRequests && (
                  <Text style={styles.specialRequests}>{reservation.specialRequests}</Text>
                )}
              </View>

              <View style={styles.cardActions}>
                {reservation.status === "CONFIRMED" && (
                  <>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.seatButton]}
                      onPress={() => updateStatus(reservation.id, "SEATED")}
                    >
                      <Text style={styles.actionButtonText}>Seat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => updateStatus(reservation.id, "CANCELLED")}
                    >
                      <Text style={styles.actionButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showAddModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>New Reservation</Text>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Customer Name *</Text>
              <TextInput
                style={styles.input}
                value={newReservation.customerName}
                onChangeText={(text) => setNewReservation({ ...newReservation, customerName: text })}
                placeholder="Enter customer name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={newReservation.customerPhone}
                onChangeText={(text) => setNewReservation({ ...newReservation, customerPhone: text })}
                placeholder="Enter phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Guest Count *</Text>
              <TextInput
                style={styles.input}
                value={newReservation.guestCount}
                onChangeText={(text) => setNewReservation({ ...newReservation, guestCount: text })}
                placeholder="Number of guests"
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Date *</Text>
              <TextInput
                style={styles.input}
                value={newReservation.date}
                onChangeText={(text) => setNewReservation({ ...newReservation, date: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <TouchableOpacity
              style={styles.checkButton}
              onPress={checkAvailability}
              disabled={checkingAvailability}
            >
              {checkingAvailability ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.checkButtonText}>Check Availability</Text>
              )}
            </TouchableOpacity>

            {availability.length > 0 && (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Available Times</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {availability.map((slot) => (
                    <TouchableOpacity
                      key={slot.time}
                      style={[
                        styles.timeSlot,
                        !slot.available && styles.timeSlotDisabled,
                        newReservation.time === slot.time && styles.timeSlotSelected,
                      ]}
                      onPress={() => slot.available && setNewReservation({ ...newReservation, time: slot.time })}
                      disabled={!slot.available}
                    >
                      <Text style={[
                        styles.timeSlotText,
                        !slot.available && styles.timeSlotTextDisabled,
                        newReservation.time === slot.time && styles.timeSlotTextSelected,
                      ]}>
                        {slot.time}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View style={styles.formGroup}>
              <Text style={styles.label}>Special Requests</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newReservation.specialRequests}
                onChangeText={(text) => setNewReservation({ ...newReservation, specialRequests: text })}
                placeholder="Any special requests?"
                multiline
              />
            </View>

            <TouchableOpacity
              style={styles.createButton}
              onPress={createReservation}
              disabled={!newReservation.time}
            >
              <Text style={styles.createButtonText}>Create Reservation</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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
  addButton: {
    backgroundColor: "#F97316",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  addButtonText: { color: "#FFFFFF", fontWeight: "900" },
  dateSelector: { paddingHorizontal: 20, paddingVertical: 12 },
  dateInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 12 },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 22, fontWeight: "900", color: "#0F172A" },
  emptyText: { color: "#64748B", marginTop: 8 },
  reservationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customerName: { fontSize: 18, fontWeight: "900", color: "#0F172A" },
  reservationTime: { color: "#64748B", marginTop: 4 },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  cardDetails: { marginBottom: 12 },
  detailText: { color: "#64748B", marginBottom: 4 },
  specialRequests: {
    color: "#B45309",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 8,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cardActions: { flexDirection: "row", gap: 8 },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  seatButton: { backgroundColor: "#16A34A" },
  cancelButton: { backgroundColor: "#DC2626" },
  actionButtonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 13 },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalTitle: { fontSize: 24, fontWeight: "900", color: "#0F172A" },
  closeButton: { fontSize: 24, color: "#64748B" },
  modalContent: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 8 },
  input: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    fontSize: 16,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  checkButton: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 20,
  },
  checkButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
  timeSlot: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timeSlotDisabled: {
    backgroundColor: "#F1F5F9",
    opacity: 0.5,
  },
  timeSlotSelected: {
    backgroundColor: "#F97316",
    borderColor: "#F97316",
  },
  timeSlotText: { color: "#0F172A", fontWeight: "700" },
  timeSlotTextDisabled: { color: "#94A3B8" },
  timeSlotTextSelected: { color: "#FFFFFF" },
  createButton: {
    backgroundColor: "#F97316",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  createButtonText: { color: "#FFFFFF", fontWeight: "900", fontSize: 16 },
});