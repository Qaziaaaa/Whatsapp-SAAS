"use client";

import { useAppStore } from "@/store/useAppStore";
import { useSocket } from "@/hooks/useSocket";
import { ConversationList } from "@/components/inbox/ConversationList";
import { ChatView } from "@/components/inbox/ChatView";

interface Lead {
  id: string;
  name: string | null;
  phone: string;
  status: string;
}

interface Conversation {
  id: string;
  lastMessage: string | null;
  updatedAt: Date;
  unreadCount: number;
  lead: Lead;
}

interface InboxClientProps {
  initialConversations: Conversation[];
  organizationId: string;
}

export function InboxClient({
  initialConversations,
  organizationId,
}: InboxClientProps) {
  // Initialize real-time socket connection
  useSocket(organizationId);

  const activeConversationId = useAppStore((s) => s.activeConversationId);
  const activeConversation = initialConversations.find(
    (c) => c.id === activeConversationId
  );

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation list panel */}
      <div className="flex w-80 flex-col border-r bg-white">
        <div className="flex h-14 items-center border-b px-4">
          <h1 className="text-base font-semibold text-gray-900">Inbox</h1>
          <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
            {initialConversations.length}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ConversationList conversations={initialConversations} />
        </div>
      </div>

      {/* Chat view panel */}
      <div className="flex flex-1 flex-col">
        {activeConversation ? (
          <ChatView
            conversationId={activeConversation.id}
            leadName={activeConversation.lead.name ?? ""}
            leadPhone={activeConversation.lead.phone}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <div className="mb-3 flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <svg
                    className="h-8 w-8 text-gray-400"
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
              </div>
              <p className="text-sm font-medium text-gray-900">
                Select a conversation
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Choose a conversation from the list to start chatting
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
