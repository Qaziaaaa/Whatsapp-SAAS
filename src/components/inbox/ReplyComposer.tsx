"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { SendMessageSchema, type SendMessageInput } from "@/schemas/message.schema";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

interface ReplyComposerProps {
  conversationId: string;
  onMessageSent?: () => void;
}

const MAX_LENGTH = 4096;

export function ReplyComposer({ conversationId, onMessageSent }: ReplyComposerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<SendMessageInput>({
    resolver: zodResolver(SendMessageSchema),
    defaultValues: { content: "" },
  });

  const content = watch("content") ?? "";
  const charCount = content.length;

  const onSubmit = async (data: SendMessageInput) => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to send message");
      }

      reset();
      onMessageSent?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="border-t bg-white p-4"
    >
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <Textarea
            {...register("content")}
            placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
            className="min-h-[80px] resize-none text-sm"
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
          />
          <div className="mt-1 flex items-center justify-between">
            {errors.content ? (
              <p className="text-xs text-red-500">{errors.content.message}</p>
            ) : (
              <span />
            )}
            <span
              className={`text-xs ${
                charCount > MAX_LENGTH * 0.9
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {charCount} / {MAX_LENGTH}
            </span>
          </div>
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={isSubmitting || charCount === 0}
          className="h-10 w-10 flex-shrink-0 bg-green-500 hover:bg-green-600"
        >
          <Send className="h-4 w-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </form>
  );
}
