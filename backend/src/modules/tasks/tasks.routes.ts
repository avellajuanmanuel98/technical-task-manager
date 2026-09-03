import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import * as tasksController from './tasks.controller';

export const tasksRouter = Router();

tasksRouter.use(authenticate);

tasksRouter.get('/', asyncHandler(tasksController.list));
tasksRouter.get('/export', requireRole(Role.ADMIN), asyncHandler(tasksController.exportTasks));
tasksRouter.get('/:id', asyncHandler(tasksController.getById));
tasksRouter.post('/', requireRole(Role.ADMIN), asyncHandler(tasksController.create));
tasksRouter.put('/:id', requireRole(Role.ADMIN), asyncHandler(tasksController.update));
tasksRouter.post('/:id/start', asyncHandler(tasksController.start));
tasksRouter.post('/:id/finish', asyncHandler(tasksController.finish));
tasksRouter.post('/:id/cancel', requireRole(Role.ADMIN), asyncHandler(tasksController.cancel));
