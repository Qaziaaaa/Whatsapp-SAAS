import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InboxClient } from "./InboxClient";

export default async function InboxPage() {
  const ctx = await requireAuthContext();

  const conversations = await prisma.conversation.findMany({
    where: { organizationId: ctx.organizationId },
    include: {
      lead: { select: { id: true, name: true, phone: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 20,
  });

  return (
    <InboxClient
      initialConversations={conversations}
      organizationId={ctx.organizationId}
    />
  );
}
