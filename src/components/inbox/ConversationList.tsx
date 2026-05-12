"use client";

import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  status: string;
}

interface Conversation {
  id: string;
  lastMessage: string | null;
  updatedAt: string | Date;
  unreadCount: number;
  lead: Lead;
}

interface ConversationListProps {
  conversations: Conversation[];
}

export function ConversationList({ conversations }: ConversationListProps) {
  const { activeConversationId, setActiveConversation, unreadCounts } =
    useAppStore();

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-gray-900">No conversations yet</p>
        <p className="mt-1 text-xs text-gray-500">
          Conversations will appear here when customers message you on WhatsApp.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
      {conversations.map((conv) => {
        const isActive = conv.id === activeConversationId;
        const unread = unreadCounts[conv.id] ?? conv.unreadCount ?? 0;
        const displayName = conv.lead.name ?? conv.lead.phone;

        return (
          <li key={conv.id}>
            <button
              onClick={() => setActiveConversation(conv.id)}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50",
                isActive && "bg-green-50 hover:bg-green-50"
              )}
            >
              {/* Avatar */}
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
                {displayName.charAt(0).toUpperCase()}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm font-medium",
                      isActive ? "text-green-700" : "text-gray-900"
                    )}
                  >
                    {displayName}
                  </span>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {formatDistanceToNow(new Date(conv.updatedAt), {
                      addSuffix: false,
                    })}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-gray-500">
                    {conv.lastMessage ?? "No messages yet"}
                  </p>
                  {unread > 0 && (
                    <Badge
                      variant="default"
                      className="flex-shrink-0 h-5 min-w-5 rounded-full bg-green-500 px-1.5 text-xs text-white"
                    >
                      {unread > 99 ? "99+" : unread}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
