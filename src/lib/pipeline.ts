import { prisma } from "./prisma";
import { decrypt } from "./crypto";
import { sendWhatsAppMessage } from "./whatsapp";
import { generateAiReply, buildGroqMessages } from "./groq";
import { emitToOrg } from "./socket-emitter";
import { extractFirstMessage, WebhookPayload } from "@/schemas/webhook.schema";

// Local types (mirrors Prisma models without requiring generated client)
interface Lead {
  id: string;
  organizationId: string;
  phone: string;
  name: string | null;
  status: string;
  tags: string[];
  notes: string | null;
  assignedTo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Conversation {
  id: string;
  organizationId: string;
  leadId: string;
  aiEnabled: boolean;
  lastMessage: string | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Pipeline flow:
// 1. Extract message data from webhook payload
// 2. Upsert Lead (by phone + organizationId)
// 3. Upsert Conversation (by leadId + organizationId)
// 4. Save incoming Message (senderType: "customer")
// 5. Update Conversation.lastMessage + updatedAt
// 6. Emit real-time event to dashboard
// 7. If AI enabled → generate reply → save → send via Meta API → emit
//
// Called from the webhook POST handler which wraps it in a try/catch
// that always returns HTTP 200 to Meta.

export async function processIncomingMessage(
  orgId: string,
  payload: WebhookPayload
): Promise<void> {
  // Handle status update payloads (delivered/read/failed)
  const statusEntry = payload.entry?.[0]?.changes?.[0]?.value?.statuses?.[0];
  if (statusEntry) {
    await processStatusUpdate(statusEntry as { id: string; status: string });
    return;
  }

  // Extract the first text message from the payload
  const messageData = extractFirstMessage(payload);
  if (!messageData) {
    return;
  }

  const { from: phone, wamid, text, contactName } = messageData;

  // Fetch org with credentials for AI reply
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: {
      id: true,
      aiEnabled: true,
      aiPrompt: true,
      aiLanguage: true,
      waPhoneNumberId: true,
      waAccessToken: true,
    },
  });

  if (!org) return;

  // Step 1: Upsert Lead
  const lead = await upsertLead(orgId, phone, contactName);

  // Step 2: Upsert Conversation
  const conversation = await upsertConversation(orgId, lead.id);

  // Step 3: Save incoming customer message
  const customerMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      organizationId: orgId,
      senderType: "customer",
      content: text,
      wamid,
      status: "delivered",
    },
  });

  // Step 4: Update conversation's lastMessage and updatedAt
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: {
      lastMessage: text,
      updatedAt: new Date(),
      unreadCount: { increment: 1 },
    },
  });

  // Step 5: Emit real-time event to dashboard
  await emitToOrg(orgId, "new_message", {
    ...customerMessage,
    conversationId: conversation.id,
  });

  // Step 6: AI auto-reply (if enabled globally and for this conversation)
  if (!org.aiEnabled || !conversation.aiEnabled) return;

  // Fetch last 10 messages for context
  const recentMessages = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: { content: true, senderType: true },
  });

  let aiReplyText: string;
  try {
    const groqMessages = buildGroqMessages(
      recentMessages,
      {
        aiPrompt: org.aiPrompt ?? "You are a helpful customer service assistant.",
        aiLanguage: org.aiLanguage ?? "auto",
      },
      text
    );
    aiReplyText = await generateAiReply(groqMessages);
  } catch (error) {
    console.error("Groq AI reply failed:", {
      error,
      orgId,
      conversationId: conversation.id,
    });
    return;
  }

  // Save AI message
  const aiMessage = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      organizationId: orgId,
      senderType: "ai",
      content: aiReplyText,
      status: "sent",
    },
  });

  // Update conversation lastMessage with AI reply
  await prisma.conversation.update({
    where: { id: conversation.id },
    data: { lastMessage: aiReplyText, updatedAt: new Date() },
  });

  // Send AI reply via Meta API
  if (org.waPhoneNumberId && org.waAccessToken) {
    try {
      const phoneNumberId = decrypt(org.waPhoneNumberId);
      const accessToken = decrypt(org.waAccessToken);
      const { wamid: aiWamid } = await sendWhatsAppMessage(
        phoneNumberId,
        accessToken,
        phone,
        aiReplyText
      );
      await prisma.message.update({
        where: { id: aiMessage.id },
        data: { wamid: aiWamid },
      });
    } catch (error) {
      console.error("Meta API send failed for AI reply:", {
        error,
        orgId,
        messageId: aiMessage.id,
      });
      await prisma.message.update({
        where: { id: aiMessage.id },
        data: { status: "failed" },
      });
    }
  }

  // Emit AI reply to dashboard
  await emitToOrg(orgId, "new_message", {
    ...aiMessage,
    conversationId: conversation.id,
  });
}

async function upsertLead(
  organizationId: string,
  phone: string,
  contactName?: string
): Promise<Lead> {
  return prisma.lead.upsert({
    where: {
      organizationId_phone: { organizationId, phone },
    },
    create: {
      organizationId,
      phone,
      name: contactName ?? null,
      status: "new",
    },
    update: {
      ...(contactName ? { name: contactName } : {}),
    },
  });
}

async function upsertConversation(
  organizationId: string,
  leadId: string
): Promise<Conversation> {
  const existing = await prisma.conversation.findFirst({
    where: { leadId, organizationId },
  });

  if (existing) return existing;

  return prisma.conversation.create({
    data: { organizationId, leadId },
  });
}

async function processStatusUpdate(status: {
  id: string;
  status: string;
}): Promise<void> {
  if (!status.id) return;

  const statusMap: Record<string, "sent" | "delivered" | "read" | "failed"> = {
    sent: "sent",
    delivered: "delivered",
    read: "read",
    failed: "failed",
  };

  const mappedStatus = statusMap[status.status];
  if (!mappedStatus) return;

  await prisma.message.updateMany({
    where: { wamid: status.id },
    data: { status: mappedStatus },
  });
}
