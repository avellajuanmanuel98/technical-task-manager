import express from 'express';
import cors from 'cors';
import { authRouter } from './modules/auth/auth.routes';
import { usersRouter } from './modules/users/users.routes';
import { laborTypesRouter } from './modules/labor-types/laborTypes.routes';
import { tasksRouter } from './modules/tasks/tasks.routes';
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
import { errorHandler } from './middleware/errorHandler';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/labor-types', laborTypesRouter);
  app.use('/api/tasks', tasksRouter);
  app.use('/api/dashboard', dashboardRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
  });

  app.use(errorHandler);

  return app;
}
