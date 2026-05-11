"use server";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { z } from "zod";

const CreateOrgSchema = z.object({
  name: z.string().min(2, "Organization name must be at least 2 characters").max(100),
});

export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string };

export async function createOrganization(
  formData: FormData
): Promise<ActionResult> {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return { success: false, error: "Not authenticated" };
  }

  const rawName = formData.get("name");
  const parsed = CreateOrgSchema.safeParse({ name: rawName });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name } = parsed.data;

  // Get or create the user record
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user) {
    return { success: false, error: "User record not found. Please try signing out and back in." };
  }

  // Check if user already has an org
  const existingMember = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
  });
  if (existingMember) {
    redirect("/dashboard/inbox");
  }

  // Generate a unique slug
  let slug = generateSlug(name);
  const existing = await prisma.organization.findUnique({ where: { slug } });
  if (existing) {
    // Append a short random suffix to ensure uniqueness
    slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
  }

  // Create org and owner membership in a transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await prisma.$transaction(async (tx: any) => {
    const org = await tx.organization.create({
      data: { name, slug },
    });
    await tx.organizationMember.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: "owner",
      },
    });
  });

  redirect("/dashboard/inbox");
}
