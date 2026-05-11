import { CardSkeleton } from "@/components/shared/LoadingSkeleton";

export default function SettingsLoading() {
  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-2xl">
      <div className="h-7 w-24 animate-pulse rounded bg-gray-200" />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
