import { Prisma, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { DashboardQuery } from './dashboard.validation';

export async function getDashboardStats(query: DashboardQuery) {
  const where: Prisma.TaskWhereInput = {};
  if (query.dateFrom || query.dateTo) {
    where.scheduledDate = {
      ...(query.dateFrom ? { gte: query.dateFrom } : {}),
      ...(query.dateTo ? { lte: query.dateTo } : {}),
    };
  }

  const [statusGroups, finishedAgg, technicianGroups, laborTypeGroups, dailyRows] = await Promise.all([
    prisma.task.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.task.aggregate({
      where: { ...where, status: TaskStatus.FINALIZADA },
      _avg: { totalMinutes: true },
      _sum: { totalMinutes: true },
    }),
    prisma.task.groupBy({ by: ['technicianId'], where, _count: { _all: true }, _avg: { totalMinutes: true } }),
    prisma.task.groupBy({ by: ['laborTypeId'], where, _count: { _all: true } }),
    // Dataset acotado por el mismo filtro de fecha; se agrega por día en JS
    // (suficiente para el volumen esperado de un dashboard de soporte técnico).
    prisma.task.findMany({ where, select: { scheduledDate: true } }),
  ]);

  const totals = {
    total: statusGroups.reduce((sum, g) => sum + g._count._all, 0),
    pendiente: statusGroups.find((g) => g.status === TaskStatus.PENDIENTE)?._count._all ?? 0,
    enProgreso: statusGroups.find((g) => g.status === TaskStatus.EN_PROGRESO)?._count._all ?? 0,
    finalizada: statusGroups.find((g) => g.status === TaskStatus.FINALIZADA)?._count._all ?? 0,
    cancelada: statusGroups.find((g) => g.status === TaskStatus.CANCELADA)?._count._all ?? 0,
  };

  const [technicians, laborTypes] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: technicianGroups.map((g) => g.technicianId) } },
      select: { id: true, name: true },
    }),
    prisma.laborType.findMany({
      where: { id: { in: laborTypeGroups.map((g) => g.laborTypeId) } },
      select: { id: true, name: true },
    }),
  ]);
  const technicianNameById = new Map(technicians.map((t) => [t.id, t.name]));
  const laborTypeNameById = new Map(laborTypes.map((l) => [l.id, l.name]));

  const byTechnician = technicianGroups
    .map((g) => ({
      technicianId: g.technicianId,
      technicianName: technicianNameById.get(g.technicianId) ?? 'Desconocido',
      count: g._count._all,
      avgMinutes: g._avg.totalMinutes !== null ? Math.round(g._avg.totalMinutes) : null,
    }))
    .sort((a, b) => b.count - a.count);

  const byLaborType = laborTypeGroups
    .map((g) => ({
      laborTypeId: g.laborTypeId,
      laborTypeName: laborTypeNameById.get(g.laborTypeId) ?? 'Desconocido',
      count: g._count._all,
    }))
    .sort((a, b) => b.count - a.count);

  const dayCounts = new Map<string, number>();
  for (const row of dailyRows) {
    const key = row.scheduledDate.toISOString().slice(0, 10);
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1);
  }
  const byDay = [...dayCounts.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));

  return {
    totals,
    avgAttentionMinutes: finishedAgg._avg.totalMinutes !== null ? Math.round(finishedAgg._avg.totalMinutes) : null,
    totalWorkedMinutes: finishedAgg._sum.totalMinutes ?? 0,
    byTechnician,
    byLaborType,
    byDay,
  };
}
