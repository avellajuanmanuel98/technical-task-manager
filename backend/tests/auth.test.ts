import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { resetDb, createUser } from './helpers';
import { Role } from '@prisma/client';

const app = createApp();

describe('auth', () => {
  beforeAll(async () => {
    await resetDb();
    await createUser({ email: 'admin@test.com', role: Role.ADMIN, password: 'Admin123!' });
    await createUser({ email: 'inactivo@test.com', role: Role.TECNICO, password: 'Pass123!', active: false });
  });

  afterAll(async () => {
    await resetDb();
    await prisma.$disconnect();
  });

  it('rechaza login con credenciales inválidas', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'incorrecta' });
    expect(res.status).toBe(401);
  });

  it('rechaza login de usuario inactivo', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'inactivo@test.com', password: 'Pass123!' });
    expect(res.status).toBe(401);
  });

  it('permite login con credenciales válidas y devuelve token', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.role).toBe('ADMIN');
  });

  it('rechaza acceso a rutas protegidas sin token', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('rechaza token inválido', async () => {
    const res = await request(app).get('/api/tasks').set('Authorization', 'Bearer token-invalido');
    expect(res.status).toBe(401);
  });

  it('/me devuelve el usuario autenticado', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.com', password: 'Admin123!' });
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@test.com');
  });
});
