import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CardSkeleton } from "@/components/shared/LoadingSkeleton";

async function getAnalytics(organizationId: string) {
  const orgFilter = { organizationId };

  const [
    totalLeads,
    leadsNew,
    leadsInterested,
    leadsFollowUp,
    leadsWon,
    leadsLost,
    totalConversations,
    totalMessagesSent,
    totalMessagesReceived,
    aiReplyCount,
    topConversationsRaw,
  ] = await Promise.all([
    prisma.lead.count({ where: orgFilter }),
    prisma.lead.count({ where: { ...orgFilter, status: "new" } }),
    prisma.lead.count({ where: { ...orgFilter, status: "interested" } }),
    prisma.lead.count({ where: { ...orgFilter, status: "follow_up" } }),
    prisma.lead.count({ where: { ...orgFilter, status: "won" } }),
    prisma.lead.count({ where: { ...orgFilter, status: "lost" } }),
    prisma.conversation.count({ where: orgFilter }),
    prisma.message.count({ where: { ...orgFilter, senderType: { in: ["agent", "ai"] } } }),
    prisma.message.count({ where: { ...orgFilter, senderType: "customer" } }),
    prisma.message.count({ where: { ...orgFilter, senderType: "ai" } }),
    prisma.message.groupBy({
      by: ["conversationId"],
      where: orgFilter,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  return {
    totalLeads,
    leadsByStatus: {
      new: leadsNew,
      interested: leadsInterested,
      follow_up: leadsFollowUp,
      won: leadsWon,
      lost: leadsLost,
    },
    totalConversations,
    totalMessagesSent,
    totalMessagesReceived,
    aiReplyCount,
    topConversations: topConversationsRaw.map((r: { conversationId: string; _count: { id: number } }) => ({
      conversationId: r.conversationId,
      messageCount: r._count.id,
    })),
  };
}

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  interested: "Interested",
  follow_up: "Follow Up",
  won: "Won",
  lost: "Lost",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-blue-500",
  interested: "bg-green-500",
  follow_up: "bg-yellow-500",
  won: "bg-emerald-500",
  lost: "bg-red-500",
};

export default async function AnalyticsPage() {
  const ctx = await requireAuthContext();
  const data = await getAnalytics(ctx.organizationId);

  const metrics = [
    { label: "Total Leads", value: data.totalLeads },
    { label: "Total Conversations", value: data.totalConversations },
    { label: "Messages Received", value: data.totalMessagesReceived },
    { label: "Messages Sent", value: data.totalMessagesSent },
    { label: "AI Replies", value: data.aiReplyCount },
  ];

  const maxLeadCount = Math.max(...Object.values(data.leadsByStatus), 1);

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl border bg-white p-5 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {m.label}
            </p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Lead status breakdown */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-gray-900">
          Lead Pipeline
        </h2>
        <div className="space-y-3">
          {Object.entries(data.leadsByStatus).map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="w-24 text-xs text-gray-600 text-right">
                {STATUS_LABELS[status]}
              </span>
              <div className="flex-1 rounded-full bg-gray-100 h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${STATUS_COLORS[status] ?? "bg-gray-400"}`}
                  style={{ width: `${(count / maxLeadCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-xs font-medium text-gray-900 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Top conversations */}
      {data.topConversations.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Most Active Conversations
          </h2>
          <ol className="space-y-2">
            {data.topConversations.map((conv: { conversationId: string; messageCount: number }, i: number) => (
              <li
                key={conv.conversationId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-gray-500">
                  <span className="mr-2 font-medium text-gray-900">
                    #{i + 1}
                  </span>
                  {conv.conversationId.slice(0, 12)}...
                </span>
                <span className="font-medium text-gray-900">
                  {conv.messageCount} messages
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
