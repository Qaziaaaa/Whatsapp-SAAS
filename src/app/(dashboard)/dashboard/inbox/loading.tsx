import { ConversationListSkeleton } from "@/components/shared/LoadingSkeleton";

export default function InboxLoading() {
  return (
    <div className="flex h-full overflow-hidden">
      <div className="flex w-80 flex-col border-r bg-white">
        <div className="flex h-14 items-center border-b px-4">
          <div className="h-5 w-16 animate-pulse rounded bg-gray-200" />
        </div>
        <ConversationListSkeleton />
      </div>
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    </div>
  );
}
