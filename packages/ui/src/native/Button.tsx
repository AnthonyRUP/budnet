import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  onPress?: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export function Button({ variant = "primary", size = "md", onPress, disabled, children }: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.base, styles[variant], styles[size], disabled && styles.disabled]}
      activeOpacity={0.7}
    >
      <Text style={[styles.text, variant === "primary" ? styles.textLight : styles.textDark]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 6, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: "#4f6ef7" },
  secondary: { backgroundColor: "#f3f4f6" },
  ghost: { backgroundColor: "transparent" },
  sm: { paddingHorizontal: 10, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 8 },
  lg: { paddingHorizontal: 20, paddingVertical: 10 },
  disabled: { opacity: 0.5 },
  text: { fontSize: 14, fontWeight: "600" },
  textLight: { color: "#fff" },
  textDark: { color: "#111827" },
});
