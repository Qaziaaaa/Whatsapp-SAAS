import { z } from "zod";

export const SendMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(4096, "Message too long"),
});

export type SendMessageInput = z.infer<typeof SendMessageSchema>;
