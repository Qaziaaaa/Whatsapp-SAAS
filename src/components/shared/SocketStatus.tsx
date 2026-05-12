"use client";

import { useAppStore } from "@/store/useAppStore";
import { cn } from "@/lib/utils";

export function SocketStatus() {
  const socketStatus = useAppStore((s) => s.socketStatus);

  const statusConfig = {
    connected: {
      color: "bg-green-500",
      label: "Live",
      textColor: "text-green-700",
    },
    connecting: {
      color: "bg-yellow-400 animate-pulse",
      label: "Connecting...",
      textColor: "text-yellow-700",
    },
    disconnected: {
      color: "bg-gray-400",
      label: "Offline",
      textColor: "text-gray-500",
    },
  };

  const config = statusConfig[socketStatus];

  return (
    <div className="flex items-center gap-2">
      <span
        className={cn("h-2 w-2 rounded-full flex-shrink-0", config.color)}
        aria-hidden="true"
      />
      <span className={cn("text-xs font-medium", config.textColor)}>
        {config.label}
      </span>
    </div>
  );
}
