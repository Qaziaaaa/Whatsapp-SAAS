import { z } from "zod";

export const WhatsAppCredentialsSchema = z.object({
  phoneNumberId: z.string().min(1, "Phone Number ID is required"),
  accessToken: z.string().min(1, "Access Token is required"),
  appSecret: z.string().min(1, "App Secret is required"),
});

export const AiSettingsSchema = z.object({
  aiPrompt: z
    .string()
    .min(10, "AI prompt must be at least 10 characters")
    .max(2000),
  aiLanguage: z.enum(["english", "urdu", "auto"]),
  aiEnabled: z.boolean(),
});

export type WhatsAppCredentialsInput = z.infer<typeof WhatsAppCredentialsSchema>;
export type AiSettingsInput = z.infer<typeof AiSettingsSchema>;
