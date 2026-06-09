import React from "react";
import { View, Text } from "react-native";
import type { Message as MessageType } from "@budnet/types";
import { Avatar } from "./Avatar";

interface MessageProps {
  message: MessageType;
  authorName: string;
  authorAvatar?: string;
}

export function Message({ message, authorName, authorAvatar }: MessageProps) {
  return (
    <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 4, gap: 12 }}>
      <Avatar displayName={authorName} src={authorAvatar} size="md" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8 }}>
          <Text style={{ fontWeight: "700", fontSize: 14 }}>{authorName}</Text>
          <Text style={{ fontSize: 12, color: "#9ca3af" }}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        </View>
        <Text style={{ fontSize: 14, color: "#1f2937" }}>{message.content}</Text>
      </View>
    </View>
  );
}
