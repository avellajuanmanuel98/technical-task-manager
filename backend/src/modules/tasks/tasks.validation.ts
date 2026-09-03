import { z } from 'zod';

export const createTaskSchema = z.object({
  description: z.string().trim().min(3, 'La descripción es muy corta').max(500),
  technicianId: z.string().min(1, 'Técnico requerido'),
  laborTypeId: z.string().min(1, 'Tipo de labor requerido'),
  scheduledDate: z.coerce.date({ error: 'Fecha inválida' }),
  observations: z.string().trim().max(1000).optional(),
});

// Solo editable mientras la tarea está PENDIENTE. Nunca acepta timestamps ni
// estado: esos campos son exclusivos de las transiciones controladas por el
// backend (start/finish/cancel).
export const updateTaskSchema = z.object({
  description: z.string().trim().min(3).max(500).optional(),
  technicianId: z.string().min(1).optional(),
  laborTypeId: z.string().min(1).optional(),
  scheduledDate: z.coerce.date().optional(),
  observations: z.string().trim().max(1000).optional(),
});

export const finishTaskSchema = z.object({
  observations: z.string().trim().max(1000).optional(),
});

export const cancelTaskSchema = z.object({
  reason: z.string().trim().min(3, 'Debe indicar un motivo de cancelación').max(500),
});

const taskStatusEnum = z.enum(['PENDIENTE', 'EN_PROGRESO', 'FINALIZADA', 'CANCELADA']);

export const listTasksQuerySchema = z.object({
  technicianId: z.string().optional(),
  status: taskStatusEnum.optional(),
  laborTypeId: z.string().optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['scheduledDate', 'createdAt', 'status', 'totalMinutes']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;
