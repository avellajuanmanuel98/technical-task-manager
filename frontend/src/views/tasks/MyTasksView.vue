<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as tasksApi from '../../api/tasks'
import { extractErrorMessage } from '../../api/client'
import { useToast } from '../../composables/useToast'
import { formatDate, formatDuration, formatTime } from '../../utils/datetime'
import type { Task, TaskStatus } from '../../types'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

const router = useRouter()
const toast = useToast()

const tasks = ref<Task[]>([])
const loading = ref(false)
const actingTaskId = ref<number | null>(null)

const statusFilter = ref<TaskStatus | 'ACTIVAS'>('ACTIVAS')

async function fetchTasks() {
  loading.value = true
  try {
    const result = await tasksApi.listTasks({ pageSize: 100, sortBy: 'scheduledDate', sortDir: 'asc' })
    tasks.value = result.data
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

const visibleTasks = computed(() => {
  if (statusFilter.value === 'ACTIVAS') {
    return tasks.value.filter((t) => t.status === 'PENDIENTE' || t.status === 'EN_PROGRESO')
  }
  return tasks.value.filter((t) => t.status === statusFilter.value)
})

async function handleStart(task: Task) {
  actingTaskId.value = task.id
  try {
    await tasksApi.startTask(task.id)
    toast.success(`Tarea #${task.id} iniciada`)
    await fetchTasks()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    actingTaskId.value = null
  }
}

async function handleFinish(task: Task) {
  actingTaskId.value = task.id
  try {
    const updated = await tasksApi.finishTask(task.id)
    toast.success(`Tarea #${task.id} finalizada — tiempo total: ${formatDuration(updated.totalMinutes)}`)
    await fetchTasks()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    actingTaskId.value = null
  }
}

function openDetail(task: Task) {
  router.push({ name: 'task-detail', params: { id: task.id } })
}

onMounted(fetchTasks)
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-[var(--color-text)]">Mis tareas</h1>
      <p class="mt-1 text-sm text-[var(--color-text-muted)]">Inicia y finaliza tus tareas asignadas</p>
    </div>

    <div class="mb-4 flex gap-2">
      <button
        v-for="opt in [
          { value: 'ACTIVAS', label: 'Activas' },
          { value: 'FINALIZADA', label: 'Finalizadas' },
          { value: 'CANCELADA', label: 'Canceladas' },
        ]"
        :key="opt.value"
        type="button"
        class="rounded-full px-4 py-1.5 text-sm font-medium transition-colors"
        :class="statusFilter === opt.value ? 'bg-[var(--color-brand)] text-white' : 'bg-white text-[var(--color-text-muted)] hover:bg-gray-100'"
        @click="statusFilter = opt.value as TaskStatus | 'ACTIVAS'"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="loading" class="py-10 text-center text-[var(--color-text-muted)]">Cargando…</div>
    <div v-else-if="visibleTasks.length === 0" class="card py-12 text-center text-[var(--color-text-muted)]">
      No tienes tareas en esta categoría
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <div v-for="task in visibleTasks" :key="task.id" class="card flex flex-col p-5">
        <div class="mb-3 flex items-start justify-between gap-2">
          <span class="font-mono text-xs text-[var(--color-text-muted)]">TASK-{{ String(task.id).padStart(4, '0') }}</span>
          <StatusBadge :status="task.status" />
        </div>

        <p class="mb-2 line-clamp-2 flex-1 font-medium text-[var(--color-text)]">{{ task.description }}</p>
        <p class="mb-4 text-xs text-[var(--color-text-muted)]">{{ task.laborType.name }} · {{ formatDate(task.scheduledDate) }}</p>

        <div v-if="task.status === 'EN_PROGRESO'" class="mb-4 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
          Iniciada a las {{ formatTime(task.startedAt) }}
        </div>
        <div v-else-if="task.status === 'FINALIZADA'" class="mb-4 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
          Tiempo total: {{ formatDuration(task.totalMinutes) }}
        </div>

        <div class="flex gap-2">
          <AppButton
            v-if="task.status === 'PENDIENTE'"
            class="flex-1"
            :loading="actingTaskId === task.id"
            @click="handleStart(task)"
          >
            Iniciar tarea
          </AppButton>
          <AppButton
            v-if="task.status === 'EN_PROGRESO'"
            class="flex-1"
            variant="primary"
            :loading="actingTaskId === task.id"
            @click="handleFinish(task)"
          >
            Finalizar tarea
          </AppButton>
          <AppButton variant="secondary" @click="openDetail(task)">Ver detalle</AppButton>
        </div>
      </div>
    </div>
  </div>
</template>
