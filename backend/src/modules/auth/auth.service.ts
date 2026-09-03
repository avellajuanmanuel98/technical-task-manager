import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { UnauthorizedError } from '../../lib/errors';
import { signToken } from '../../lib/jwt';
import type { LoginInput } from './auth.validation';

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });

  if (!user || !user.active) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError('Credenciales inválidas');
  }

  const token = signToken({ sub: user.id, role: user.role });

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}
