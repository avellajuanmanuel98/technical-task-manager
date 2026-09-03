# Technical Task Manager

Sistema web para registro, seguimiento y control de tareas técnicas (reemplazo del proceso en Excel).

## Estructura

- `/backend` — API REST (Node.js + Express + TypeScript + Prisma + PostgreSQL)
- `/frontend` — SPA (Vue 3 + TypeScript + Vite + Pinia + Vue Router)

## Desarrollo

Ver `backend/README.md` y `frontend/README.md` para instrucciones de cada paquete.

## Puesta en marcha rápida (ambos servicios)

```bash
# Backend
cd backend && npm install && npx prisma migrate dev && npx prisma db seed && npm run dev

# Frontend (otra terminal)
cd frontend && npm install && npm run dev
```

Abrir http://localhost:5173. Usuarios de prueba: ver salida de `prisma db seed`.
