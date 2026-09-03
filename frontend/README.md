# Frontend — Technical Task Manager

Vue 3 + TypeScript + Vite + Pinia + Vue Router + Tailwind CSS 4.

## Setup

```bash
npm install
npm run dev
```

El dev server proxea `/api` hacia `http://localhost:3000` (ver `vite.config.ts`), así que el backend debe estar corriendo en paralelo.

## Estructura

- `src/api/` — cliente HTTP tipado por módulo (auth, tasks, users, laborTypes)
- `src/stores/` — estado global (Pinia): sesión/autenticación
- `src/composables/` — lógica reutilizable (catálogos, toasts)
- `src/components/ui/` — componentes base (botón, modal, badge de estado, confirmación)
- `src/components/tasks/` — componentes específicos de tareas (formulario, cancelación)
- `src/views/` — vistas por rol: `tasks/` (coordinador), `admin/` (catálogos)
- `src/router/` — rutas con guardas de autenticación y rol

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` — type-check (`vue-tsc`) + build de producción
- `npm run preview` — sirve el build de producción localmente
