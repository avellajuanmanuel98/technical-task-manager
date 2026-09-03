import { Router } from 'express';
import { Role } from '@prisma/client';
import { authenticate, requireRole } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import * as usersController from './users.controller';

export const usersRouter = Router();

// Gestión de usuarios/técnicos: exclusivo de administradores/coordinadores.
usersRouter.use(authenticate, requireRole(Role.ADMIN));

usersRouter.get('/', asyncHandler(usersController.list));
usersRouter.get('/:id', asyncHandler(usersController.getById));
usersRouter.post('/', asyncHandler(usersController.create));
usersRouter.put('/:id', asyncHandler(usersController.update));
