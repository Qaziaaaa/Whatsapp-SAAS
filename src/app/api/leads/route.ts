import { requireAuthContext } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { CreateLeadSchema } from "@/schemas/lead.schema";

export async function GET(request: Request) {
  try {
    const ctx = await requireAuthContext();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = 20;

    const where = {
      organizationId: ctx.organizationId,
      ...(status ? { status: status as "new" | "interested" | "follow_up" | "won" | "lost" } : {}),
    };

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
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
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lead.count({ where }),
    ]);

    return Response.json({ leads, total, page, pageSize });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("GET /api/leads error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireAuthContext();
    requireAdmin(ctx.role);

    const body = await request.json();
    const parsed = CreateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Check for duplicate phone within org
    const existing = await prisma.lead.findUnique({
      where: {
        organizationId_phone: {
          organizationId: ctx.organizationId,
          phone: parsed.data.phone,
        },
      },
    });
    if (existing) {
      return Response.json(
        { error: "A lead with this phone number already exists" },
        { status: 409 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        organizationId: ctx.organizationId,
        phone: parsed.data.phone,
        name: parsed.data.name,
        notes: parsed.data.notes,
        tags: parsed.data.tags ?? [],
        status: "new",
      },
    });

    return Response.json(lead, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return Response.json({ error: error.message }, { status: 403 });
    }
    console.error("POST /api/leads error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
