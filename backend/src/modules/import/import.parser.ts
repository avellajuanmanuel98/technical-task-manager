import ExcelJS from 'exceljs';
import { TaskStatus } from '@prisma/client';
import { env } from '../../config/env';
import { ValidationError } from '../../lib/errors';

// Error de archivo (columnas faltantes, formato ilegible): se muestra
// directamente al coordinador antes de intentar nada, por eso es un
// ValidationError (400), no un error interno.
export class ImportFileError extends ValidationError {}

export interface ParsedRow {
  rowNumber: number;
  externalRef: string | null;
  description: string | null;
  technicianRaw: string | null;
  laborRaw: string | null;
  // ISO (yyyy-mm-dd), en UTC medianoche del día indicado.
  scheduledDate: string | null;
  // ISO datetime completo en UTC, ya convertido desde la hora local del negocio.
  startedAt: string | null;
  finishedAt: string | null;
  status: TaskStatus;
  observations: string | null;
  parseErrors: string[];
}

const HEADER_ALIASES: Record<string, string[]> = {
  externalRef: ['id de tarea', 'id', 'id original', 'ticket', 'codigo'],
  description: ['descripcion', 'tarea', 'detalle'],
  technicianRaw: ['tecnico', 'asignado a', 'responsable'],
  laborRaw: ['labor', 'tipo de labor', 'categoria'],
  dateRaw: ['fecha', 'fecha programada'],
  startTimeRaw: ['hora inicio', 'hora de inicio', 'inicio'],
  endTimeRaw: ['hora fin', 'hora de fin', 'fin', 'hora finalizacion', 'hora de finalizacion'],
  statusRaw: ['estado'],
  observations: ['observaciones', 'notas', 'comentarios'],
};

// Técnico y Labor son estructuralmente indispensables. Descripción y Fecha
// se resuelven de forma más flexible (ver parseWorkbook): un archivo del
// proceso original (columna única "ID DE TAREA: descripción", sin columna
// de Fecha) debe poder importarse sin obligar a reformatear el Excel.
const HARD_REQUIRED_FIELDS = ['technicianRaw', 'laborRaw'] as const;

const STATUS_ALIASES: Record<string, TaskStatus> = {
  pendiente: TaskStatus.PENDIENTE,
  'en progreso': TaskStatus.EN_PROGRESO,
  finalizada: TaskStatus.FINALIZADA,
  finalizado: TaskStatus.FINALIZADA,
  cancelada: TaskStatus.CANCELADA,
  cancelado: TaskStatus.CANCELADA,
};

function normalize(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos (rango de diacríticos combinados)
    .trim()
    .toLowerCase();
}

function cellToString(value: ExcelJS.CellValue): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && 'text' in (value as object)) {
    // rich text
    return String((value as { text: string }).text).trim() || null;
  }
  if (value instanceof Date) return null; // se maneja aparte
  const s = String(value).trim();
  return s === '' ? null : s;
}

function cellToDateOnly(value: ExcelJS.CellValue): { y: number; m: number; d: number } | null {
  if (value instanceof Date) {
    return { y: value.getUTCFullYear(), m: value.getUTCMonth(), d: value.getUTCDate() };
  }
  const s = cellToString(value);
  if (!s) return null;
  let m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) return { y: +m[1], m: +m[2] - 1, d: +m[3] };
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (m) return { y: +m[3], m: +m[2] - 1, d: +m[1] };
  return null;
}

