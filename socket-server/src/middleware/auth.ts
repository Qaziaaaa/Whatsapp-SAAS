import { createClerkClient } from "@clerk/backend";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

/**
 * Verifies a Clerk session token and extracts the organizationId.
 *
 * The Dashboard client passes its Clerk session token in the Socket.io
 * connection handshake. We verify it here using the Clerk Backend SDK.
 *
 * @param token - The Clerk session JWT from the client handshake
 * @returns { organizationId } if valid, null if invalid
 */
export async function verifyClerkToken(
  token: string
): Promise<{ organizationId: string; userId: string } | null> {
  try {
    // Verify the JWT using Clerk's backend SDK
    const payload = await clerkClient.verifyToken(token);

    if (!payload || !payload.sub) return null;

    const clerkUserId = payload.sub;

    // Get the user's active organization from Clerk session claims
    // The organizationId is stored in the session's org_id claim
    const orgId = (payload as Record<string, unknown>).org_id as string | undefined;

    if (!orgId) {
      // User has no active org in their session
      // This can happen if they haven't selected an org yet
      return null;
    }

    return { organizationId: orgId, userId: clerkUserId };
  } catch (error) {
    console.error("[Socket Auth] Token verification failed:", error);
    return null;
  }
}
