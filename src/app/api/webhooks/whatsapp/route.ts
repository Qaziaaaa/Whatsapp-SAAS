import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { WebhookPayloadSchema, extractFirstMessage } from "@/schemas/webhook.schema";
import { rateLimit } from "@/lib/rate-limit";

// ─── GET: Meta webhook verification handshake ────────────────────────────────
//
// When you configure a webhook URL in Meta Developer Console, Meta sends a
// GET request with these query params to verify you own the endpoint.
// You must respond with hub.challenge to confirm.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    console.log("✅ WhatsApp webhook verified");
    return new Response(challenge, { status: 200 });
  }

  console.warn("❌ WhatsApp webhook verification failed", { mode, token });
  return new Response("Forbidden", { status: 403 });
}

// ─── POST: Incoming messages and status updates ───────────────────────────────
//
// CRITICAL: Always return HTTP 200 to Meta, even on internal errors.
// If Meta receives a non-200, it will retry the webhook — causing duplicate
// records. We log failures internally and return 200 regardless.

export async function POST(request: Request) {
  // Rate limiting: 10 requests per minute per IP
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(ip, { limit: 10, windowMs: 60_000 })) {
    // Still return 200 to Meta — rate limit is for abuse protection
    return Response.json({ received: true }, { status: 200 });
  }

  // Read raw body BEFORE any JSON parsing — required for HMAC verification
  const rawBody = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  let orgId: string;
  let appSecret: string;

  try {
    // Parse payload to extract phone_number_id (used to identify the org)
    const parsed = JSON.parse(rawBody.toString());
    const phoneNumberId =
      parsed?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;

    if (!phoneNumberId) {
      // Not a message event (could be a test ping) — acknowledge and ignore
      return Response.json({ received: true }, { status: 200 });
    }

    // Find the organization by their encrypted phone number ID
    // We store all orgs and check which one matches after decryption
    const orgs = await prisma.organization.findMany({
      where: { waPhoneNumberId: { not: null } },
      select: { id: true, waPhoneNumberId: true, waAppSecret: true },
    });

    const matchedOrg = orgs.find((org: { id: string; waPhoneNumberId: string | null; waAppSecret: string | null }) => {
      try {
        return decrypt(org.waPhoneNumberId!) === phoneNumberId;
      } catch {
        return false;
      }
    });

    if (!matchedOrg || !matchedOrg.waAppSecret) {
      // Unknown org or not configured — silently acknowledge
      return Response.json({ received: true }, { status: 200 });
    }

    orgId = matchedOrg.id;
    appSecret = decrypt(matchedOrg.waAppSecret);
  } catch (error) {
    console.error("Webhook pre-processing failed:", error);
    return Response.json({ received: true }, { status: 200 });
  }

  // Verify HMAC-SHA256 signature using the org's app secret
  if (!verifyWebhookSignature(rawBody, signature, appSecret)) {
    console.warn("❌ Invalid webhook signature for org:", orgId);
    return Response.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Process the pipeline — always return 200 even if pipeline fails
  try {
    const payload = WebhookPayloadSchema.parse(JSON.parse(rawBody.toString()));

    // Dynamically import pipeline to keep this file lean
    const { processIncomingMessage } = await import("@/lib/pipeline");
    await processIncomingMessage(orgId, payload);
  } catch (error) {
    console.error("Webhook pipeline failed:", {
      error,
      orgId,
      timestamp: new Date().toISOString(),
    });
  }

  return Response.json({ received: true }, { status: 200 });
}
