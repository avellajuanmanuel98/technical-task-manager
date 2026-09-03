import path from 'node:path';
import { config } from 'dotenv';

// Se ejecuta antes de cada archivo de test: fuerza el uso de la BD de test.
config({ path: path.resolve(__dirname, '../.env.test'), override: true });
