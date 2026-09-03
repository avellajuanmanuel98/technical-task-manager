<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import * as importApi from '../../api/import'
import { extractErrorMessage } from '../../api/client'
import { useToast } from '../../composables/useToast'
import { formatDate, formatDuration, formatTime } from '../../utils/datetime'
import type { ImportConfirmResult, ImportPreviewResult, ImportPreviewRow } from '../../types'
import AppButton from '../../components/ui/AppButton.vue'
import StatusBadge from '../../components/ui/StatusBadge.vue'

const toast = useToast()

type Step = 'upload' | 'review' | 'summary'
const step = ref<Step>('upload')
const uploading = ref(false)
const confirming = ref(false)
const dragOver = ref(false)
const uploadError = ref('')

const preview = ref<ImportPreviewResult | null>(null)
const summaryResult = ref<ImportConfirmResult | null>(null)
const selectedFile = ref<File | null>(null)
const defaultDate = ref('')
const needsDefaultDate = ref(false)

// Estado editable por fila: si se incluye en la importación, y correcciones
// manuales de técnico/labor cuando el archivo trae un valor no reconocido.
const rowState = reactive<
  Record<number, { include: boolean; technicianId: string; laborTypeId: string }>
>({})

function resetWizard() {
  step.value = 'upload'
  preview.value = null
  summaryResult.value = null
  uploadError.value = ''
  selectedFile.value = null
  needsDefaultDate.value = false
  Object.keys(rowState).forEach((k) => delete rowState[Number(k)])
}

async function handleFile(file: File) {
  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    toast.error('Solo se admiten archivos .xlsx')
    return
  }
  selectedFile.value = file
  uploading.value = true
  uploadError.value = ''
  try {
    const result = await importApi.previewImport(file, defaultDate.value || undefined)
    needsDefaultDate.value = false
    preview.value = result
    for (const row of result.rows) {
      rowState[row.rowNumber] = {
        include: row.rowStatus === 'valid',
        technicianId: row.technicianId ?? '',
        laborTypeId: row.laborTypeId ?? '',
      }
    }
    step.value = 'review'
  } catch (err) {
    const message = extractErrorMessage(err)
    uploadError.value = message
    needsDefaultDate.value = /columna de fecha/i.test(message)
  } finally {
    uploading.value = false
  }
}

function onFileInput(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) handleFile(file)
}

function retryWithDefaultDate() {
  if (selectedFile.value) handleFile(selectedFile.value)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) handleFile(file)
}

async function handleDownloadTemplate() {
  try {
    const blob = await importApi.downloadTemplate()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla-importacion-tareas.xlsx'
    a.click()
    URL.revokeObjectURL(url)
  } catch (err) {
    toast.error(extractErrorMessage(err))
  }
}

// Una fila error se puede "reparar" en el navegador si lo único que falla es
// que no se pudo emparejar el técnico y/o la labor con el catálogo.
function isCorrectable(row: ImportPreviewRow): boolean {
  const otherErrors = row.errors.filter((e) => !e.includes('no encontrad'))
  return otherErrors.length === 0 && Boolean(row.description && row.scheduledDate)
}

function rowIsReady(row: ImportPreviewRow): boolean {
  const state = rowState[row.rowNumber]
  return Boolean(state?.technicianId && state?.laborTypeId)
}

const includedCount = computed(() =>
  preview.value ? preview.value.rows.filter((r) => rowState[r.rowNumber]?.include && rowIsReady(r)).length : 0,
)

