# Backend — Technical Task Manager API

Node.js + Express + TypeScript + Prisma + PostgreSQL.

## Setup

```bash
npm install
cp .env.example .env   # ajustar DATABASE_URL / JWT_SECRET
npx prisma migrate dev
npx prisma db seed
npm run dev
```

Usuarios de prueba (creados por el seed): ver salida del comando `db seed`.

## Scripts

- `npm run dev` — servidor de desarrollo (tsx watch)
- `npm run build` / `npm start` — build y ejecución de producción
- `npm test` — suite de pruebas (vitest, requiere BD de test en `.env.test`)
- `npm run prisma:migrate` — nueva migración
