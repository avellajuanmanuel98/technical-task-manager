import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import * as laborTypesController from './laborTypes.controller';

export const laborTypesRouter = Router();

laborTypesRouter.use(authenticate);

laborTypesRouter.get('/', asyncHandler(laborTypesController.list));
laborTypesRouter.post('/', requireRole(Role.ADMIN), asyncHandler(laborTypesController.create));
laborTypesRouter.put('/:id', requireRole(Role.ADMIN), asyncHandler(laborTypesController.update));
