import type { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { loginSchema } from './auth.validation';
import * as authService from './auth.service';

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const result = await authService.login(input);
  res.json(result);
}

export async function me(req: Request, res: Response) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: req.user!.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  res.json(user);
}
