import Groq from "groq-sdk";

/**
 * Groq API client for AI auto-reply generation.
 *
 * Why Groq?
 * Groq provides extremely fast inference (LPU hardware) with a generous
 * free tier. We use llama-3.1-8b-instant as the default model — fast,
 * capable, and free.
 *
 * The client is instantiated lazily (on first call) to avoid issues
 * with Next.js module loading in edge/serverless environments.
 */

const DEFAULT_MODEL = "llama-3.1-8b-instant";
const TIMEOUT_MS = 8_000; // 8 seconds — as specified in requirements

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class GroqApiError extends Error {
  constructor(
    message: string,
    public readonly model: string,
    public readonly promptLength: number,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "GroqApiError";
  }
}

let groqClient: Groq | null = null;

function getGroqClient(): Groq {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }
  return groqClient;
}

/**
 * Generates an AI reply using the Groq API.
 *
 * @param messages - The conversation messages including system prompt
 * @param model    - The Groq model to use (defaults to llama-3.1-8b-instant)
 * @returns The generated reply text
 * @throws GroqApiError if the API call fails or times out after 8 seconds
 */
export async function generateAiReply(
  messages: GroqMessage[],
  model: string = DEFAULT_MODEL
): Promise<string> {
  const client = getGroqClient();
  const promptLength = messages.reduce((sum, m) => sum + m.content.length, 0);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        messages,
        max_tokens: 500,
        temperature: 0.7,
      },
      { signal: controller.signal }
    );

    const reply = completion.choices[0]?.message?.content;
    if (!reply) {
      throw new GroqApiError(
        "Groq returned empty response",
        model,
        promptLength
      );
    }

    return reply.trim();
  } catch (error) {
    if (error instanceof GroqApiError) throw error;

    const isTimeout =
      error instanceof Error && error.name === "AbortError";

    throw new GroqApiError(
      isTimeout
        ? `Groq API timed out after ${TIMEOUT_MS}ms`
        : `Groq API error: ${error instanceof Error ? error.message : String(error)}`,
      model,
      promptLength,
      error
    );
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Builds the Groq messages array for a conversation.
 *
 * Context window: last 10 messages (Property 10 from design doc).
 * Language: auto-detected from customer message, or forced by org setting.
 *
 * @param recentMessages - Recent messages from the conversation (will use last 10)
 * @param org            - Organization config with aiPrompt and aiLanguage
 * @param incomingText   - The new incoming customer message
 */
export function buildGroqMessages(
  recentMessages: Array<{ content: string; senderType: string }>,
  org: { aiPrompt: string; aiLanguage: string },
  incomingText: string
): GroqMessage[] {
  // Build language instruction based on org setting
  let languageInstruction = "";
  if (org.aiLanguage === "urdu") {
    languageInstruction = "\n\nIMPORTANT: Always reply in Urdu (اردو).";
  } else if (org.aiLanguage === "english") {
    languageInstruction = "\n\nIMPORTANT: Always reply in English.";
  } else {
    // "auto" — detect from customer message
    languageInstruction =
      "\n\nIMPORTANT: Detect the language of the customer's message and reply in the same language. Support both English and Urdu.";
  }

  const systemPrompt = org.aiPrompt + languageInstruction;

  // Take only the last 10 messages for context (Property 10)
  const contextMessages = recentMessages.slice(-10).map((msg) => ({
    role:
      msg.senderType === "customer"
        ? ("user" as const)
        : ("assistant" as const),
    content: msg.content,
  }));

  return [
    { role: "system", content: systemPrompt },
    ...contextMessages,
    { role: "user", content: incomingText },
  ];
}
