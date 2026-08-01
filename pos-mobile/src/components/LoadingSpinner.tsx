import React from "react";
import { ActivityIndicator, View, Text, StyleSheet } from "react-native";
import { COLORS } from "../utils/colors";

interface LoadingSpinnerProps {
  size?: "small" | "large";
  message?: string;
}

export default function LoadingSpinner({ 
  size = "large", 
  message = "Loading..." 
}: LoadingSpinnerProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={COLORS.accent} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
});