import { z } from 'zod';

const taskStatusEnum = z.enum(['PENDIENTE', 'EN_PROGRESO', 'FINALIZADA', 'CANCELADA']);

// Fila ya resuelta/aprobada por el coordinador en el asistente de importación.
// El backend NUNCA confía en esto ciegamente: revalida todo antes de insertar
// (existencia y estado de técnico/labor, consistencia de fechas, tiempo total).
export const confirmRowSchema = z.object({
  rowNumber: z.number().int(),
  description: z.string().trim().min(3).max(500),
  technicianId: z.string().min(1),
  laborTypeId: z.string().min(1),
  scheduledDate: z.coerce.date(),
  startedAt: z.coerce.date().nullable().optional(),
  finishedAt: z.coerce.date().nullable().optional(),
  status: taskStatusEnum,
  observations: z.string().trim().max(1000).nullable().optional(),
  externalRef: z.string().trim().max(200).nullable().optional(),
});

export const confirmImportSchema = z.object({
  rows: z.array(confirmRowSchema).min(1, 'No hay filas para importar').max(2000, 'Máximo 2000 filas por importación'),
});

export type ConfirmRowInput = z.infer<typeof confirmRowSchema>;