async function handleConfirm() {
  if (!preview.value) return
  const rows = preview.value.rows
    .filter((r) => rowState[r.rowNumber]?.include && rowIsReady(r))
    .map((r) => {
      const state = rowState[r.rowNumber]
      return {
        rowNumber: r.rowNumber,
        description: r.description!,
        technicianId: state.technicianId,
        laborTypeId: state.laborTypeId,
        scheduledDate: r.scheduledDate!,
        startedAt: r.startedAt,
        finishedAt: r.finishedAt,
        status: r.status,
        observations: r.observations,
        externalRef: r.externalRef,
      }
    })

  if (rows.length === 0) {
    toast.error('No hay filas seleccionadas para importar')
    return
  }

  confirming.value = true
  try {
    summaryResult.value = await importApi.confirmImport(rows)
    step.value = 'summary'
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    confirming.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6">
      <h1 class="text-2xl font-semibold text-[var(--color-text)]">Importar desde Excel</h1>
      <p class="mt-1 text-sm text-[var(--color-text-muted)]">
        Sube el histórico de tareas para migrarlo al sistema, sin perder información.
      </p>
    </div>

    <!-- Paso 1: subir archivo -->
    <div v-if="step === 'upload'" class="card p-8">
      <div
        class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors"
        :class="dragOver ? 'border-[var(--color-brand)] bg-[var(--color-brand)]/5' : 'border-[var(--color-border)]'"
        @dragover.prevent="dragOver = true"
        @dragleave.prevent="dragOver = false"
        @drop.prevent="onDrop"
      >
        <p class="mb-1 font-medium text-[var(--color-text)]">Arrastra tu archivo .xlsx aquí</p>
        <p class="mb-4 text-sm text-[var(--color-text-muted)]">o selecciónalo desde tu computador</p>
        <label class="cursor-pointer">
          <span class="inline-flex items-center justify-center rounded-lg bg-[var(--color-brand)] px-4 py-2.5 text-sm font-medium text-white hover:bg-[var(--color-brand-dark)]">
            {{ uploading ? 'Procesando…' : 'Seleccionar archivo' }}
          </span>
          <input type="file" accept=".xlsx" class="hidden" :disabled="uploading" @change="onFileInput" />
        </label>
        <div v-if="uploadError" class="mt-4 w-full max-w-md rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          <p>{{ uploadError }}</p>
          <div v-if="needsDefaultDate" class="mt-3 flex items-center justify-center gap-2">
            <input v-model="defaultDate" type="date" class="field-input bg-white" />
            <AppButton size="sm" :disabled="!defaultDate" :loading="uploading" @click="retryWithDefaultDate">
              Reintentar
            </AppButton>
          </div>
        </div>
      </div>

      <div class="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <label class="mb-2 block font-medium text-[var(--color-text)]">
          Fecha por defecto <span class="font-normal text-[var(--color-text-muted)]">(opcional)</span>
        </label>
        <div class="flex items-center gap-2">
          <input v-model="defaultDate" type="date" class="field-input max-w-[180px]" />
          <p class="text-xs text-[var(--color-text-muted)]">
            Se aplica solo a filas sin fecha propia — útil si tu archivo (como el proceso original) no registra fecha.
          </p>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm">
        <span class="text-[var(--color-text-muted)]">
          ¿No tienes el formato listo? Descarga la plantilla con las columnas esperadas.
        </span>
        <button type="button" class="font-medium text-[var(--color-brand)] hover:underline" @click="handleDownloadTemplate">
          Descargar plantilla
        </button>
      </div>
    </div>

    <!-- Paso 2: revisión / validación -->
    <div v-else-if="step === 'review' && preview">
      <div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Registros encontrados</p>
          <p class="mt-1 text-2xl font-semibold text-[var(--color-text)]">{{ preview.totalRows }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Válidos</p>
          <p class="mt-1 text-2xl font-semibold text-green-600">{{ preview.summary.valid }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Duplicados</p>
          <p class="mt-1 text-2xl font-semibold text-amber-600">{{ preview.summary.duplicate }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Con error</p>
          <p class="mt-1 text-2xl font-semibold text-red-600">{{ preview.summary.error }}</p>
        </div>
      </div>

      <div class="card overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
              <tr>
                <th class="px-3 py-2">Incluir</th>
                <th class="px-3 py-2">Fila</th>
                <th class="px-3 py-2">Descripción</th>
                <th class="px-3 py-2">Técnico</th>
                <th class="px-3 py-2">Labor</th>
                <th class="px-3 py-2">Fecha</th>
                <th class="px-3 py-2">Horas</th>
                <th class="px-3 py-2">Tiempo</th>
                <th class="px-3 py-2">Estado</th>
                <th class="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[var(--color-border)]">
              <tr v-for="row in preview.rows" :key="row.rowNumber" :class="{ 'bg-red-50/40': row.rowStatus === 'error' && !isCorrectable(row) }">
                <td class="px-3 py-2">
                  <input
                    type="checkbox"
                    :disabled="!rowIsReady(row) || (row.rowStatus === 'error' && !isCorrectable(row))"
                    v-model="rowState[row.rowNumber].include"
                  />
                </td>
                <td class="px-3 py-2 text-xs text-[var(--color-text-muted)]">{{ row.rowNumber }}</td>
                <td class="max-w-[200px] truncate px-3 py-2 font-medium text-[var(--color-text)]">{{ row.description ?? '—' }}</td>
                <td class="px-3 py-2">
                  <span v-if="row.technicianId">{{ row.technicianRaw }}</span>
                  <select v-else-if="isCorrectable(row)" v-model="rowState[row.rowNumber].technicianId" class="field-input py-1 text-xs">
                    <option value="" disabled>Corregir…</option>
                    <option v-for="t in preview.technicians" :key="t.id" :value="t.id">{{ t.name }}</option>
                  </select>
                  <span v-else class="text-red-600">{{ row.technicianRaw ?? '—' }}</span>
                </td>
                <td class="px-3 py-2">
                  <span v-if="row.laborTypeId">{{ row.laborRaw }}</span>
                  <select v-else-if="isCorrectable(row)" v-model="rowState[row.rowNumber].laborTypeId" class="field-input py-1 text-xs">
                    <option value="" disabled>Corregir…</option>
                    <option v-for="l in preview.laborTypes" :key="l.id" :value="l.id">{{ l.name }}</option>
                  </select>
                  <span v-else class="text-red-600">{{ row.laborRaw ?? '—' }}</span>
                </td>
                <td class="px-3 py-2">{{ formatDate(row.scheduledDate) }}</td>
                <td class="px-3 py-2 text-xs">{{ formatTime(row.startedAt) }} – {{ formatTime(row.finishedAt) }}</td>
                <td class="px-3 py-2">{{ formatDuration(row.totalMinutes) }}</td>
                <td class="px-3 py-2"><StatusBadge :status="row.status" /></td>
                <td class="px-3 py-2">
                  <span
                    class="rounded-full px-2 py-0.5 text-xs font-semibold"
                    :class="{
                      'bg-green-50 text-green-700': row.rowStatus === 'valid',
                      'bg-amber-50 text-amber-700': row.rowStatus === 'duplicate',
                      'bg-red-50 text-red-700': row.rowStatus === 'error',
                    }"
                  >
                    {{ row.rowStatus === 'valid' ? 'Válido' : row.rowStatus === 'duplicate' ? 'Duplicado' : 'Error' }}
                  </span>
                  <p v-if="row.errors.length" class="mt-1 text-xs text-red-600">{{ row.errors.join('; ') }}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-4 flex items-center justify-between">
        <AppButton variant="secondary" @click="resetWizard">Cancelar</AppButton>
        <div class="flex items-center gap-3">
          <span class="text-sm text-[var(--color-text-muted)]">{{ includedCount }} tarea(s) seleccionadas para importar</span>
          <AppButton :disabled="includedCount === 0" :loading="confirming" @click="handleConfirm">
            Importar {{ includedCount }} tarea(s)
          </AppButton>
        </div>
      </div>
    </div>

    <!-- Paso 3: resumen -->
    <div v-else-if="step === 'summary' && summaryResult" class="card p-8 text-center">
      <div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">✅</div>
      <h2 class="text-lg font-semibold text-[var(--color-text)]">Importación completada</h2>
      <div class="mx-auto mt-6 grid max-w-md grid-cols-3 gap-3">
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Importadas</p>
          <p class="mt-1 text-2xl font-semibold text-green-600">{{ summaryResult.imported }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Omitidas (duplicadas)</p>
          <p class="mt-1 text-2xl font-semibold text-amber-600">{{ summaryResult.skippedDuplicates }}</p>
        </div>
        <div class="card p-4">
          <p class="text-xs font-medium uppercase text-[var(--color-text-muted)]">Con error</p>
          <p class="mt-1 text-2xl font-semibold text-red-600">{{ summaryResult.errors.length }}</p>
        </div>
      </div>
      <ul v-if="summaryResult.errors.length" class="mx-auto mt-4 max-w-md space-y-1 text-left text-sm text-red-700">
        <li v-for="e in summaryResult.errors" :key="e.rowNumber">Fila {{ e.rowNumber }}: {{ e.message }}</li>
      </ul>
      <AppButton class="mt-6" @click="resetWizard">Importar otro archivo</AppButton>
    </div>
  </div>
</template>
