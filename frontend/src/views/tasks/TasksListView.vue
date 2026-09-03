<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as tasksApi from '../../api/tasks'
import { extractErrorMessage } from '../../api/client'
import { useCatalogs } from '../../composables/useCatalogs'
import { useToast } from '../../composables/useToast'
import { formatDate, formatDuration, formatTime } from '../../utils/datetime'
import type { Task, TaskFilters, TaskStatus } from '../../types'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'
import TaskFormModal from '../../components/tasks/TaskFormModal.vue'
import CancelTaskDialog from '../../components/tasks/CancelTaskDialog.vue'

const router = useRouter()
const toast = useToast()
const { technicians, laborTypes, load: loadCatalogs } = useCatalogs()

const tasks = ref<Task[]>([])
const meta = ref({ page: 1, pageSize: 20, total: 0, totalPages: 1 })
const loading = ref(false)

const filters = reactive<TaskFilters>({
  search: '',
  technicianId: undefined,
  status: undefined,
  laborTypeId: undefined,
  dateFrom: undefined,
  dateTo: undefined,
  page: 1,
  pageSize: 20,
  sortBy: 'scheduledDate',
  sortDir: 'desc',
})

const statusOptions: { value: TaskStatus; label: string }[] = [
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN_PROGRESO', label: 'En progreso' },
  { value: 'FINALIZADA', label: 'Finalizada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const showCreateModal = ref(false)
const editingTask = ref<Task | null>(null)
const cancellingTask = ref<Task | null>(null)
const cancelLoading = ref(false)

let searchDebounce: ReturnType<typeof setTimeout> | undefined

async function fetchTasks() {
  loading.value = true
  try {
    const result = await tasksApi.listTasks(filters)
    tasks.value = result.data
    meta.value = result.meta
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    filters.page = 1
    fetchTasks()
  }, 350)
}

function onFilterChange() {
  filters.page = 1
  fetchTasks()
}

function toggleSort(column: TaskFilters['sortBy']) {
  if (filters.sortBy === column) {
    filters.sortDir = filters.sortDir === 'asc' ? 'desc' : 'asc'
  } else {
    filters.sortBy = column
    filters.sortDir = 'asc'
  }
  fetchTasks()
}

function goToPage(page: number) {
  if (page < 1 || page > meta.value.totalPages) return
  filters.page = page
  fetchTasks()
}

function openDetail(task: Task) {
  router.push({ name: 'task-detail', params: { id: task.id } })
}

function handleCreated() {
  showCreateModal.value = false
  editingTask.value = null
  toast.success('Tarea creada correctamente')
  fetchTasks()
}

async function confirmCancel(reason: string) {
  if (!cancellingTask.value) return
  cancelLoading.value = true
  try {
    await tasksApi.cancelTask(cancellingTask.value.id, reason)
    toast.success('Tarea cancelada')
    cancellingTask.value = null
    fetchTasks()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    cancelLoading.value = false
  }
}

onMounted(() => {
  loadCatalogs()
  fetchTasks()
})

watch(() => [filters.technicianId, filters.status, filters.laborTypeId, filters.dateFrom, filters.dateTo], onFilterChange)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--color-text)]">Tareas</h1>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">{{ meta.total }} tareas registradas</p>
      </div>
      <AppButton @click="showCreateModal = true">+ Nueva tarea</AppButton>
    </div>

    <!-- Filtros -->
    <div class="card mb-4 grid min-w-0 grid-cols-2 gap-3 p-4 md:grid-cols-3 xl:grid-cols-7">
      <input
        v-model="filters.search"
        type="text"
        placeholder="Buscar por descripción o técnico…"
        class="field-input col-span-2 min-w-0"
        @input="onSearchInput"
      />
      <select v-model="filters.technicianId" class="field-input min-w-0">
        <option :value="undefined">Todos los técnicos</option>
        <option v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</option>
      </select>
      <select v-model="filters.status" class="field-input min-w-0">
        <option :value="undefined">Todos los estados</option>
        <option v-for="s in statusOptions" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <select v-model="filters.laborTypeId" class="field-input min-w-0">
        <option :value="undefined">Todas las labores</option>
        <option v-for="lt in laborTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
      </select>
      <input v-model="filters.dateFrom" type="date" class="field-input min-w-0" title="Desde" />
      <input v-model="filters.dateTo" type="date" class="field-input min-w-0" title="Hasta" />
    </div>

    <!-- Tabla -->
    <div class="card overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <tr>
              <th class="px-4 py-3">ID</th>
              <th class="px-4 py-3">Descripción</th>
              <th class="px-4 py-3">Técnico</th>
              <th class="px-4 py-3">Labor</th>
              <th class="cursor-pointer px-4 py-3 select-none" @click="toggleSort('status')">
                Estado {{ filters.sortBy === 'status' ? (filters.sortDir === 'asc' ? '↑' : '↓') : '' }}
              </th>
              <th class="cursor-pointer px-4 py-3 select-none" @click="toggleSort('scheduledDate')">
                Fecha {{ filters.sortBy === 'scheduledDate' ? (filters.sortDir === 'asc' ? '↑' : '↓') : '' }}
              </th>
              <th class="px-4 py-3">Inicio</th>
              <th class="px-4 py-3">Fin</th>
              <th class="cursor-pointer px-4 py-3 select-none" @click="toggleSort('totalMinutes')">
                Tiempo {{ filters.sortBy === 'totalMinutes' ? (filters.sortDir === 'asc' ? '↑' : '↓') : '' }}
              </th>
              <th class="px-4 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--color-border)]">
            <tr v-if="loading">
              <td colspan="10" class="px-4 py-10 text-center text-[var(--color-text-muted)]">Cargando…</td>
            </tr>
            <tr v-else-if="tasks.length === 0">
              <td colspan="10" class="px-4 py-10 text-center text-[var(--color-text-muted)]">No hay tareas con estos filtros</td>
            </tr>
            <tr
              v-for="task in tasks"
              v-else
              :key="task.id"
              class="cursor-pointer hover:bg-gray-50"
              @click="openDetail(task)"
            >
              <td class="px-4 py-3 font-mono text-xs text-[var(--color-text-muted)]">TASK-{{ String(task.id).padStart(4, '0') }}</td>
              <td class="max-w-xs truncate px-4 py-3 font-medium text-[var(--color-text)]">{{ task.description }}</td>
              <td class="px-4 py-3">{{ task.technician.name }}</td>
              <td class="px-4 py-3">{{ task.laborType.name }}</td>
              <td class="px-4 py-3"><StatusBadge :status="task.status" /></td>
              <td class="px-4 py-3">{{ formatDate(task.scheduledDate) }}</td>
              <td class="px-4 py-3">{{ formatTime(task.startedAt) }}</td>
              <td class="px-4 py-3">{{ formatTime(task.finishedAt) }}</td>
              <td class="px-4 py-3">{{ formatDuration(task.totalMinutes) }}</td>
              <td class="px-4 py-3" @click.stop>
                <div class="flex gap-1">
                  <button
                    v-if="task.status === 'PENDIENTE'"
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10"
                    @click="editingTask = task"
                  >
                    Editar
                  </button>
                  <button
                    v-if="task.status === 'PENDIENTE' || task.status === 'EN_PROGRESO'"
                    type="button"
                    class="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    @click="cancellingTask = task"
                  >
                    Cancelar
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Paginación -->
      <div class="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-text-muted)]">
        <span>Página {{ meta.page }} de {{ meta.totalPages }}</span>
        <div class="flex gap-2">
          <AppButton size="sm" variant="secondary" :disabled="meta.page <= 1" @click="goToPage(meta.page - 1)">Anterior</AppButton>
          <AppButton size="sm" variant="secondary" :disabled="meta.page >= meta.totalPages" @click="goToPage(meta.page + 1)">Siguiente</AppButton>
        </div>
      </div>
    </div>

    <TaskFormModal v-if="showCreateModal" @close="showCreateModal = false" @saved="handleCreated" />
    <TaskFormModal v-if="editingTask" :task="editingTask" @close="editingTask = null" @saved="handleCreated" />
    <CancelTaskDialog
      v-if="cancellingTask"
      :loading="cancelLoading"
      @close="cancellingTask = null"
      @confirm="confirmCancel"
    />
  </div>
</template>
