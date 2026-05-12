import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MessageBubbleProps {
  message: {
    id: string;
    senderType: "customer" | "agent" | "ai";
    content: string;
    createdAt: string | Date;
    status?: "sent" | "delivered" | "read" | "failed";
  };
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isCustomer = message.senderType === "customer";
  const isAgent = message.senderType === "agent";
  const isAi = message.senderType === "ai";

  return (
    <div
      className={cn(
        "flex w-full",
        isCustomer ? "justify-start" : "justify-end"
      )}
    >
      <div
        className={cn(
          "max-w-[70%] space-y-1",
          isCustomer ? "items-start" : "items-end"
        )}
      >
        {/* AI badge */}
        {isAi && (
          <div className="flex justify-end">
            <Badge
              variant="secondary"
              className="h-4 px-1.5 text-[10px] bg-purple-100 text-purple-700 border-purple-200"
            >
              AI
            </Badge>
          </div>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isCustomer &&
              "rounded-tl-sm bg-white border border-gray-200 text-gray-900 shadow-sm",
            isAgent &&
              "rounded-tr-sm bg-green-500 text-white shadow-sm",
            isAi &&
              "rounded-tr-sm bg-purple-500 text-white shadow-sm"
          )}
        >
          {message.content}
        </div>

        {/* Timestamp + status */}
        <div
          className={cn(
            "flex items-center gap-1 text-[10px] text-gray-400",
            isCustomer ? "justify-start" : "justify-end"
          )}
        >
          <span>
            {formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
            })}
          </span>
          {!isCustomer && message.status === "failed" && (
            <span className="text-red-400">· Failed</span>
          )}
        </div>
      </div>
    </div>
  );
}
