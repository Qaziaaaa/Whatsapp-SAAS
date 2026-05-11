import { requireAuthContext } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext();
    requireAdmin(ctx.role);
    const { id } = await params;

    const conv = await prisma.conversation.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!conv) return Response.json({ error: "Not found" }, { status: 404 });
    if (conv.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updated = await prisma.conversation.update({
      where: { id },
      data: { aiEnabled: Boolean(body.aiEnabled) },
    });

    return Response.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("PATCH /api/conversations/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
