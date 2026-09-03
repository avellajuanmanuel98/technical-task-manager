import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createUser, createLaborType } from './helpers';

const app = createApp();

async function login(email: string, password = 'Password123!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token as string;
}

type SheetRow = (string | undefined)[];

async function buildWorkbookBuffer(headers: string[], rows: SheetRow[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tareas');
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const HEADERS = ['ID de tarea', 'Descripción', 'Técnico', 'Labor', 'Fecha', 'Hora inicio', 'Hora fin', 'Estado', 'Observaciones'];

describe('import de Excel', () => {
  let adminToken: string;
  let techToken: string;

  beforeAll(async () => {
    await resetDb();
    await createUser({ email: 'admin@test.com', role: Role.ADMIN });
    await createUser({ email: 'david@test.com', role: Role.TECNICO });
    await prisma.user.update({ where: { email: 'david@test.com' }, data: { name: 'David Yesid Martinez' } });
    await createLaborType('Configuración de equipo');
    adminToken = await login('admin@test.com');
    techToken = await login('david@test.com');
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('un técnico no puede acceder a la importación (403)', async () => {
    const res = await request(app).get('/api/import/template').set('Authorization', `Bearer ${techToken}`);
    expect(res.status).toBe(403);
  });

  it('rechaza un archivo sin las columnas requeridas', async () => {
    const buffer = await buildWorkbookBuffer(['Descripción'], [['solo descripción']]);
    const res = await request(app)
      .post('/api/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'malo.xlsx');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/columnas requeridas/i);
  });

  it('valida, calcula tiempo con zona horaria, detecta cruce de medianoche y duplicados', async () => {
    const buffer = await buildWorkbookBuffer(HEADERS, [
      ['T-1', 'Computador no enciende', 'David Yesid Martinez', 'Configuración de equipo', '2026-09-03', '10:06 AM', '10:20 AM', '', ''],
      ['T-1-DUP', 'Computador no enciende', 'David Yesid Martinez', 'Configuración de equipo', '2026-09-03', '10:06 AM', '10:20 AM', '', ''],
      ['T-2', '', 'David Yesid Martinez', 'Configuración de equipo', '2026-09-03', '', '', '', ''],
      ['T-3', 'Tarea técnico desconocido', 'Nadie Existe', 'Configuración de equipo', '2026-09-03', '', '', '', ''],
      ['T-4', 'Cruza medianoche', 'David Yesid Martinez', 'Configuración de equipo', '2026-09-03', '23:50', '00:10', '', ''],
      ['T-5', 'Pendiente sin horas', 'David Yesid Martinez', 'Configuración de equipo', '2026-09-05', '', '', '', ''],
    ]);

    const res = await request(app)
      .post('/api/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'tareas.xlsx');

    expect(res.status).toBe(200);
    expect(res.body.totalRows).toBe(6);
    expect(res.body.summary).toEqual({ valid: 3, duplicate: 1, error: 2 });

    const byRef = (ref: string) => res.body.rows.find((r: { externalRef: string }) => r.externalRef === ref);

    const t1 = byRef('T-1');
    expect(t1.rowStatus).toBe('valid');
    expect(t1.status).toBe('FINALIZADA');
    expect(t1.totalMinutes).toBe(14);
    // 10:06 AM hora local (UTC-5 por defecto) -> 15:06 UTC
    expect(t1.startedAt).toBe('2026-09-03T15:06:00.000Z');

    expect(byRef('T-1-DUP').rowStatus).toBe('duplicate');
    expect(byRef('T-2').rowStatus).toBe('error'); // descripción vacía
    expect(byRef('T-3').rowStatus).toBe('error'); // técnico no encontrado

    const t4 = byRef('T-4');
    expect(t4.rowStatus).toBe('valid');
    expect(t4.totalMinutes).toBe(20);

    const t5 = byRef('T-5');
    expect(t5.status).toBe('PENDIENTE');
  });

  it('confirma la importación, evita duplicados en un segundo intento y respeta permisos', async () => {
    const buffer = await buildWorkbookBuffer(HEADERS, [
      ['C-1', 'Instalación de antivirus', 'David Yesid Martinez', 'Configuración de equipo', '2026-09-04', '', '', 'Pendiente', ''],
    ]);
    const previewRes = await request(app)
      .post('/api/import/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', buffer, 'tareas2.xlsx');

    const validRows = previewRes.body.rows.filter((r: { rowStatus: string }) => r.rowStatus === 'valid');
    expect(validRows.length).toBe(1);

    const confirmBody = {
      rows: validRows.map((r: Record<string, unknown>) => ({
        rowNumber: r.rowNumber,
        description: r.description,
        technicianId: r.technicianId,
        laborTypeId: r.laborTypeId,
        scheduledDate: r.scheduledDate,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        status: r.status,
        observations: r.observations,
        externalRef: r.externalRef,
      })),
    };

    const forbidden = await request(app).post('/api/import/confirm').set('Authorization', `Bearer ${techToken}`).send(confirmBody);
    expect(forbidden.status).toBe(403);

    const confirmRes = await request(app).post('/api/import/confirm').set('Authorization', `Bearer ${adminToken}`).send(confirmBody);
    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body).toEqual({ imported: 1, skippedDuplicates: 0, errors: [] });

    const created = await prisma.task.findFirst({ where: { externalRef: 'C-1' } });
    expect(created?.source).toBe('IMPORT');
    expect(created?.status).toBe('PENDIENTE');

    // Reimportar el mismo archivo: debe detectarse como duplicado, no crear otra tarea.
    const secondConfirm = await request(app).post('/api/import/confirm').set('Authorization', `Bearer ${adminToken}`).send(confirmBody);
    expect(secondConfirm.body).toEqual({ imported: 0, skippedDuplicates: 1, errors: [] });
  });

  it('descarga la plantilla de ejemplo', async () => {
    const res = await request(app).get('/api/import/template').set('Authorization', `Bearer ${adminToken}`).buffer(true).parse((r, cb) => {
      const chunks: Buffer[] = [];
      r.on('data', (chunk: Buffer) => chunks.push(chunk));
      r.on('end', () => cb(null, Buffer.concat(chunks)));
    });
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect((res.body as Buffer).length).toBeGreaterThan(1000);
  });
});
