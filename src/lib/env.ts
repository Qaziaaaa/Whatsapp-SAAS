import { z } from "zod";

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  DIRECT_URL: z.string().url("DIRECT_URL must be a valid URL"),

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1, "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is required"),
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),

  // Groq
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),

  // Socket.io
  SOCKET_SERVER_URL: z.string().url("SOCKET_SERVER_URL must be a valid URL"),
  SOCKET_SERVER_SECRET: z.string().min(32, "SOCKET_SERVER_SECRET must be at least 32 characters"),

  // Encryption
  ENCRYPTION_KEY: z.string().length(64, "ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)"),

  // Webhook
  WEBHOOK_VERIFY_TOKEN: z.string().min(1, "WEBHOOK_VERIFY_TOKEN is required"),

  // App
  NEXT_APP_URL: z.string().url("NEXT_APP_URL must be a valid URL"),
});

function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const missingVars = result.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(
      `❌ Invalid or missing environment variables:\n${missingVars}\n\nPlease check your .env.local file against .env.example`
    );
  }

  return result.data;
}

// Validate at module load time — throws descriptive error if any required var is missing
export const env = validateEnv();
