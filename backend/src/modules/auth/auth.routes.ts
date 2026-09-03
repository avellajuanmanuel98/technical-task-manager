import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { asyncHandler } from '../../lib/asyncHandler';
import * as authController from './auth.controller';

export const authRouter = Router();

authRouter.post('/login', asyncHandler(authController.login));
authRouter.get('/me', authenticate, asyncHandler(authController.me));
