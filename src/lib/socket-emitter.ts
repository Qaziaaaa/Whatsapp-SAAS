/**
 * Server-side Socket.io event emitter.
 *
 * The Next.js app is stateless (serverless functions) and cannot hold
 * a persistent WebSocket connection. Instead, it POSTs to the Socket.io
 * server's internal /emit endpoint, which then broadcasts to the
 * appropriate organization room.
 *
 * This keeps Next.js fully stateless while still enabling real-time updates.
 *
 * Failure handling: Socket emission is non-fatal. If the Socket.io server
 * is down or slow, we log a warning and continue — the dashboard will
 * still show the message on next refresh.
 */

type SocketEvent = "new_message" | "lead_updated";

/**
 * Emits a real-time event to all dashboard clients in an organization's room.
 *
 * @param organizationId - The org ID (used as the Socket.io room name)
 * @param event          - The event name
 * @param data           - The event payload (serialized to JSON)
 */
export async function emitToOrg(
  organizationId: string,
  event: SocketEvent,
  data: unknown
): Promise<void> {
  const socketServerUrl = process.env.SOCKET_SERVER_URL;
  const socketServerSecret = process.env.SOCKET_SERVER_SECRET;

  if (!socketServerUrl || !socketServerSecret) {
    // Socket server not configured — skip silently in development
    if (process.env.NODE_ENV === "development") {
      console.log(`[Socket] Would emit '${event}' to org ${organizationId}`);
    }
    return;
  }

  try {
    await fetch(`${socketServerUrl}/emit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${socketServerSecret}`,
      },
      body: JSON.stringify({
        room: organizationId,
        event,
        data,
      }),
      // 3-second timeout — never block the webhook pipeline for socket failures
      signal: AbortSignal.timeout(3_000),
    });
  } catch (error) {
    // Non-fatal: log warning and continue
    console.warn("[Socket] Emission failed (non-fatal):", {
      organizationId,
      event,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
