import { LeadsTableSkeleton } from "@/components/shared/LoadingSkeleton";

export default function LeadsLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b bg-white px-6">
        <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
      </div>
      <LeadsTableSkeleton />
    </div>
  );
}
