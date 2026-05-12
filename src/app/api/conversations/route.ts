import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuthContext();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where: { organizationId: ctx.organizationId },
        include: {
          lead: {
            select: { id: true, name: true, phone: true, status: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.conversation.count({
        where: { organizationId: ctx.organizationId },
      }),
    ]);

    return Response.json({ conversations, total, page, pageSize });
  } catch (error) {
    console.error("GET /api/conversations error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
