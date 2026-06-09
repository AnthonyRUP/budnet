import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function DMsTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Direct messages coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { color: "#6b7280", fontSize: 15 },
});
