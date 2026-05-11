import { z } from "zod";

/**
 * Zod schemas for Meta WhatsApp Cloud API webhook payloads.
 *
 * Meta sends two types of webhook events:
 * 1. Message events — when a customer sends a message
 * 2. Status events — when a message delivery status changes (sent/delivered/read/failed)
 *
 * The payload structure is deeply nested. We use .passthrough() on intermediate
 * objects to allow extra fields Meta may add in future API versions.
 *
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples
 */

// ─── Incoming Message Schema ─────────────────────────────────────────────────

const WhatsAppTextSchema = z.object({
  body: z.string(),
});

const WhatsAppMessageSchema = z.object({
  from: z.string(),          // Sender's phone number (E.164 without +)
  id: z.string(),            // WhatsApp message ID (wamid)
  timestamp: z.string(),
  type: z.string(),          // "text", "image", "audio", etc.
  text: WhatsAppTextSchema.optional(),
}).passthrough();

const WhatsAppMetadataSchema = z.object({
  display_phone_number: z.string(),
  phone_number_id: z.string(),  // Used to identify which org this belongs to
}).passthrough();

const WhatsAppContactSchema = z.object({
  profile: z.object({ name: z.string() }).optional(),
  wa_id: z.string(),
}).passthrough();

const WhatsAppValueSchema = z.object({
  messaging_product: z.string(),
  metadata: WhatsAppMetadataSchema,
  contacts: z.array(WhatsAppContactSchema).optional(),
  messages: z.array(WhatsAppMessageSchema).optional(),
  statuses: z.array(z.any()).optional(),
}).passthrough();

const WhatsAppChangeSchema = z.object({
  value: WhatsAppValueSchema,
  field: z.string(),
}).passthrough();

const WhatsAppEntrySchema = z.object({
  id: z.string(),
  changes: z.array(WhatsAppChangeSchema),
}).passthrough();

export const WebhookPayloadSchema = z.object({
  object: z.string(),
  entry: z.array(WhatsAppEntrySchema),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;
export type WhatsAppMessage = z.infer<typeof WhatsAppMessageSchema>;
export type WhatsAppMetadata = z.infer<typeof WhatsAppMetadataSchema>;

// ─── Status Update Schema ─────────────────────────────────────────────────────

const MessageStatusEnum = z.enum(["sent", "delivered", "read", "failed"]);

const WhatsAppStatusSchema = z.object({
  id: z.string(),            // wamid of the original outgoing message
  status: MessageStatusEnum,
  timestamp: z.string(),
  recipient_id: z.string(),  // Recipient's phone number
  errors: z.array(z.any()).optional(),
}).passthrough();

export const StatusUpdatePayloadSchema = z.object({
  object: z.string(),
  entry: z.array(
    z.object({
      id: z.string(),
      changes: z.array(
        z.object({
          value: z.object({
            messaging_product: z.string(),
            metadata: WhatsAppMetadataSchema,
            statuses: z.array(WhatsAppStatusSchema),
          }).passthrough(),
          field: z.string(),
        }).passthrough()
      ),
    }).passthrough()
  ),
});

export type StatusUpdatePayload = z.infer<typeof StatusUpdatePayloadSchema>;
export type WhatsAppStatus = z.infer<typeof WhatsAppStatusSchema>;

// ─── Helper: extract first message from payload ───────────────────────────────

export function extractFirstMessage(payload: WebhookPayload): {
  phoneNumberId: string;
  from: string;
  wamid: string;
  text: string;
  contactName?: string;
} | null {
  const entry = payload.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const message = value?.messages?.[0];

  if (!message || message.type !== "text" || !message.text?.body) {
    return null; // Not a text message — skip for MVP
  }

  return {
    phoneNumberId: value.metadata.phone_number_id,
    from: message.from,
    wamid: message.id,
    text: message.text.body,
    contactName: value.contacts?.[0]?.profile?.name,
  };
}
