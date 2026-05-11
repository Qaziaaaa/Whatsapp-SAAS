import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createOrganization } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function OnboardingPage() {
  const { userId: clerkId } = await auth();
  if (!clerkId) redirect("/sign-in");

  // If user already has an org, skip onboarding
  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (user) {
    const member = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
    });
    if (member) redirect("/dashboard/inbox");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">
            Create your workspace
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up your business on WhatsApp CRM to get started.
          </p>
        </div>

        <form
          action={createOrganization as unknown as (formData: FormData) => Promise<void>}
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Business name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. Acme Store"
              required
              minLength={2}
              maxLength={100}
              className="w-full"
            />
          </div>
          <Button type="submit" className="w-full">
            Create workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
