import React from "react";

interface AvatarProps {
  src?: string;
  displayName: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-6 h-6 text-xs",
  md: "w-9 h-9 text-sm",
  lg: "w-12 h-12 text-base",
};

export function Avatar({ src, displayName, size = "md" }: AvatarProps) {
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (src) {
    return (
      <img
        src={src}
        alt={displayName}
        className={`${sizeClasses[size]} rounded-full object-cover`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-brand-500 flex items-center justify-center text-white font-medium`}
    >
      {initials}
    </div>
  );
}
