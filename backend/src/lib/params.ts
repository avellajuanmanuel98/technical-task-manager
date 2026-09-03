import type { Request } from 'express';

// Los tipos de Express 5 permiten params[]; en nuestras rutas siempre son
// segmentos simples, así que normalizamos a string.
export function paramValue(req: Request, name: string): string {
  const value = req.params[name];
  return Array.isArray(value) ? value[0] : value;
}
