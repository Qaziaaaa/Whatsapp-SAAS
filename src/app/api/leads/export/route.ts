import { requireAuthContext } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  try {
    const ctx = await requireAuthContext();
    requireAdmin(ctx.role);

    const leads = await prisma.lead.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        phone: true,
        name: true,
        status: true,
        tags: true,
        notes: true,
        assignedTo: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const header = "id,phone,name,status,tags,notes,assignedTo,createdAt,updatedAt";
    const rows = leads.map((l) =>
      [
        l.id,
        l.phone,
        escapeCsvField(l.name ?? ""),
        l.status,
        escapeCsvField(l.tags.join(";")),
        escapeCsvField(l.notes ?? ""),
        l.assignedTo ?? "",
        l.createdAt.toISOString(),
        l.updatedAt.toISOString(),
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-${ctx.organizationId}.csv"`,
      },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/leads/export error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
