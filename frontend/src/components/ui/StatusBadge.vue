<script setup lang="ts">
import { computed } from 'vue'
import type { TaskStatus } from '../../types'

const props = defineProps<{ status: TaskStatus }>()

const config: Record<TaskStatus, { label: string; bg: string; text: string; dot: string }> = {
  PENDIENTE: {
    label: 'Pendiente',
    bg: 'var(--color-status-pendiente-bg)',
    text: 'var(--color-status-pendiente-text)',
    dot: '#a1a1aa',
  },
  EN_PROGRESO: {
    label: 'En progreso',
    bg: 'var(--color-status-en-progreso-bg)',
    text: 'var(--color-status-en-progreso-text)',
    dot: '#2563eb',
  },
  FINALIZADA: {
    label: 'Finalizada',
    bg: 'var(--color-status-finalizada-bg)',
    text: 'var(--color-status-finalizada-text)',
    dot: '#16a34a',
  },
  CANCELADA: {
    label: 'Cancelada',
    bg: 'var(--color-status-cancelada-bg)',
    text: 'var(--color-status-cancelada-text)',
    dot: '#dc2626',
  },
}

const c = computed(() => config[props.status])
</script>

<template>
  <span
    class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
    :style="{ background: c.bg, color: c.text }"
  >
    <span class="h-1.5 w-1.5 rounded-full" :style="{ background: c.dot }" />
    {{ c.label }}
  </span>
</template>
