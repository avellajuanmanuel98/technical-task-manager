import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
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

describe('tasks flow', () => {
  let adminToken: string;
  let techAToken: string;
  let techBToken: string;
  let techAId: string;
  let laborTypeId: string;

  beforeAll(async () => {
    await resetDb();
    await createUser({ email: 'admin@test.com', role: Role.ADMIN });
    const techA = await createUser({ email: 'tecnico.a@test.com', role: Role.TECNICO });
    await createUser({ email: 'tecnico.b@test.com', role: Role.TECNICO });
    const laborType = await createLaborType();

    techAId = techA.id;
    laborTypeId = laborType.id;
    adminToken = await login('admin@test.com');
    techAToken = await login('tecnico.a@test.com');
    techBToken = await login('tecnico.b@test.com');
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function createTask() {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        description: 'Computador no enciende',
        technicianId: techAId,
        laborTypeId,
        scheduledDate: '2026-09-03',
      });
    expect(res.status).toBe(201);
    return res.body.id as number;
  }

  it('un técnico no puede crear tareas (403)', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${techAToken}`)
      .send({ description: 'x', technicianId: techAId, laborTypeId, scheduledDate: '2026-09-03' });
    expect(res.status).toBe(403);
  });

  it('el admin puede crear y asignar una tarea en estado PENDIENTE', async () => {
    const taskId = await createTask();
    const res = await request(app).get(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.body.status).toBe('PENDIENTE');
    expect(res.body.startedAt).toBeNull();
  });

  it('un técnico no puede ver ni iniciar la tarea de otro técnico', async () => {
    const taskId = await createTask();
    const getRes = await request(app).get(`/api/tasks/${taskId}`).set('Authorization', `Bearer ${techBToken}`);
    expect(getRes.status).toBe(403);

    const startRes = await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techBToken}`);
    expect(startRes.status).toBe(403);
  });

  it('no permite finalizar una tarea pendiente', async () => {
    const taskId = await createTask();
    const res = await request(app).post(`/api/tasks/${taskId}/finish`).set('Authorization', `Bearer ${techAToken}`);
    expect(res.status).toBe(409);
  });

  it('no permite iniciar dos veces (condición de carrera / doble clic)', async () => {
    const taskId = await createTask();
    const first = await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techAToken}`);
    expect(first.status).toBe(200);
    const second = await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techAToken}`);
    expect(second.status).toBe(409);
  });

  it('inicia y finaliza correctamente calculando el tiempo total en backend (14 minutos)', async () => {
    const taskId = await createTask();

    vi.useFakeTimers();
    const start = new Date('2026-09-03T10:06:00.000-05:00');
    vi.setSystemTime(start);

    const startRes = await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techAToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.status).toBe('EN_PROGRESO');
    expect(startRes.body.startedBy.name).toBe('tecnico.a');

    const finish = new Date('2026-09-03T10:20:00.000-05:00'); // +14 min
    vi.setSystemTime(finish);

    const finishRes = await request(app)
      .post(`/api/tasks/${taskId}/finish`)
      .set('Authorization', `Bearer ${techAToken}`)
      .send({ observations: 'Se reemplazó fuente de poder' });

    expect(finishRes.status).toBe(200);
    expect(finishRes.body.status).toBe('FINALIZADA');
    expect(finishRes.body.totalMinutes).toBe(14);
    expect(finishRes.body.observations).toBe('Se reemplazó fuente de poder');
  });

  it('calcula correctamente el tiempo cuando la tarea cruza la medianoche', async () => {
    const taskId = await createTask();

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T23:50:00.000Z'));
    await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techAToken}`);

    vi.setSystemTime(new Date('2026-09-04T00:10:00.000Z')); // +20 min, cruza medianoche
    const finishRes = await request(app).post(`/api/tasks/${taskId}/finish`).set('Authorization', `Bearer ${techAToken}`);

    expect(finishRes.body.totalMinutes).toBe(20);
  });

  it('ignora un total_minutes enviado desde el cliente (backend es la fuente de verdad)', async () => {
    const taskId = await createTask();
    await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techAToken}`);

    const res = await request(app)
      .post(`/api/tasks/${taskId}/finish`)
      .set('Authorization', `Bearer ${techAToken}`)
      .send({ totalMinutes: 99999, status: 'CANCELADA' });

    expect(res.status).toBe(200);
    expect(res.body.totalMinutes).not.toBe(99999);
    expect(res.body.status).toBe('FINALIZADA');
  });

  it('solo un admin/coordinador puede cancelar una tarea', async () => {
    const taskId = await createTask();
    const forbidden = await request(app)
      .post(`/api/tasks/${taskId}/cancel`)
      .set('Authorization', `Bearer ${techAToken}`)
      .send({ reason: 'no aplica' });
    expect(forbidden.status).toBe(403);

    const ok = await request(app)
      .post(`/api/tasks/${taskId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Cliente canceló el servicio' });
    expect(ok.status).toBe(200);
    expect(ok.body.status).toBe('CANCELADA');
  });

  it('no permite iniciar ni finalizar una tarea cancelada', async () => {
    const taskId = await createTask();
    const cancelRes = await request(app)
      .post(`/api/tasks/${taskId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Cliente canceló el servicio' });
    expect(cancelRes.status).toBe(200);

    const startRes = await request(app).post(`/api/tasks/${taskId}/start`).set('Authorization', `Bearer ${techAToken}`);
    expect(startRes.status).toBe(409);
  });

  it('un técnico solo ve sus propias tareas en el listado', async () => {
    await createTask();
    const res = await request(app).get('/api/tasks').set('Authorization', `Bearer ${techBToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((t: { technicianId: string }) => t.technicianId !== techAId)).toBe(true);
  });
});
