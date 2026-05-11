import { redirect } from "next/navigation";
import { requireAuthContext } from "@/lib/auth";
import { saveWhatsAppCredentials, saveAiSettings } from "@/actions/settings.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default async function SettingsPage() {
  const ctx = await requireAuthContext();

  // Only owner and admin can access settings
  if (ctx.role === "agent") {
    redirect("/dashboard/inbox");
  }

  const org = ctx.organization;

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-2xl space-y-8">
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>

        {/* WhatsApp Credentials */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            WhatsApp Integration
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Connect your WhatsApp Business account. Get these values from the{" "}
            <a
              href="https://developers.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 underline"
            >
              Meta Developer Console
            </a>
            .
          </p>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form action={saveWhatsAppCredentials as any} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number ID
              </label>
              <Input
                name="phoneNumberId"
                type="password"
                placeholder={
                  org.waPhoneNumberId ? "••••••••••••" : "Enter Phone Number ID"
                }
                className="font-mono"
              />
              {org.waPhoneNumberId && (
                <p className="mt-1 text-xs text-gray-400">
                  ✓ Configured — enter a new value to update
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Access Token
              </label>
              <Input
                name="accessToken"
                type="password"
                placeholder={
                  org.waAccessToken ? "••••••••••••" : "Enter Access Token"
                }
                className="font-mono"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                App Secret
              </label>
              <Input
                name="appSecret"
                type="password"
                placeholder={
                  org.waAppSecret ? "••••••••••••" : "Enter App Secret"
                }
                className="font-mono"
              />
            </div>

            <div className="pt-2">
              <p className="mb-3 text-xs text-gray-500">
                <strong>Webhook URL:</strong>{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  {process.env.NEXT_APP_URL ?? "https://your-app.vercel.app"}
                  /api/webhooks/whatsapp
                </code>
              </p>
              <p className="mb-3 text-xs text-gray-500">
                <strong>Verify Token:</strong>{" "}
                <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">
                  {process.env.WEBHOOK_VERIFY_TOKEN ?? "(set WEBHOOK_VERIFY_TOKEN env var)"}
                </code>
              </p>
            </div>

            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600"
            >
              Save WhatsApp credentials
            </Button>
          </form>
        </section>

        {/* AI Settings */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-gray-900">
            AI Auto-Reply
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Configure how the AI responds to your customers.
          </p>

          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <form action={saveAiSettings as any} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI System Prompt
              </label>
              <Textarea
                name="aiPrompt"
                defaultValue={org.aiPrompt}
                rows={5}
                placeholder="You are a helpful customer service assistant for..."
                className="text-sm"
              />
              <p className="mt-1 text-xs text-gray-400">
                This is the instruction given to the AI. Describe your business
                tone and what the AI should help with.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reply Language
              </label>
              <Select name="aiLanguage" defaultValue={org.aiLanguage}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="english">English only</SelectItem>
                  <SelectItem value="urdu">Urdu only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700">
                AI Auto-Reply
              </label>
              <Select
                name="aiEnabled"
                defaultValue={org.aiEnabled ? "true" : "false"}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Enabled</SelectItem>
                  <SelectItem value="false">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600"
            >
              Save AI settings
            </Button>
          </form>
        </section>

        {/* Organization Info */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-gray-900">
            Organization
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="font-medium text-gray-900">{org.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Slug</span>
              <span className="font-mono text-gray-900">{org.slug}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Your role</span>
              <span className="capitalize font-medium text-gray-900">
                {ctx.role}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
