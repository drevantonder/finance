import { z } from "zod";

export const TaskSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().optional().default(""),
  tasks: z.array(z.object({
    id: z.string().or(z.number()),
    description: z.string(),
    completed: z.boolean().default(false)
  })).default([]),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  assigned_to: z.string().optional(),
  assigned_at: z.string().optional(),
  implemented_by: z.string().optional(),
  blocked_reason: z.string().optional(),
  branch: z.string().optional(),
  worktree_path: z.string().optional(),
  rejection_count: z.number().default(0),
  rejection_history: z.array(z.any()).default([]),
  escalation_reason: z.string().optional(),
  review: z.object({
    status: z.enum(["approved", "rejected", "pending"]).default("pending"),
    reviewer: z.string().optional(),
    reviewed_at: z.string().optional(),
    issues: z.array(z.string()).default([])
  }).default({
    status: "pending",
    issues: []
  }),
  pr_number: z.number().optional(),
  pr_url: z.string().url().optional(),
  created_at: z.string().default(() => new Date().toISOString()),
  updated_at: z.string().default(() => new Date().toISOString())
});

export type Task = z.infer<typeof TaskSchema>;
