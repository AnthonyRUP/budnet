import React from "react";
import { View, Text, Image } from "react-native";

interface AvatarProps {
  src?: string;
  displayName: string;
  size?: "sm" | "md" | "lg";
}

const sizes = { sm: 24, md: 36, lg: 48 };
const fontSizes = { sm: 10, md: 13, lg: 16 };

export function Avatar({ src, displayName, size = "md" }: AvatarProps) {
  const dim = sizes[size];
  const fontSize = fontSizes[size];
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return <Image source={{ uri: src }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />;
  }

  return (
    <View
      style={{
        width: dim,
        height: dim,
        borderRadius: dim / 2,
        backgroundColor: "#4f6ef7",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color: "#fff", fontSize, fontWeight: "600" }}>{initials}</Text>
    </View>
  );
}
