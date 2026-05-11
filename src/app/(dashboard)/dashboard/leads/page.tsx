import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LeadsClient } from "./LeadsClient";

export default async function LeadsPage() {
  const ctx = await requireAuthContext();

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
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  const canManage = ctx.role === "owner" || ctx.role === "admin";

  return (
    <LeadsClient
      initialLeads={leads}
      canManage={canManage}
      organizationId={ctx.organizationId}
    />
  );
}
