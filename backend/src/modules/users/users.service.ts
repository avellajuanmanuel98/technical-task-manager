import bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { CreateUserInput, UpdateUserInput } from './users.validation';

const SALT_ROUNDS = 10;

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(filters: { role?: 'ADMIN' | 'TECNICO'; active?: boolean }) {
  return prisma.user.findMany({
    where: { role: filters.role, active: filters.active },
    select: userSelect,
    orderBy: { name: 'asc' },
  });
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) throw new NotFoundError('Usuario no encontrado');
  return user;
}

export async function createUser(input: CreateUserInput) {
  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  return prisma.user.create({
    data: { name: input.name, email: input.email, role: input.role, passwordHash },
    select: userSelect,
  });
}

export async function updateUser(id: string, input: UpdateUserInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Usuario no encontrado');

  const passwordHash = input.password ? await bcrypt.hash(input.password, SALT_ROUNDS) : undefined;

  return prisma.user.update({
    where: { id },
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      active: input.active,
      ...(passwordHash ? { passwordHash } : {}),
    },
    select: userSelect,
  });
}
