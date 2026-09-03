import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Role } from '@prisma/client';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createUser, createLaborType } from './helpers';

const app = createApp();

async function login(email: string, password = 'Password123!') {
  const res = await request(app).post('/api/auth/login').send({ email, password });
  return res.body.token as string;
}

describe('export de tareas', () => {
  let adminToken: string;
  let techToken: string;
  let techAId: string;
  let laborTypeId: string;

  beforeAll(async () => {
    await resetDb();
    await createUser({ email: 'admin@test.com', role: Role.ADMIN });
    const techA = await createUser({ email: 'tecnico.a@test.com', role: Role.TECNICO });
    await createUser({ email: 'tecnico.b@test.com', role: Role.TECNICO });
    const laborType = await createLaborType('Instalación de Apps');
    techAId = techA.id;
    laborTypeId = laborType.id;
    adminToken = await login('admin@test.com');
    techToken = await login('tecnico.a@test.com');

    const techB = await prisma.user.findUniqueOrThrow({ where: { email: 'tecnico.b@test.com' } });

    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Tarea de A', technicianId: techAId, laborTypeId, scheduledDate: '2026-09-01' });
    await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'Tarea de B', technicianId: techB.id, laborTypeId, scheduledDate: '2026-09-01' });
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('un técnico no puede exportar (403)', async () => {
    const res = await request(app).get('/api/tasks/export').set('Authorization', `Bearer ${techToken}`);
    expect(res.status).toBe(403);
  });

  it('exporta en xlsx respetando el filtro de técnico', async () => {
    const res = await request(app)
      .get('/api/tasks/export')
      .query({ technicianId: techAId, format: 'xlsx' })
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (chunk: Buffer) => chunks.push(chunk));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml');
    expect(res.headers['content-disposition']).toContain('.xlsx');
    expect((res.body as Buffer).length).toBeGreaterThan(500);
  });

  it('exporta en csv con encabezados y respeta el filtro de técnico (solo 1 fila de datos)', async () => {
    const res = await request(app)
      .get('/api/tasks/export')
      .query({ technicianId: techAId, format: 'csv' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const text = res.text.replace(/^﻿/, '');
    const lines = text.trim().split('\r\n');
    expect(lines[0]).toContain('Descripción');
    expect(lines.length).toBe(2); // encabezado + 1 tarea (la de técnico A)
    expect(lines[1]).toContain('Tarea de A');
    expect(lines[1]).not.toContain('Tarea de B');
  });

  it('sin filtro exporta todas las tareas visibles para el admin', async () => {
    const res = await request(app).get('/api/tasks/export').query({ format: 'csv' }).set('Authorization', `Bearer ${adminToken}`);
    const lines = res.text.trim().split('\r\n');
    expect(lines.length).toBe(3); // encabezado + 2 tareas
  });
});
