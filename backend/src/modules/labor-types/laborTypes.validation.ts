import { z } from 'zod';

export const createLaborTypeSchema = z.object({
  name: z.string().trim().min(2).max(150),
  description: z.string().trim().max(500).optional(),
});

export const updateLaborTypeSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  description: z.string().trim().max(500).optional(),
  active: z.boolean().optional(),
});

export type CreateLaborTypeInput = z.infer<typeof createLaborTypeSchema>;
export type UpdateLaborTypeInput = z.infer<typeof updateLaborTypeSchema>;
