import { Skeleton } from "@/components/ui/skeleton";

export function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg p-3">
          <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
        >
          <Skeleton
            className={`h-10 rounded-2xl ${
              i % 2 === 0 ? "w-48" : "w-36"
            }`}
          />
        </div>
      ))}
    </div>
  );
}

export function LeadsTableSkeleton() {
  return (
    <div className="space-y-2 p-4">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 10 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl border bg-white p-6 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
