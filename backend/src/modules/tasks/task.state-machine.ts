import type { TaskStatus } from '@prisma/client';

// Transiciones válidas. Único punto de verdad sobre el ciclo de vida de una
// tarea — reutilizado tanto en validación previa como en las guardas atómicas
// del service. Extensible a futuro (ej. estado EN_PAUSA) sin tocar el resto.
export const ALLOWED_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  PENDIENTE: ['EN_PROGRESO', 'CANCELADA'],
  EN_PROGRESO: ['FINALIZADA', 'CANCELADA'],
  FINALIZADA: [],
  CANCELADA: [],
};

export function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}
