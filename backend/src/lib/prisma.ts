import { PrismaClient } from '@prisma/client';

// Singleton para evitar agotar conexiones en dev (hot-reload) y en tests.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
