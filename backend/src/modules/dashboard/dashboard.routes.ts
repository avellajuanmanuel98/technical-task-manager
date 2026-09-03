import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import * as dashboardController from './dashboard.controller';

export const dashboardRouter = Router();

// Solo el coordinador/administrador ve estadísticas agregadas.
dashboardRouter.use(authenticate, requireRole(Role.ADMIN));

dashboardRouter.get('/stats', asyncHandler(dashboardController.getStats));