function cellToTimeOfDay(value: ExcelJS.CellValue): { h: number; min: number } | null {
  if (value instanceof Date) {
    return { h: value.getUTCHours(), min: value.getUTCMinutes() };
  }
  const s = cellToString(value);
  if (!s) return null;
  const m = s.trim().toUpperCase().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ampm = m[3];
  if (ampm === 'PM' && h < 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;
  return { h, min };
}

// Convierte una fecha+hora "naive" (tal como aparece en el Excel, en la hora
// local del negocio) a un instante UTC real, usando el offset configurado.
function localToUtcIso(y: number, m: number, d: number, h = 0, min = 0): string {
  const naiveUtcMs = Date.UTC(y, m, d, h, min);
  const trueUtcMs = naiveUtcMs - env.IMPORT_TZ_OFFSET_MINUTES * 60000;
  return new Date(trueUtcMs).toISOString();
}

export interface ParseOptions {
  // Fecha (yyyy-mm-dd) a aplicar en filas sin columna/valor de fecha propio.
  // Necesario para archivos del proceso original, que no registran fecha.
  defaultDate?: string;
}

export async function parseWorkbook(buffer: Buffer, options: ParseOptions = {}): Promise<ParsedRow[]> {
  const workbook = new ExcelJS.Workbook();
  try {
    // Cast puntual: @types/node hizo `Buffer` genérico y los tipos de exceljs
    // aún esperan el `Buffer` clásico; en runtime son el mismo objeto.
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  } catch {
    throw new ImportFileError('No se pudo leer el archivo. Verifica que sea un .xlsx válido');
  }

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 1) {
    throw new ImportFileError('El archivo no contiene datos');
  }

  const columnIndex: Partial<Record<keyof typeof HEADER_ALIASES, number>> = {};
  sheet.getRow(1).eachCell((cell, colNumber) => {
    const norm = normalize(cell.value);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (columnIndex[field as keyof typeof HEADER_ALIASES] === undefined && aliases.includes(norm)) {
        columnIndex[field as keyof typeof HEADER_ALIASES] = colNumber;
      }
    }
  });

  const missing = HARD_REQUIRED_FIELDS.filter((f) => columnIndex[f] === undefined);
  if (missing.length > 0) {
    throw new ImportFileError(`No se encontraron las columnas de Técnico y/o Labor. Faltan: ${missing.join(', ')}`);
  }
  if (columnIndex.description === undefined && columnIndex.externalRef === undefined) {
    throw new ImportFileError(
      'No se encontró una columna de Descripción ni de "ID de tarea" (se necesita al menos una de las dos)',
    );
  }

  const defaultDateParts = options.defaultDate ? cellToDateOnly(options.defaultDate) : null;
  if (columnIndex.dateRaw === undefined && !defaultDateParts) {
    throw new ImportFileError(
      'El archivo no tiene columna de Fecha. Indica una fecha por defecto en el asistente para poder importarlo',
    );
  }

  // Solo se deriva la descripción desde "ID de tarea" cuando el archivo no
  // trae una columna de Descripción propia. Si la columna existe pero una
  // celda puntual viene vacía, es un dato faltante real, no un formato
  // distinto — debe marcarse como error, no inventarse un valor.
  const hasDescriptionColumn = columnIndex.description !== undefined;

  const rows: ParsedRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    const cell = (field: keyof typeof HEADER_ALIASES) => {
      const idx = columnIndex[field];
      return idx ? row.getCell(idx).value : null;
    };

    let description = cellToString(cell('description'));
    const technicianRaw = cellToString(cell('technicianRaw'));
    const laborRaw = cellToString(cell('laborRaw'));
    let externalRef = cellToString(cell('externalRef'));
    const observations = cellToString(cell('observations'));
    const statusRawCell = cellToString(cell('statusRaw'));

    // Fila completamente vacía (Excel a veces deja filas en blanco al final): se ignora.
    if (!description && !technicianRaw && !laborRaw && !externalRef) return;

    // Formato original: una sola columna "ID DE TAREA" con valores como
    // "Tarea #4859: Computador no enciende". Si no hay columna de
    // Descripción propia, se separa por el primer ":" — antes queda como
    // referencia externa, después como descripción.
    if (!hasDescriptionColumn && !description && externalRef) {
      const sep = externalRef.indexOf(':');
      if (sep !== -1 && externalRef.slice(sep + 1).trim()) {
        description = externalRef.slice(sep + 1).trim();
        externalRef = externalRef.slice(0, sep).trim() || null;
      } else {
        description = externalRef;
        externalRef = null;
      }
    }

    const parseErrors: string[] = [];

    const dateParts = cellToDateOnly(cell('dateRaw')) ?? defaultDateParts;
    const startParts = cellToTimeOfDay(cell('startTimeRaw'));
    const endParts = cellToTimeOfDay(cell('endTimeRaw'));

    if (!description) parseErrors.push('Descripción vacía');
    if (!technicianRaw) parseErrors.push('Técnico vacío');
    if (!laborRaw) parseErrors.push('Labor vacía');
    if (!dateParts) parseErrors.push('Fecha inválida o vacía');

    const endCellValue = cell('endTimeRaw');
    if (endCellValue !== null && endCellValue !== undefined && endCellValue !== '' && !endParts) {
      parseErrors.push('Hora fin con formato inválido');
    }
    const startCellValue = cell('startTimeRaw');
    if (startCellValue !== null && startCellValue !== undefined && startCellValue !== '' && !startParts) {
      parseErrors.push('Hora inicio con formato inválido');
    }
    if (endParts && !startParts) parseErrors.push('Hay hora de fin sin hora de inicio');

    let scheduledDate: string | null = null;
    let startedAt: string | null = null;
    let finishedAt: string | null = null;

    if (dateParts) {
      scheduledDate = localToUtcIso(dateParts.y, dateParts.m, dateParts.d);

      if (startParts) {
        startedAt = localToUtcIso(dateParts.y, dateParts.m, dateParts.d, startParts.h, startParts.min);
      }
      if (startParts && endParts) {
        let endMs = Date.parse(localToUtcIso(dateParts.y, dateParts.m, dateParts.d, endParts.h, endParts.min));
        const startMs = Date.parse(startedAt!);
        // Si la hora de fin es anterior a la de inicio, asumimos que la tarea cruzó medianoche.
        if (endMs <= startMs) endMs += 24 * 60 * 60 * 1000;
        finishedAt = new Date(endMs).toISOString();
      }
    }

    let status: TaskStatus;
    if (statusRawCell) {
      const mapped = STATUS_ALIASES[normalize(statusRawCell)];
      if (!mapped) {
        parseErrors.push(`Estado '${statusRawCell}' no reconocido`);
        status = TaskStatus.PENDIENTE;
      } else {
        status = mapped;
        if (mapped === TaskStatus.FINALIZADA && !(startedAt && finishedAt)) {
          parseErrors.push('Estado Finalizada requiere hora de inicio y de fin');
        }
        if (mapped === TaskStatus.EN_PROGRESO && !startedAt) {
          parseErrors.push('Estado En progreso requiere hora de inicio');
        }
      }
    } else {
      status = startedAt && finishedAt ? TaskStatus.FINALIZADA : startedAt ? TaskStatus.EN_PROGRESO : TaskStatus.PENDIENTE;
    }

    rows.push({
      rowNumber,
      externalRef,
      description,
      technicianRaw,
      laborRaw,
      scheduledDate,
      startedAt,
      finishedAt,
      status,
      observations,
      parseErrors,
    });
  });

  return rows;
}
