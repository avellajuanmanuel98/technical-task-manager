import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().trim().min(2).max(150),
  email: z.email(),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['ADMIN', 'TECNICO']),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(150).optional(),
  email: z.email().optional(),
  password: z.string().min(8).optional(),
  role: z.enum(['ADMIN', 'TECNICO']).optional(),
  active: z.boolean().optional(),
});

export const listUsersQuerySchema = z.object({
  role: z.enum(['ADMIN', 'TECNICO']).optional(),
  active: z.coerce.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
