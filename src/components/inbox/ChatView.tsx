"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore, type Message } from "@/store/useAppStore";
import { MessageBubble } from "./MessageBubble";
import { ReplyComposer } from "./ReplyComposer";
import { ChatSkeleton } from "@/components/shared/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";

interface ChatViewProps {
  conversationId: string;
  leadName: string;
  leadPhone: string;
}

export function ChatView({ conversationId, leadName, leadPhone }: ChatViewProps) {
  const [serverMessages, setServerMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { realtimeMessages, markRead } = useAppStore();
  const realtimeForConv = realtimeMessages[conversationId] ?? [];

  // Fetch initial messages
  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/conversations/${conversationId}/messages`)
      .then((r) => r.json())
      .then((data) => {
        setServerMessages(data.messages ?? []);
        setNextCursor(data.nextCursor ?? null);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));

    markRead(conversationId);
  }, [conversationId, markRead]);

  // Merge server messages with real-time messages (deduplicate by id)
  const allMessages = [
    ...serverMessages,
    ...realtimeForConv.filter(
      (rt) => !serverMessages.some((sm) => sm.id === rt.id)
    ),
  ].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [allMessages.length]);

  const loadOlderMessages = async () => {
    if (!nextCursor || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const res = await fetch(
        `/api/conversations/${conversationId}/messages?cursor=${nextCursor}`
      );
      const data = await res.json();
      setServerMessages((prev) => [...(data.messages ?? []), ...prev]);
      setNextCursor(data.nextCursor ?? null);
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  if (isLoading) return <ChatSkeleton />;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b bg-white px-6 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-600">
          {(leadName || leadPhone).charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {leadName || leadPhone}
          </p>
          {leadName && (
            <p className="text-xs text-gray-500">{leadPhone}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {/* Load older messages button */}
        {nextCursor && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="sm"
              onClick={loadOlderMessages}
              disabled={isLoadingMore}
              className="text-xs"
            >
              <ChevronUp className="mr-1 h-3 w-3" />
              {isLoadingMore ? "Loading..." : "Load older messages"}
            </Button>
          </div>
        )}

        {allMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-gray-400">No messages yet</p>
          </div>
        ) : (
          allMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))
        )}

        <div ref={bottomRef} />
      </div>

      {/* Reply composer */}
      <ReplyComposer
        conversationId={conversationId}
        onMessageSent={() => {
          // Refresh messages after sending
          fetch(`/api/conversations/${conversationId}/messages`)
            .then((r) => r.json())
            .then((data) => setServerMessages(data.messages ?? []))
            .catch(console.error);
        }}
      />
    </div>
  );
}
