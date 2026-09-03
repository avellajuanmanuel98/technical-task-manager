import { prisma } from '../../lib/prisma';
import { NotFoundError } from '../../lib/errors';
import type { CreateLaborTypeInput, UpdateLaborTypeInput } from './laborTypes.validation';

export async function listLaborTypes(filters: { active?: boolean } = {}) {
  return prisma.laborType.findMany({
    where: { active: filters.active },
    orderBy: { name: 'asc' },
  });
}

export async function createLaborType(input: CreateLaborTypeInput) {
  return prisma.laborType.create({ data: input });
}

export async function updateLaborType(id: string, input: UpdateLaborTypeInput) {
  const existing = await prisma.laborType.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Tipo de labor no encontrado');
  return prisma.laborType.update({ where: { id }, data: input });
}
