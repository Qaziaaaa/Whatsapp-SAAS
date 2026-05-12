"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@clerk/nextjs";
import { useAppStore, type Message } from "@/store/useAppStore";

/**
 * Manages the Socket.io connection for real-time dashboard updates.
 *
 * - Connects to the Socket.io server with a Clerk session token
 * - Joins the organization's room automatically (handled server-side)
 * - Listens for new_message and lead_updated events
 * - Reconnects automatically with exponential backoff (max 5 attempts)
 * - Updates Zustand store on all events
 *
 * Call this hook once at the dashboard layout level.
 */
export function useSocket(organizationId: string) {
  const { getToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const { setSocketStatus, appendMessage, incrementUnread, activeConversationId } =
    useAppStore();

  useEffect(() => {
    const socketServerUrl = process.env.NEXT_PUBLIC_SOCKET_SERVER_URL;

    if (!socketServerUrl || !organizationId) {
      // Socket server not configured — skip in development if not set
      console.warn("[Socket] NEXT_PUBLIC_SOCKET_SERVER_URL not configured");
      return;
    }

    let isMounted = true;

    async function connect() {
      const token = await getToken();
      if (!token || !isMounted) return;

      setSocketStatus("connecting");

      const socket = io(socketServerUrl!, {
        auth: { token },
        // Reconnection: up to 5 attempts with exponential backoff
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30_000,
        // Use WebSocket transport first, fall back to polling
        transports: ["websocket", "polling"],
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        if (isMounted) {
          setSocketStatus("connected");
          console.log("[Socket] Connected:", socket.id);
        }
      });

      socket.on("disconnect", (reason) => {
        if (isMounted) {
          setSocketStatus("disconnected");
          console.log("[Socket] Disconnected:", reason);
        }
      });

      socket.on("connect_error", (error) => {
        if (isMounted) {
          setSocketStatus("disconnected");
          console.error("[Socket] Connection error:", error.message);
        }
      });

      // New message received from webhook pipeline or agent reply
      socket.on("new_message", (message: Message) => {
        if (!isMounted) return;

        appendMessage(message.conversationId, message);

        // Only increment unread if this conversation isn't currently open
        if (message.conversationId !== activeConversationId) {
          incrementUnread(message.conversationId);
        }
      });

      // Lead updated (status change, assignment, etc.)
      socket.on("lead_updated", () => {
        // Trigger a re-fetch of leads data
        // Components listening to this can use SWR/React Query invalidation
        // For now, we dispatch a custom event that components can listen to
        if (isMounted) {
          window.dispatchEvent(new CustomEvent("lead_updated"));
        }
      });
    }

    connect();

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocketStatus("disconnected");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  return socketRef.current;
}
