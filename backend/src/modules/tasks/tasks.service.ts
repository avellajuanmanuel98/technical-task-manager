import { Prisma, Role, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../lib/errors';
import { canTransition } from './task.state-machine';
import type { CreateTaskInput, ExportTasksQuery, ListTasksQuery, UpdateTaskInput } from './tasks.validation';

interface Actor {
  id: string;
  role: Role;
}

const taskInclude = {
  technician: { select: { id: true, name: true, email: true } },
  laborType: { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
  startedBy: { select: { id: true, name: true } },
  finishedBy: { select: { id: true, name: true } },
  cancelledBy: { select: { id: true, name: true } },
} satisfies Prisma.TaskInclude;

function assertCanAccessTask(actor: Actor, technicianId: string): void {
  if (actor.role !== Role.ADMIN && actor.id !== technicianId) {
    throw new ForbiddenError('No tiene acceso a esta tarea');
  }
}

export async function createTask(actor: Actor, input: CreateTaskInput) {
  const [technician, laborType] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.technicianId } }),
    prisma.laborType.findUnique({ where: { id: input.laborTypeId } }),
  ]);

  if (!technician || technician.role !== Role.TECNICO || !technician.active) {
    throw new ValidationError('El técnico indicado no existe o no está activo');
  }
  if (!laborType || !laborType.active) {
    throw new ValidationError('El tipo de labor indicado no existe o no está activo');
  }

  return prisma.task.create({
    data: {
      description: input.description,
      technicianId: input.technicianId,
      laborTypeId: input.laborTypeId,
      scheduledDate: input.scheduledDate,
      observations: input.observations,
      status: TaskStatus.PENDIENTE,
      createdById: actor.id,
    },
    include: taskInclude,
  });
}

interface TaskFilterFields {
  technicianId?: string;
  status?: TaskStatus;
  laborTypeId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Compartido entre el listado paginado y la exportación: ambos deben
// aplicar exactamente los mismos filtros (incluida la restricción de
// visibilidad del técnico) para que "exportar lo que veo" sea literal.
function buildTaskWhere(actor: Actor, filters: TaskFilterFields): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = {};

  if (actor.role === Role.TECNICO) {
    where.technicianId = actor.id;
  } else if (filters.technicianId) {
    where.technicianId = filters.technicianId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.laborTypeId) where.laborTypeId = filters.laborTypeId;
  if (filters.dateFrom || filters.dateTo) {
    where.scheduledDate = {
      ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
      ...(filters.dateTo ? { lte: filters.dateTo } : {}),
    };
  }
  if (filters.search) {
    where.OR = [
      { description: { contains: filters.search, mode: 'insensitive' } },
      { technician: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

export async function listTasks(actor: Actor, query: ListTasksQuery) {
  const where = buildTaskWhere(actor, query);

  const [data, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { [query.sortBy]: query.sortDir },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return {
    data,
    meta: {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 1,
    },
  };
}

const EXPORT_MAX_ROWS = 20000;

export async function getTasksForExport(actor: Actor, query: ExportTasksQuery) {
  const where = buildTaskWhere(actor, query);

  return prisma.task.findMany({
    where,
    include: taskInclude,
    orderBy: { [query.sortBy]: query.sortDir },
    take: EXPORT_MAX_ROWS,
  });
}

export async function getTaskById(actor: Actor, id: number) {
  const task = await prisma.task.findUnique({ where: { id }, include: taskInclude });
  if (!task) throw new NotFoundError('Tarea no encontrada');
  assertCanAccessTask(actor, task.technicianId);
  return task;
}

export async function updateTask(actor: Actor, id: number, input: UpdateTaskInput) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError('Tarea no encontrada');

  if (task.status !== TaskStatus.PENDIENTE) {
    throw new ConflictError('Solo se pueden editar tareas en estado PENDIENTE');
  }

  if (input.technicianId) {
    const technician = await prisma.user.findUnique({ where: { id: input.technicianId } });
    if (!technician || technician.role !== Role.TECNICO || !technician.active) {
      throw new ValidationError('El técnico indicado no existe o no está activo');
    }
  }
  if (input.laborTypeId) {
    const laborType = await prisma.laborType.findUnique({ where: { id: input.laborTypeId } });
    if (!laborType || !laborType.active) {
      throw new ValidationError('El tipo de labor indicado no existe o no está activo');
    }
  }

  return prisma.task.update({
    where: { id },
    data: input,
    include: taskInclude,
  });
}

// --- Transiciones de estado -------------------------------------------------
// Cada transición usa updateMany con el estado de origen como condición: es
// una guarda atómica contra condiciones de carrera (ej. doble clic) sin
// necesidad de locks explícitos. Si count === 0, alguien más ya cambió el
// estado entre la lectura y la escritura -> 409.

export async function startTask(actor: Actor, id: number) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError('Tarea no encontrada');
  assertCanAccessTask(actor, task.technicianId);

  if (!canTransition(task.status, TaskStatus.EN_PROGRESO)) {
    throw new ConflictError(`No se puede iniciar una tarea en estado ${task.status}`);
  }

  const result = await prisma.task.updateMany({
    where: { id, status: TaskStatus.PENDIENTE },
    data: {
      status: TaskStatus.EN_PROGRESO,
      startedAt: new Date(),
      startedById: actor.id,
    },
  });

  if (result.count === 0) {
    throw new ConflictError('La tarea ya no está en estado PENDIENTE (fue modificada por otra acción)');
  }

  return prisma.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
}

export async function finishTask(actor: Actor, id: number, observations?: string) {
  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError('Tarea no encontrada');
  assertCanAccessTask(actor, task.technicianId);

  if (!canTransition(task.status, TaskStatus.FINALIZADA)) {
    throw new ConflictError(`No se puede finalizar una tarea en estado ${task.status}`);
  }
  if (!task.startedAt) {
    // Guarda defensiva: no debería ocurrir si la máquina de estados es consistente.
    throw new ConflictError('La tarea no tiene hora de inicio registrada');
  }

  const finishedAt = new Date();
  const totalMinutes = Math.max(0, Math.round((finishedAt.getTime() - task.startedAt.getTime()) / 60000));

  const result = await prisma.task.updateMany({
    where: { id, status: TaskStatus.EN_PROGRESO },
    data: {
      status: TaskStatus.FINALIZADA,
      finishedAt,
      finishedById: actor.id,
      totalMinutes,
      ...(observations !== undefined ? { observations } : {}),
    },
  });

  if (result.count === 0) {
    throw new ConflictError('La tarea ya no está en estado EN_PROGRESO (fue modificada por otra acción)');
  }

  return prisma.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
}

export async function cancelTask(actor: Actor, id: number, reason: string) {
  // Cancelar es una decisión de coordinación, no del técnico.
  if (actor.role !== Role.ADMIN) {
    throw new ForbiddenError('Solo un administrador/coordinador puede cancelar tareas');
  }

  const task = await prisma.task.findUnique({ where: { id } });
  if (!task) throw new NotFoundError('Tarea no encontrada');

  if (!canTransition(task.status, TaskStatus.CANCELADA)) {
    throw new ConflictError(`No se puede cancelar una tarea en estado ${task.status}`);
  }

  const result = await prisma.task.updateMany({
    where: { id, status: task.status },
    data: {
      status: TaskStatus.CANCELADA,
      cancelledAt: new Date(),
      cancelledById: actor.id,
      cancelReason: reason,
    },
  });

  if (result.count === 0) {
    throw new ConflictError('La tarea fue modificada por otra acción, intente de nuevo');
  }

  return prisma.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
}
