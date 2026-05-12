import { requireAuthContext } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { emitToOrg } from "@/lib/socket-emitter";
import { UpdateLeadSchema } from "@/schemas/lead.schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext();
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
    if (lead.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = UpdateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: parsed.data,
    });

    await emitToOrg(ctx.organizationId, "lead_updated", updated);
    return Response.json(updated);
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("PATCH /api/leads/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext();
    requireAdmin(ctx.role);
    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
    if (lead.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.lead.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("DELETE /api/leads/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
