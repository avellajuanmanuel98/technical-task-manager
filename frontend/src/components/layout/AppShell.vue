<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import ToastContainer from '../ui/ToastContainer.vue'

const auth = useAuthStore()
const router = useRouter()

function handleLogout() {
  auth.logout()
  router.push({ name: 'login' })
}

const adminNav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊' },
  { to: '/tasks', label: 'Tareas', icon: '📋' },
  { to: '/admin/technicians', label: 'Técnicos', icon: '👤' },
  { to: '/admin/labor-types', label: 'Tipos de labor', icon: '🏷️' },
]

const tecnicoNav = [{ to: '/my-tasks', label: 'Mis tareas', icon: '✅' }]
</script>

<template>
  <div class="flex h-full min-h-screen">
    <aside class="flex w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-white">
      <div class="flex h-16 items-center gap-2 border-b border-[var(--color-border)] px-5">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-brand)] text-sm font-bold text-white">
          T
        </div>
        <span class="font-semibold text-[var(--color-text)]">TaskManager</span>
      </div>

      <nav class="flex-1 space-y-1 p-3">
        <RouterLink
          v-for="item in auth.isAdmin ? adminNav : tecnicoNav"
          :key="item.to"
          :to="item.to"
          class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--color-text-muted)] transition-colors hover:bg-gray-100 hover:text-[var(--color-text)]"
          active-class="!bg-[var(--color-brand)]/10 !text-[var(--color-brand)]"
        >
          <span>{{ item.icon }}</span>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="border-t border-[var(--color-border)] p-3">
        <div class="mb-2 rounded-lg bg-gray-50 px-3 py-2">
          <p class="truncate text-sm font-medium text-[var(--color-text)]">{{ auth.user?.name }}</p>
          <p class="text-xs text-[var(--color-text-muted)]">
            {{ auth.isAdmin ? 'Coordinador' : 'Técnico' }}
          </p>
        </div>
        <button
          type="button"
          class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:bg-gray-100 hover:text-[var(--color-text)]"
          @click="handleLogout"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>

    <main class="min-w-0 flex-1 overflow-y-auto">
      <div class="mx-auto max-w-7xl min-w-0 p-6 lg:p-8">
        <slot />
      </div>
    </main>

    <ToastContainer />
  </div>
</template>
