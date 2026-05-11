import { CardSkeleton } from "@/components/shared/LoadingSkeleton";

export default function AnalyticsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
