import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
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

describe('dashboard stats', () => {
  let adminToken: string;
  let techToken: string;
  let techId: string;
  let laborTypeId: string;

  beforeAll(async () => {
    await resetDb();
    await createUser({ email: 'admin@test.com', role: Role.ADMIN });
    const tech = await createUser({ email: 'tecnico@test.com', role: Role.TECNICO });
    const laborType = await createLaborType('Instalación de Apps');
    techId = tech.id;
    laborTypeId = laborType.id;
    adminToken = await login('admin@test.com');
    techToken = await login('tecnico@test.com');

    // Tarea 1: finalizada, 10 minutos exactos
    const create = async () =>
      (
        await request(app)
          .post('/api/tasks')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ description: 'Tarea de prueba dashboard', technicianId: techId, laborTypeId, scheduledDate: '2026-09-03' })
      ).body.id as number;

    const t1 = await create();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T10:00:00.000Z'));
    await request(app).post(`/api/tasks/${t1}/start`).set('Authorization', `Bearer ${techToken}`);
    vi.setSystemTime(new Date('2026-09-03T10:10:00.000Z'));
    await request(app).post(`/api/tasks/${t1}/finish`).set('Authorization', `Bearer ${techToken}`);
    vi.useRealTimers();

    // Tarea 2: pendiente
    await create();
    // Tarea 3: cancelada
    const t3 = await create();
    await request(app).post(`/api/tasks/${t3}/cancel`).set('Authorization', `Bearer ${adminToken}`).send({ reason: 'no aplica' });
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('un técnico no puede acceder al dashboard (403)', async () => {
    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${techToken}`);
    expect(res.status).toBe(403);
  });

  it('calcula totales por estado y tiempo correctamente', async () => {
    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totals).toEqual({ total: 3, pendiente: 1, enProgreso: 0, finalizada: 1, cancelada: 1 });
    expect(res.body.avgAttentionMinutes).toBe(10);
    expect(res.body.totalWorkedMinutes).toBe(10);
  });

  it('agrupa por técnico y por tipo de labor', async () => {
    const res = await request(app).get('/api/dashboard/stats').set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.byTechnician).toEqual([{ technicianId: techId, technicianName: 'tecnico', count: 3, avgMinutes: 10 }]);
    expect(res.body.byLaborType).toEqual([{ laborTypeId, laborTypeName: 'Instalación de Apps', count: 3 }]);
  });

  it('respeta el filtro de rango de fechas', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .query({ dateFrom: '2026-09-04', dateTo: '2026-09-05' })
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.totals.total).toBe(0);
  });
});
