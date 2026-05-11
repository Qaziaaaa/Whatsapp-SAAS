import { prisma } from "@/lib/prisma";

// This endpoint handles Clerk webhook events (user.created, user.updated)
// as a backup to the inline upsert in getAuthContext().
// Configure this URL in your Clerk Dashboard → Webhooks.
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const eventType = payload?.type;

    if (eventType === "user.created" || eventType === "user.updated") {
      const { id: clerkId, email_addresses, first_name, last_name } = payload.data;
      const email = email_addresses?.[0]?.email_address ?? "";
      const name = `${first_name ?? ""} ${last_name ?? ""}`.trim() || null;

      await prisma.user.upsert({
        where: { clerkId },
        create: { clerkId, email, name },
        update: { email, name },
      });
    }

    return Response.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return Response.json({ error: "Webhook processing failed" }, { status: 200 });
  }
}
