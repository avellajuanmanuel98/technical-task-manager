import ExcelJS from 'exceljs';
import type { Prisma } from '@prisma/client';

type ExportableTask = Prisma.TaskGetPayload<{
  include: {
    technician: { select: { id: true; name: true; email: true } };
    laborType: { select: { id: true; name: true } };
    startedBy: { select: { id: true; name: true } };
    finishedBy: { select: { id: true; name: true } };
    cancelledBy: { select: { id: true; name: true } };
    createdBy: { select: { id: true; name: true } };
  };
}>;

const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  EN_PROGRESO: 'En progreso',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

function formatMinutes(minutes: number | null): string {
  if (minutes === null) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

// yyyy-mm-dd / hh:mm en horario local del negocio (misma conversión que el
// resto del sistema usa para mostrar al usuario, nunca UTC crudo).
function localDateStr(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(0, 10);
}
function localTimeStr(date: Date | null): string {
  if (!date) return '';
  return date.toISOString().slice(11, 16);
}

const COLUMNS = [
  { header: 'ID', key: 'id', width: 12 },
  { header: 'Descripción', key: 'description', width: 40 },
  { header: 'Técnico', key: 'technician', width: 24 },
  { header: 'Labor', key: 'labor', width: 24 },
  { header: 'Estado', key: 'status', width: 14 },
  { header: 'Fecha', key: 'date', width: 12 },
  { header: 'Hora inicio', key: 'startTime', width: 12 },
  { header: 'Hora fin', key: 'endTime', width: 12 },
  { header: 'Tiempo total', key: 'totalTime', width: 14 },
  { header: 'Observaciones', key: 'observations', width: 30 },
  { header: 'Motivo cancelación', key: 'cancelReason', width: 30 },
];

function toRow(task: ExportableTask): Record<string, string> {
  return {
    id: `TASK-${String(task.id).padStart(4, '0')}`,
    description: task.description,
    technician: task.technician.name,
    labor: task.laborType.name,
    status: STATUS_LABELS[task.status] ?? task.status,
    date: localDateStr(task.scheduledDate),
    startTime: localTimeStr(task.startedAt),
    endTime: localTimeStr(task.finishedAt),
    totalTime: formatMinutes(task.totalMinutes),
    observations: task.observations ?? '',
    cancelReason: task.cancelReason ?? '',
  };
}

export async function buildTasksXlsx(tasks: ExportableTask[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tareas');
  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true };
  for (const task of tasks) sheet.addRow(toRow(task));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildTasksCsv(tasks: ExportableTask[]): string {
  const header = COLUMNS.map((c) => csvEscape(c.header)).join(',');
  const lines = tasks.map((task) => {
    const row = toRow(task);
    return COLUMNS.map((c) => csvEscape(row[c.key] ?? '')).join(',');
  });
  // BOM al inicio: para que Excel abra el CSV con acentos correctamente.
  return '﻿' + [header, ...lines].join('\r\n');
}
