import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../utils/colors";

interface PinPadProps {
  onKey: (key: string) => void;
  disabled?: boolean;
}

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "DEL"];

export default function PinPad({ onKey, disabled }: PinPadProps) {
  return (
    <View style={styles.keypad}>
      {KEYS.map((key, idx) => {
        if (key === "") return <View key={idx} style={styles.keyEmpty} />;

        return (
          <TouchableOpacity
            key={idx}
            style={[
              styles.key,
              key === "DEL" && styles.keyDel,
              disabled && styles.keyDisabled,
            ]}
            onPress={() => !disabled && onKey(key)}
            activeOpacity={0.7}
          >
            {key === "DEL" ? (
              <Text style={styles.keyDelText}>⌫</Text>
            ) : (
              <Text style={styles.keyText}>{key}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  keypad: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 14,
    width: 280,
  },
  key: {
    width: 76,
    height: 76,
    borderRadius: 18,
    backgroundColor: "#1E2130",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keyDel: {
    backgroundColor: "#7C3A14",
    borderColor: "#7C3A14",
  },
  keyDisabled: {
    opacity: 0.4,
  },
  keyEmpty: {
    width: 76,
    height: 76,
  },
  keyText: {
    fontSize: 26,
    fontWeight: "600",
    color: COLORS.text,
  },
  keyDelText: {
    fontSize: 22,
    color: COLORS.accent,
  },
});