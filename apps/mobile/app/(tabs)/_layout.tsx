import React from "react";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#4f6ef7" }}>
      <Tabs.Screen name="index" options={{ title: "Channels" }} />
      <Tabs.Screen name="dms" options={{ title: "DMs" }} />
    </Tabs>
  );
}
