import React from "react";
import { usePresenceStore } from "@budnet/store";

interface Props {
  userId?: string;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  online: "bg-green-500",
  away: "bg-yellow-400",
  dnd: "bg-red-500",
};

export function PresenceDot({ userId, className = "w-2.5 h-2.5" }: Props) {
  const { presence } = usePresenceStore();
  if (!userId) return null;

  const status = presence[userId]?.status;
  const color = status ? STATUS_COLORS[status] : undefined;
  if (!color) return null; // offline = no dot

  return (
    <span
      className={`${color} ${className} rounded-full ring-2 ring-white flex-shrink-0`}
      title={status}
    />
  );
}
