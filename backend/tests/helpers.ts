import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../src/lib/prisma';

export async function resetDb() {
  await prisma.task.deleteMany();
  await prisma.laborType.deleteMany();
  await prisma.user.deleteMany();
}

export async function createUser(opts: { email: string; role: Role; password?: string; active?: boolean }) {
  const passwordHash = await bcrypt.hash(opts.password ?? 'Password123!', 4);
  return prisma.user.create({
    data: {
      name: opts.email.split('@')[0],
      email: opts.email,
      passwordHash,
      role: opts.role,
      active: opts.active ?? true,
    },
  });
}

export async function createLaborType(name = 'Tarea básica') {
  return prisma.laborType.create({ data: { name } });
}
