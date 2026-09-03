import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const LABOR_TYPES = [
  'Configuración de equipo',
  'Accesos y autenticación',
  'Configuración y revisión de equipos',
  'Instalación de Apps',
  'Incidentes de software',
  'Configuración de cámaras',
  'Tarea básica',
];

async function main() {
  await Promise.all(
    LABOR_TYPES.map((name) =>
      prisma.laborType.upsert({ where: { name }, update: {}, create: { name } }),
    ),
  );

  const adminPasswordHash = await bcrypt.hash('Admin123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@empresa.com' },
    update: {},
    create: {
      name: 'Coordinador General',
      email: 'admin@empresa.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const tecnicoPasswordHash = await bcrypt.hash('Tecnico123!', 10);
  await prisma.user.upsert({
    where: { email: 'david.martinez@empresa.com' },
    update: {},
    create: {
      name: 'David Yesid Martinez',
      email: 'david.martinez@empresa.com',
      passwordHash: tecnicoPasswordHash,
      role: Role.TECNICO,
    },
  });

  console.log('Seed completado. Usuarios de prueba:');
  console.log('  admin@empresa.com / Admin123!');
  console.log('  david.martinez@empresa.com / Tecnico123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
