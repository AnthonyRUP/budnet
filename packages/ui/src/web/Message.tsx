import React from "react";
import type { Message as MessageType } from "@budnet/types";
import { Avatar } from "./Avatar";

interface MessageProps {
  message: MessageType;
  authorName: string;
  authorAvatar?: string;
}

export function Message({ message, authorName, authorAvatar }: MessageProps) {
  return (
    <div className="flex gap-3 px-4 py-1 hover:bg-gray-50 group">
      <Avatar displayName={authorName} src={authorAvatar} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-semibold text-sm text-gray-900">{authorName}</span>
          <span className="text-xs text-gray-400">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <p className="text-sm text-gray-800 break-words">{message.content}</p>
      </div>
    </div>
  );
}
