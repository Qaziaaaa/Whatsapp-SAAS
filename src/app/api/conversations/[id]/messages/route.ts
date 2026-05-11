import { requireAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitToOrg } from "@/lib/socket-emitter";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { decrypt } from "@/lib/crypto";
import { SendMessageSchema } from "@/schemas/message.schema";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") ?? undefined;
    const pageSize = 50;

    const conv = await prisma.conversation.findUnique({
      where: { id },
      select: { organizationId: true },
    });
    if (!conv) return Response.json({ error: "Not found" }, { status: 404 });
    if (conv.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      take: pageSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        conversationId: true,
        senderType: true,
        senderId: true,
        content: true,
        wamid: true,
        status: true,
        createdAt: true,
      },
    });

    const nextCursor =
      messages.length === pageSize
        ? messages[messages.length - 1]?.id
        : null;

    return Response.json({ messages, nextCursor });
  } catch (error) {
    console.error("GET /api/conversations/[id]/messages error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireAuthContext();
    const { id } = await params;

    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: { lead: { select: { phone: true } } },
    });
    if (!conv) return Response.json({ error: "Not found" }, { status: 404 });
    if (conv.organizationId !== ctx.organizationId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    // Save agent message
    const message = await prisma.message.create({
      data: {
        conversationId: id,
        organizationId: ctx.organizationId,
        senderType: "agent",
        senderId: ctx.userId,
        content: parsed.data.content,
        status: "sent",
      },
    });

    // Update conversation lastMessage
    await prisma.conversation.update({
      where: { id },
      data: { lastMessage: parsed.data.content, updatedAt: new Date() },
    });

    // Send via Meta API if org credentials are configured
    const org = ctx.organization;
    if (org.waPhoneNumberId && org.waAccessToken) {
      try {
        const phoneNumberId = decrypt(org.waPhoneNumberId);
        const accessToken = decrypt(org.waAccessToken);
        const { wamid } = await sendWhatsAppMessage(
          phoneNumberId,
          accessToken,
          conv.lead.phone,
          parsed.data.content
        );
        await prisma.message.update({
          where: { id: message.id },
          data: { wamid },
        });
      } catch (error) {
        console.error("Meta API send failed for agent message:", error);
        await prisma.message.update({
          where: { id: message.id },
          data: { status: "failed" },
        });
      }
    }

    // Emit real-time event to dashboard
    await emitToOrg(ctx.organizationId, "new_message", {
      ...message,
      conversationId: id,
    });

    return Response.json(message, { status: 201 });
  } catch (error) {
    console.error("POST /api/conversations/[id]/messages error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
