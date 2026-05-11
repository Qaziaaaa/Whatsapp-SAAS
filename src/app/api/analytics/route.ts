import { requireAuthContext } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuthContext();
    requireAdmin(ctx.role);

    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const dateFilter =
      fromParam || toParam
        ? {
            createdAt: {
              ...(fromParam ? { gte: new Date(fromParam) } : {}),
              ...(toParam ? { lte: new Date(toParam) } : {}),
            },
          }
        : {};

    const orgFilter = { organizationId: ctx.organizationId };

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
      prisma.lead.count({ where: { ...orgFilter, ...dateFilter } }),
      prisma.lead.count({ where: { ...orgFilter, status: "new", ...dateFilter } }),
      prisma.lead.count({ where: { ...orgFilter, status: "interested", ...dateFilter } }),
      prisma.lead.count({ where: { ...orgFilter, status: "follow_up", ...dateFilter } }),
      prisma.lead.count({ where: { ...orgFilter, status: "won", ...dateFilter } }),
      prisma.lead.count({ where: { ...orgFilter, status: "lost", ...dateFilter } }),
      prisma.conversation.count({ where: { ...orgFilter, ...dateFilter } }),
      prisma.message.count({
        where: { ...orgFilter, senderType: { in: ["agent", "ai"] }, ...dateFilter },
      }),
      prisma.message.count({
        where: { ...orgFilter, senderType: "customer", ...dateFilter },
      }),
      prisma.message.count({
        where: { ...orgFilter, senderType: "ai", ...dateFilter },
      }),
      prisma.message.groupBy({
        by: ["conversationId"],
        where: { ...orgFilter, ...dateFilter },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    return Response.json({
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
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/analytics error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
