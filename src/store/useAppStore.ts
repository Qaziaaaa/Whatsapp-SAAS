"use client";

import { create } from "zustand";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SocketStatus = "connected" | "disconnected" | "connecting";

export interface Message {
  id: string;
  conversationId: string;
  senderType: "customer" | "agent" | "ai";
  senderId?: string | null;
  content: string;
  wamid?: string | null;
  status: "sent" | "delivered" | "read" | "failed";
  createdAt: string | Date;
}

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface AppStore {
  // Active conversation
  activeConversationId: string | null;
  setActiveConversation: (id: string | null) => void;

  // Socket connection status
  socketStatus: SocketStatus;
  setSocketStatus: (status: SocketStatus) => void;

  // Real-time message cache (keyed by conversationId)
  // New messages from Socket.io are appended here
  realtimeMessages: Record<string, Message[]>;
  appendMessage: (conversationId: string, message: Message) => void;
  clearRealtimeMessages: (conversationId: string) => void;

  // Unread counts (keyed by conversationId)
  unreadCounts: Record<string, number>;
  incrementUnread: (conversationId: string) => void;
  markRead: (conversationId: string) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

// ─── Store Implementation ─────────────────────────────────────────────────────

export const useAppStore = create<AppStore>((set) => ({
  // Active conversation
  activeConversationId: null,
  setActiveConversation: (id) =>
    set((state) => {
      // Mark as read when opening a conversation
      if (id && state.unreadCounts[id]) {
        return {
          activeConversationId: id,
          unreadCounts: { ...state.unreadCounts, [id]: 0 },
        };
      }
      return { activeConversationId: id };
    }),

  // Socket status
  socketStatus: "disconnected",
  setSocketStatus: (status) => set({ socketStatus: status }),

  // Real-time messages
  realtimeMessages: {},
  appendMessage: (conversationId, message) =>
    set((state) => {
      const existing = state.realtimeMessages[conversationId] ?? [];
      // Deduplicate by id
      if (existing.some((m) => m.id === message.id)) return state;
      return {
        realtimeMessages: {
          ...state.realtimeMessages,
          [conversationId]: [...existing, message],
        },
      };
    }),
  clearRealtimeMessages: (conversationId) =>
    set((state) => ({
      realtimeMessages: {
        ...state.realtimeMessages,
        [conversationId]: [],
      },
    })),

  // Unread counts
  unreadCounts: {},
  incrementUnread: (conversationId) =>
    set((state) => ({
      unreadCounts: {
        ...state.unreadCounts,
        [conversationId]: (state.unreadCounts[conversationId] ?? 0) + 1,
      },
    })),
  markRead: (conversationId) =>
    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [conversationId]: 0 },
    })),

  // Toasts
  toasts: [],
  addToast: (toast) =>
    set((state) => ({
      toasts: [
        ...state.toasts,
        { ...toast, id: Math.random().toString(36).slice(2) },
      ],
    })),
  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
}));
