import { z } from "zod";

export const LeadStatusEnum = z.enum(["new", "interested", "follow_up", "won", "lost"]);

export const CreateLeadSchema = z.object({
  phone: z.string().min(7, "Phone number must be at least 7 characters").max(20),
  name: z.string().max(100).optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

export const UpdateLeadSchema = z.object({
  name: z.string().max(100).optional(),
  status: LeadStatusEnum.optional(),
  notes: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  assignedTo: z.string().nullable().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
