import { Role, TaskSource, TaskStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { parseWorkbook, ImportFileError } from './import.parser';
import type { ConfirmRowInput } from './import.validation';

export { ImportFileError };

type RowStatus = 'valid' | 'duplicate' | 'error';

export interface PreviewRow {
  rowNumber: number;
  externalRef: string | null;
  description: string | null;
  technicianRaw: string | null;
  technicianId: string | null;
  laborRaw: string | null;
  laborTypeId: string | null;
  scheduledDate: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  status: TaskStatus;
  observations: string | null;
  totalMinutes: number | null;
  rowStatus: RowStatus;
  errors: string[];
}

export interface PreviewResult {
  totalRows: number;
  summary: { valid: number; duplicate: number; error: number };
  technicians: { id: string; name: string }[];
  laborTypes: { id: string; name: string }[];
  rows: PreviewRow[];
}

function normalizeText(s: string): string {
  return s.trim().toLowerCase();
}

function duplicateKey(technicianId: string, scheduledDateIso: string, description: string): string {
  return `${technicianId}|${scheduledDateIso.slice(0, 10)}|${normalizeText(description)}`;
}

export async function previewImport(buffer: Buffer): Promise<PreviewResult> {
  const parsedRows = await parseWorkbook(buffer);

  const [technicians, laborTypes] = await Promise.all([
    prisma.user.findMany({ where: { role: Role.TECNICO, active: true }, select: { id: true, name: true, email: true } }),
    prisma.laborType.findMany({ where: { active: true }, select: { id: true, name: true } }),
  ]);

  const technicianByName = new Map(technicians.map((t) => [normalizeText(t.name), t.id]));
  const technicianByEmail = new Map(technicians.map((t) => [normalizeText(t.email), t.id]));
  const laborTypeByName = new Map(laborTypes.map((l) => [normalizeText(l.name), l.id]));

  // Duplicados contra lo ya existente en BD: por externalRef, o por
  // (técnico, fecha, descripción). Se acota la consulta a los técnicos y
  // fechas presentes en el archivo para no traer toda la tabla.
  const technicianIdsInFile = new Set<string>();
  const externalRefsInFile: string[] = [];
  for (const row of parsedRows) {
    const techId = row.technicianRaw ? (technicianByName.get(normalizeText(row.technicianRaw)) ?? technicianByEmail.get(normalizeText(row.technicianRaw))) : undefined;
    if (techId) technicianIdsInFile.add(techId);
    if (row.externalRef) externalRefsInFile.push(row.externalRef);
  }

  const existing = await prisma.task.findMany({
    where: {
      OR: [
        externalRefsInFile.length > 0 ? { externalRef: { in: externalRefsInFile } } : undefined,
        technicianIdsInFile.size > 0 ? { technicianId: { in: [...technicianIdsInFile] } } : undefined,
      ].filter((c): c is NonNullable<typeof c> => c !== undefined),
    },
    select: { technicianId: true, scheduledDate: true, description: true, externalRef: true },
  });

  const existingKeys = new Set(existing.map((t) => duplicateKey(t.technicianId, t.scheduledDate.toISOString(), t.description)));
  const existingRefs = new Set(existing.filter((t) => t.externalRef).map((t) => t.externalRef as string));
  const seenInFile = new Set<string>();

  const rows: PreviewRow[] = parsedRows.map((row) => {
    const errors = [...row.parseErrors];

    const technicianId = row.technicianRaw
      ? (technicianByName.get(normalizeText(row.technicianRaw)) ?? technicianByEmail.get(normalizeText(row.technicianRaw)) ?? null)
      : null;
    if (row.technicianRaw && !technicianId) errors.push(`Técnico "${row.technicianRaw}" no encontrado o inactivo`);

    const laborTypeId = row.laborRaw ? (laborTypeByName.get(normalizeText(row.laborRaw)) ?? null) : null;
    if (row.laborRaw && !laborTypeId) errors.push(`Labor "${row.laborRaw}" no encontrada o inactiva`);

    let totalMinutes: number | null = null;
    if (row.startedAt && row.finishedAt) {
      totalMinutes = Math.max(0, Math.round((Date.parse(row.finishedAt) - Date.parse(row.startedAt)) / 60000));
    }

    let rowStatus: RowStatus = errors.length > 0 ? 'error' : 'valid';

    if (rowStatus === 'valid' && technicianId && row.scheduledDate && row.description) {
      const key = duplicateKey(technicianId, row.scheduledDate, row.description);
      const isDup = (row.externalRef && existingRefs.has(row.externalRef)) || existingKeys.has(key) || seenInFile.has(key);
      if (isDup) {
        rowStatus = 'duplicate';
      } else {
        seenInFile.add(key);
      }
    }

    return {
      rowNumber: row.rowNumber,
      externalRef: row.externalRef,
      description: row.description,
      technicianRaw: row.technicianRaw,
      technicianId,
      laborRaw: row.laborRaw,
      laborTypeId,
      scheduledDate: row.scheduledDate,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      status: row.status,
      observations: row.observations,
      totalMinutes,
      rowStatus,
      errors,
    };
  });

  const summary = {
    valid: rows.filter((r) => r.rowStatus === 'valid').length,
    duplicate: rows.filter((r) => r.rowStatus === 'duplicate').length,
    error: rows.filter((r) => r.rowStatus === 'error').length,
  };

  return { totalRows: rows.length, summary, technicians, laborTypes, rows };
}

export interface ConfirmResult {
  imported: number;
  skippedDuplicates: number;
  errors: { rowNumber: number; message: string }[];
}

export async function confirmImport(actorId: string, rows: ConfirmRowInput[]): Promise<ConfirmResult> {
  const result: ConfirmResult = { imported: 0, skippedDuplicates: 0, errors: [] };

  const [technicians, laborTypes] = await Promise.all([
    prisma.user.findMany({ where: { role: Role.TECNICO, active: true }, select: { id: true } }),
    prisma.laborType.findMany({ where: { active: true }, select: { id: true } }),
  ]);
  const technicianIds = new Set(technicians.map((t) => t.id));
  const laborTypeIds = new Set(laborTypes.map((l) => l.id));

  for (const row of rows) {
    try {
      if (!technicianIds.has(row.technicianId)) {
        result.errors.push({ rowNumber: row.rowNumber, message: 'Técnico no válido o inactivo' });
        continue;
      }
      if (!laborTypeIds.has(row.laborTypeId)) {
        result.errors.push({ rowNumber: row.rowNumber, message: 'Tipo de labor no válido o inactivo' });
        continue;
      }

      const dayStart = new Date(row.scheduledDate.toISOString().slice(0, 10));
      const dayEnd = new Date(dayStart.getTime() + 86400000);

      const dup = await prisma.task.findFirst({
        where: {
          technicianId: row.technicianId,
          scheduledDate: { gte: dayStart, lt: dayEnd },
          description: { equals: row.description, mode: 'insensitive' },
        },
        select: { id: true },
      });
      const dupByRef = row.externalRef ? await prisma.task.findFirst({ where: { externalRef: row.externalRef }, select: { id: true } }) : null;
      if (dup || dupByRef) {
        result.skippedDuplicates += 1;
        continue;
      }

      if (row.status === TaskStatus.FINALIZADA && !(row.startedAt && row.finishedAt)) {
        result.errors.push({ rowNumber: row.rowNumber, message: 'Finalizada requiere hora de inicio y fin' });
        continue;
      }
      if (row.status === TaskStatus.EN_PROGRESO && !row.startedAt) {
        result.errors.push({ rowNumber: row.rowNumber, message: 'En progreso requiere hora de inicio' });
        continue;
      }

      const totalMinutes =
        row.startedAt && row.finishedAt ? Math.max(0, Math.round((row.finishedAt.getTime() - row.startedAt.getTime()) / 60000)) : null;

      await prisma.task.create({
        data: {
          description: row.description,
          technicianId: row.technicianId,
          laborTypeId: row.laborTypeId,
          scheduledDate: row.scheduledDate,
          status: row.status,
          observations: row.observations ?? undefined,
          externalRef: row.externalRef ?? undefined,
          source: TaskSource.IMPORT,
          createdById: actorId,
          startedAt: row.startedAt ?? undefined,
          startedById: row.startedAt ? row.technicianId : undefined,
          finishedAt: row.finishedAt ?? undefined,
          finishedById: row.finishedAt ? row.technicianId : undefined,
          totalMinutes: totalMinutes ?? undefined,
          cancelledAt: row.status === TaskStatus.CANCELADA ? (row.finishedAt ?? row.startedAt ?? row.scheduledDate) : undefined,
          cancelledById: row.status === TaskStatus.CANCELADA ? actorId : undefined,
          cancelReason: row.status === TaskStatus.CANCELADA ? 'Importado desde Excel (histórico)' : undefined,
        },
      });
      result.imported += 1;
    } catch (err) {
      result.errors.push({ rowNumber: row.rowNumber, message: err instanceof Error ? err.message : 'Error desconocido' });
    }
  }

  return result;
}
