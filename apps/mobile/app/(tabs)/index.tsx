import React from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useWorkspaceStore } from "@budnet/store";

export default function ChannelsTab() {
  const router = useRouter();
  const { activeWorkspace } = useWorkspaceStore();

  const channels = [{ id: "general", name: "general" }];

  return (
    <View style={styles.container}>
      <Text style={styles.workspace}>{activeWorkspace?.name ?? "budnet"}</Text>
      <FlatList
        data={channels}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.channel}
            onPress={() => router.push(`/channel/${item.id}`)}
          >
            <Text style={styles.channelName}># {item.name}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  workspace: { fontSize: 18, fontWeight: "700", padding: 16 },
  channel: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  channelName: { fontSize: 15, color: "#111827" },
});
