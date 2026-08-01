import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useShiftStore } from "../store/shiftStore";
import { useAuthStore } from "../store/authStore";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorMessage from "../components/ErrorMessage";
import { COLORS } from "../utils/colors";

export default function ShiftScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const {
    currentShift,
    shiftHistory,
    isLoading,
    error,
    openShift,
    closeShift,
    getCurrentShift,
    getShiftHistory,
  } = useShiftStore();

  const [openingCash, setOpeningCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");
  const [showOpenForm, setShowOpenForm] = useState(false);
  const [showCloseForm, setShowCloseForm] = useState(false);

  useEffect(() => {
    getCurrentShift();
    getShiftHistory();
  }, [getCurrentShift, getShiftHistory]);

  const handleOpenShift = async () => {
    try {
      await openShift(
        openingCash ? parseFloat(openingCash) : undefined,
        notes || undefined
      );
      setShowOpenForm(false);
      setOpeningCash("");
      setNotes("");
      Alert.alert("Success", "Shift opened successfully");
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleCloseShift = async () => {
    if (!closingCash || parseFloat(closingCash) < 0) {
      Alert.alert("Invalid amount", "Please enter a valid closing cash amount");
      return;
    }

    if (!currentShift) return;

    try {
      await closeShift(
        currentShift.id,
        parseFloat(closingCash),
        notes || undefined
      );
      setShowCloseForm(false);
      setClosingCash("");
      setNotes("");
      Alert.alert("Success", "Shift closed successfully");
    } catch (error) {
      // Error is handled by the store
    }
  };

  if (isLoading && !currentShift) {
    return <LoadingSpinner message="Loading shift information..." />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Shift Management</Text>
      </View>

      {/* Current Shift Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Shift</Text>
        
        {currentShift ? (
          <View style={styles.shiftCard}>
            <View style={styles.shiftHeader}>
              <Text style={styles.shiftStatus}>OPEN</Text>
              <Text style={styles.shiftTime}>
                Opened: {new Date(currentShift.openedAt).toLocaleTimeString()}
              </Text>
            </View>

            {currentShift.summary && (
              <View style={styles.summary}>
                <Text style={styles.summaryLabel}>Shift Summary:</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryItem}>Total Sales:</Text>
                  <Text style={styles.summaryValue}>
                    ${currentShift.summary.totalSales.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryItem}>Cash:</Text>
                  <Text style={styles.summaryValue}>
                    ${currentShift.summary.totalCash.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryItem}>Card:</Text>
                  <Text style={styles.summaryValue}>
                    ${currentShift.summary.totalCard.toFixed(2)}
                  </Text>
                </View>
                {currentShift.summary.transactionCount !== undefined && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryItem}>Transactions:</Text>
                    <Text style={styles.summaryValue}>
                      {currentShift.summary.transactionCount}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowCloseForm(true)}
            >
              <Text style={styles.closeButtonText}>Close Shift</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noShiftCard}>
            <Text style={styles.noShiftText}>No active shift</Text>
            <TouchableOpacity
              style={styles.openButton}
              onPress={() => setShowOpenForm(true)}
            >
              <Text style={styles.openButtonText}>Open Shift</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Close Shift Form */}
      {showCloseForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Close Shift</Text>
          <TextInput
            style={styles.input}
            placeholder="Closing Cash Amount"
            value={closingCash}
            onChangeText={setClosingCash}
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.muted}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.muted}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => {
                setShowCloseForm(false);
                setClosingCash("");
                setNotes("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.submitButton]}
              onPress={handleCloseShift}
            >
              <Text style={styles.submitButtonText}>Close Shift</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Open Shift Form */}
      {showOpenForm && (
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Open New Shift</Text>
          <TextInput
            style={styles.input}
            placeholder="Opening Cash Amount (optional)"
            value={openingCash}
            onChangeText={setOpeningCash}
            keyboardType="decimal-pad"
            placeholderTextColor={COLORS.muted}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            placeholderTextColor={COLORS.muted}
          />
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.formButton, styles.cancelButton]}
              onPress={() => {
                setShowOpenForm(false);
                setOpeningCash("");
                setNotes("");
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.formButton, styles.submitButton]}
              onPress={handleOpenShift}
            >
              <Text style={styles.submitButtonText}>Open Shift</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Shift History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Shift History</Text>
        {shiftHistory.length === 0 ? (
          <Text style={styles.emptyText}>No shift history available</Text>
        ) : (
          shiftHistory.map((shift) => (
            <View key={shift.id} style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyStatus}>
                  {shift.status}
                </Text>
                <Text style={styles.historyDate}>
                  {new Date(shift.openedAt).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.historyUser}>
                {shift.user?.fullName} ({shift.user?.role})
              </Text>
              {shift.openingCash && (
                <Text style={styles.historyDetail}>
                  Opening: ${shift.openingCash.toFixed(2)}
                </Text>
              )}
              {shift.closingCash && (
                <Text style={styles.historyDetail}>
                  Closing: ${shift.closingCash.toFixed(2)}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {error && <ErrorMessage message={error} onRetry={getCurrentShift} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    marginRight: 16,
  },
  backText: {
    fontSize: 16,
    color: COLORS.text,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 12,
  },
  shiftCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  shiftHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  shiftStatus: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#10B981",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  shiftTime: {
    fontSize: 12,
    color: COLORS.muted,
  },
  summary: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  summaryItem: {
    fontSize: 14,
    color: COLORS.muted,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: "#EF4444",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  noShiftCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  noShiftText: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: 16,
  },
  openButton: {
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  openButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  formCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 16,
  },
  input: {
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  formButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  formButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "600",
  },
  submitButton: {
    backgroundColor: COLORS.accent,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  historyCard: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  historyStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  historyUser: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  historyDetail: {
    fontSize: 12,
    color: COLORS.muted,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    padding: 24,
  },
});