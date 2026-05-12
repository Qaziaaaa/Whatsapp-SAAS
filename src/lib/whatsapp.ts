/**
 * Meta WhatsApp Cloud API client.
 *
 * Handles sending outgoing messages to customers via the Meta Graph API.
 * Each organization stores its own credentials (phoneNumberId + accessToken)
 * encrypted in the database — pass the decrypted values here.
 *
 * API reference: https://developers.facebook.com/docs/whatsapp/cloud-api/messages
 */

const META_API_VERSION = "v19.0";
const META_API_BASE = "https://graph.facebook.com";

export class WhatsAppApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody: unknown
  ) {
    super(message);
    this.name = "WhatsAppApiError";
  }
}

interface SendMessageResponse {
  messaging_product: string;
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

/**
 * Sends a text message to a WhatsApp number via the Meta Cloud API.
 *
 * @param phoneNumberId - The WhatsApp Business phone number ID (from Meta Developer Console)
 * @param accessToken   - The permanent or temporary access token for the phone number
 * @param to            - The recipient's phone number in E.164 format (e.g. "923001234567")
 * @param text          - The message text to send (max 4096 characters)
 * @returns The WhatsApp message ID (wamid) of the sent message
 * @throws WhatsAppApiError if the Meta API returns a non-200 response
 */
export async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<{ wamid: string }> {
  const url = `${META_API_BASE}/${META_API_VERSION}/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new WhatsAppApiError(
      `Meta API error: ${response.status} ${response.statusText}`,
      response.status,
      responseData
    );
  }

  const data = responseData as SendMessageResponse;
  const wamid = data.messages?.[0]?.id;

  if (!wamid) {
    throw new WhatsAppApiError(
      "Meta API returned success but no message ID in response",
      response.status,
      responseData
    );
  }

  return { wamid };
}

/**
 * Marks an incoming message as read via the Meta Cloud API.
 * This shows the blue double-tick to the customer.
 *
 * @param phoneNumberId - The WhatsApp Business phone number ID
 * @param accessToken   - The access token for the phone number
 * @param wamid         - The WhatsApp message ID to mark as read
 */
export async function markMessageAsRead(
  phoneNumberId: string,
  accessToken: string,
  wamid: string
): Promise<void> {
  const url = `${META_API_BASE}/${META_API_VERSION}/${phoneNumberId}/messages`;

  await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      status: "read",
      message_id: wamid,
    }),
  });
  // Intentionally not throwing on error — marking as read is best-effort
}
