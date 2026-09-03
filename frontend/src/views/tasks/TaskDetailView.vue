<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import * as tasksApi from '../../api/tasks'
import { extractErrorMessage } from '../../api/client'
import { useAuthStore } from '../../stores/auth'
import { useToast } from '../../composables/useToast'
import { formatDateTime, formatDuration } from '../../utils/datetime'
import type { Task } from '../../types'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import CancelTaskDialog from '../../components/tasks/CancelTaskDialog.vue'
import TaskFormModal from '../../components/tasks/TaskFormModal.vue'

const props = defineProps<{ id: number }>()
const router = useRouter()
const auth = useAuthStore()
const toast = useToast()

const task = ref<Task | null>(null)
const loading = ref(true)
const notFound = ref(false)
const acting = ref(false)
const showEdit = ref(false)
const showCancel = ref(false)

async function load() {
  loading.value = true
  notFound.value = false
  try {
    task.value = await tasksApi.getTask(props.id)
  } catch (err) {
    notFound.value = true
    toast.error(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

const canManage = computed(() => task.value && (auth.isAdmin || auth.user?.id === task.value.technicianId))

interface TimelineEvent {
  label: string
  actor: string
  at: string
  tone: 'neutral' | 'info' | 'success' | 'danger'
  detail?: string | null
}

const timeline = computed<TimelineEvent[]>(() => {
  if (!task.value) return []
  const t = task.value
  const events: TimelineEvent[] = [
    { label: 'Tarea creada', actor: t.createdBy.name, at: t.createdAt, tone: 'neutral' },
  ]
  if (t.startedAt && t.startedBy) {
    events.push({ label: 'Tarea iniciada', actor: t.startedBy.name, at: t.startedAt, tone: 'info' })
  }
  if (t.finishedAt && t.finishedBy) {
    events.push({ label: 'Tarea finalizada', actor: t.finishedBy.name, at: t.finishedAt, tone: 'success' })
  }
  if (t.cancelledAt && t.cancelledBy) {
    events.push({ label: 'Tarea cancelada', actor: t.cancelledBy.name, at: t.cancelledAt, tone: 'danger', detail: t.cancelReason })
  }
  return events
})

async function handleStart() {
  if (!task.value) return
  acting.value = true
  try {
    task.value = await tasksApi.startTask(task.value.id)
    toast.success('Tarea iniciada')
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

async function handleFinish() {
  if (!task.value) return
  acting.value = true
  try {
    task.value = await tasksApi.finishTask(task.value.id)
    toast.success(`Tarea finalizada — tiempo total: ${formatDuration(task.value.totalMinutes)}`)
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

async function handleCancelConfirm(reason: string) {
  if (!task.value) return
  acting.value = true
  try {
    task.value = await tasksApi.cancelTask(task.value.id, reason)
    toast.success('Tarea cancelada')
    showCancel.value = false
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    acting.value = false
  }
}

function handleSaved(updated: Task) {
  task.value = updated
  showEdit.value = false
  toast.success('Tarea actualizada')
}

onMounted(load)
</script>

<template>
  <div>
    <button type="button" class="mb-4 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)]" @click="router.back()">
      ← Volver
    </button>

    <div v-if="loading" class="py-10 text-center text-[var(--color-text-muted)]">Cargando…</div>
    <div v-else-if="notFound || !task" class="card py-12 text-center text-[var(--color-text-muted)]">Tarea no encontrada</div>

    <div v-else class="grid gap-6 lg:grid-cols-3">
      <div class="space-y-6 lg:col-span-2">
        <div class="card p-6">
          <div class="mb-4 flex items-start justify-between gap-3">
            <div>
              <span class="font-mono text-xs text-[var(--color-text-muted)]">TASK-{{ String(task.id).padStart(4, '0') }}</span>
              <h1 class="mt-1 text-xl font-semibold text-[var(--color-text)]">{{ task.description }}</h1>
            </div>
            <StatusBadge :status="task.status" />
          </div>

          <dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt class="text-[var(--color-text-muted)]">Técnico</dt>
              <dd class="font-medium text-[var(--color-text)]">{{ task.technician.name }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-text-muted)]">Labor</dt>
              <dd class="font-medium text-[var(--color-text)]">{{ task.laborType.name }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-text-muted)]">Tiempo total</dt>
              <dd class="font-medium text-[var(--color-text)]">{{ formatDuration(task.totalMinutes) }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-text-muted)]">Inicio</dt>
              <dd class="font-medium text-[var(--color-text)]">{{ formatDateTime(task.startedAt) }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-text-muted)]">Fin</dt>
              <dd class="font-medium text-[var(--color-text)]">{{ formatDateTime(task.finishedAt) }}</dd>
            </div>
            <div>
              <dt class="text-[var(--color-text-muted)]">Calificación</dt>
              <dd class="font-medium text-[var(--color-text-muted)]">Próximamente</dd>
            </div>
          </dl>

          <div v-if="task.observations" class="mt-5 border-t border-[var(--color-border)] pt-4">
            <p class="mb-1 text-sm text-[var(--color-text-muted)]">Observaciones</p>
            <p class="text-sm text-[var(--color-text)]">{{ task.observations }}</p>
          </div>
        </div>

        <div class="card p-6">
          <h2 class="mb-4 text-sm font-semibold text-[var(--color-text)]">Historial de la tarea</h2>
          <ol class="space-y-4">
            <li v-for="(event, idx) in timeline" :key="idx" class="flex gap-3">
              <div class="flex flex-col items-center">
                <span
                  class="h-2.5 w-2.5 rounded-full"
                  :class="{
                    'bg-gray-400': event.tone === 'neutral',
                    'bg-blue-600': event.tone === 'info',
                    'bg-green-600': event.tone === 'success',
                    'bg-red-600': event.tone === 'danger',
                  }"
                />
                <span v-if="idx < timeline.length - 1" class="mt-1 w-px flex-1 bg-[var(--color-border)]" />
              </div>
              <div class="pb-4">
                <p class="text-sm font-medium text-[var(--color-text)]">{{ event.label }}</p>
                <p class="text-xs text-[var(--color-text-muted)]">{{ event.actor }} · {{ formatDateTime(event.at) }}</p>
                <p v-if="event.detail" class="mt-1 text-xs text-[var(--color-text)]">"{{ event.detail }}"</p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <div class="space-y-4">
        <div class="card p-5">
          <h2 class="mb-3 text-sm font-semibold text-[var(--color-text)]">Acciones</h2>
          <div class="flex flex-col gap-2">
            <AppButton v-if="canManage && task.status === 'PENDIENTE'" :loading="acting" @click="handleStart">
              Iniciar tarea
            </AppButton>
            <AppButton v-if="canManage && task.status === 'EN_PROGRESO'" :loading="acting" @click="handleFinish">
              Finalizar tarea
            </AppButton>
            <AppButton v-if="auth.isAdmin && task.status === 'PENDIENTE'" variant="secondary" @click="showEdit = true">
              Editar tarea
            </AppButton>
            <AppButton
              v-if="auth.isAdmin && (task.status === 'PENDIENTE' || task.status === 'EN_PROGRESO')"
              variant="danger"
              @click="showCancel = true"
            >
              Cancelar tarea
            </AppButton>
            <p v-if="task.status === 'FINALIZADA' || task.status === 'CANCELADA'" class="text-center text-xs text-[var(--color-text-muted)]">
              Esta tarea no admite más acciones
            </p>
          </div>
        </div>
      </div>
    </div>

    <TaskFormModal v-if="showEdit && task" :task="task" @close="showEdit = false" @saved="handleSaved" />
    <CancelTaskDialog v-if="showCancel" :loading="acting" @close="showCancel = false" @confirm="handleCancelConfirm" />
  </div>
</template>
