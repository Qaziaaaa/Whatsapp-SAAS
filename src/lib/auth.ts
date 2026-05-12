import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "./prisma";
import { redirect } from "next/navigation";

export type AuthContext = {
  userId: string;
  clerkId: string;
  organizationId: string;
  role: "owner" | "admin" | "agent";
  organization: {
    id: string;
    name: string;
    slug: string;
    aiPrompt: string;
    aiLanguage: string;
    aiEnabled: boolean;
    waPhoneNumberId: string | null;
    waAccessToken: string | null;
    waAppSecret: string | null;
  };
};

/**
 * Gets the authenticated user's context including their organization membership.
 * Call this at the top of every protected Server Component and Route Handler.
 * Redirects to /sign-in if not authenticated.
 * Returns null if authenticated but has no org membership (redirect to /onboarding).
 */
export async function getAuthContext(): Promise<AuthContext | null> {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    redirect("/sign-in");
  }

  // Ensure user record exists in our DB (upsert on every call is safe — idempotent)
  const clerkUser = await currentUser();
  if (clerkUser) {
    await prisma.user.upsert({
      where: { clerkId },
      create: {
        clerkId,
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
      },
      update: {
        email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
        name: `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim() || null,
      },
    });
  }

  // Look up org membership
  const member = await prisma.organizationMember.findFirst({
    where: {
      user: { clerkId },
    },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          aiPrompt: true,
          aiLanguage: true,
          aiEnabled: true,
          waPhoneNumberId: true,
          waAccessToken: true,
          waAppSecret: true,
        },
      },
      user: {
        select: { id: true },
      },
    },
  });

  if (!member) {
    // User is authenticated but has no org — caller should redirect to /onboarding
    return null;
  }

  return {
    userId: member.user.id,
    clerkId,
    organizationId: member.organizationId,
    role: member.role as "owner" | "admin" | "agent",
    organization: member.organization,
  };
}

/**
 * Like getAuthContext() but throws if no org membership.
 * Use in API route handlers where you always expect an org context.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!ctx) {
    redirect("/onboarding");
  }
  return ctx;
}
