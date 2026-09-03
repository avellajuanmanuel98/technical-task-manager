import { execSync } from 'node:child_process';
import path from 'node:path';
import { config } from 'dotenv';

// Se ejecuta una vez antes de toda la suite: aplica las migraciones a la BD
// de test para que el esquema esté al día.
export default function globalSetup() {
  const env = config({ path: path.resolve(__dirname, '../.env.test') }).parsed ?? {};
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}
