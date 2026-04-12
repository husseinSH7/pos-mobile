import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Vibration,
} from "react-native";
import PinPad from "../components/PinPad";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import { COLORS } from "../utils/colors";

const PIN_LENGTH = 4;

export default function LoginScreen() {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const login = useAuthStore((s) => s.login);

  const handleKey = (key: string) => {
    if (loading) return;

    if (key === "DEL") {
      setPin((p) => p.slice(0, -1));
      return;
    }

    if (pin.length >= PIN_LENGTH) return;

    const newPin = pin + key;
    setPin(newPin);

    if (newPin.length === PIN_LENGTH) {
      handleSubmit(newPin);
    }
  };

  const handleSubmit = async (enteredPin: string) => {
    setLoading(true);
    try {
      const res = await api.post("/auth/login", { pin: enteredPin });
      login(res.data.user, res.data.token);
    } catch {
      Vibration.vibrate(300);
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin("");
      Alert.alert("Invalid PIN", "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Logo */}
      <View style={styles.header}>
        <View style={styles.logoMark} />
        <Text style={styles.brand}>RESTRO POS</Text>
        <Text style={styles.subtitle}>Staff Login</Text>
      </View>

      {/* PIN Dots */}
      <View style={styles.pinRow}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.pinDot,
              i < pin.length && styles.pinDotFilled,
              shake && styles.pinDotError,
            ]}
          />
        ))}
      </View>
      <Text style={styles.hint}>Enter your 4-digit PIN</Text>

      {/* Keypad */}
      <PinPad onKey={handleKey} disabled={loading} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    marginBottom: 12,
  },
  brand: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.text,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: 4,
    letterSpacing: 1,
  },
  pinRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
  },
  pinDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: "transparent",
  },
  pinDotFilled: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  pinDotError: {
    borderColor: COLORS.error,
    backgroundColor: COLORS.error,
  },
  hint: {
    color: COLORS.muted,
    fontSize: 13,
    marginBottom: 36,
    letterSpacing: 0.5,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});