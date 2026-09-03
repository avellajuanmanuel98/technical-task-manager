<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as laborTypesApi from '../../api/laborTypes'
import { extractErrorMessage } from '../../api/client'
import { useToast } from '../../composables/useToast'
import type { LaborType } from '../../types'
import AppButton from '../../components/ui/AppButton.vue'
import AppField from '../../components/ui/AppField.vue'
import AppModal from '../../components/ui/AppModal.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'

const toast = useToast()
const laborTypes = ref<LaborType[]>([])
const loading = ref(false)

const showForm = ref(false)
const editing = ref<LaborType | null>(null)
const form = reactive({ name: '', description: '' })
const saving = ref(false)
const error = ref('')

const deactivating = ref<LaborType | null>(null)
const deactivateLoading = ref(false)

async function load() {
  loading.value = true
  try {
    laborTypes.value = await laborTypesApi.listLaborTypes()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.description = ''
  error.value = ''
  showForm.value = true
}

function openEdit(lt: LaborType) {
  editing.value = lt
  form.name = lt.name
  form.description = lt.description ?? ''
  error.value = ''
  showForm.value = true
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  try {
    if (editing.value) {
      await laborTypesApi.updateLaborType(editing.value.id, { ...form })
      toast.success('Tipo de labor actualizado')
    } else {
      await laborTypesApi.createLaborType({ ...form })
      toast.success('Tipo de labor creado')
    }
    showForm.value = false
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function toggleActive(lt: LaborType) {
  if (lt.active) {
    deactivating.value = lt
    return
  }
  try {
    await laborTypesApi.updateLaborType(lt.id, { active: true })
    toast.success('Tipo de labor activado')
    await load()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  }
}

async function confirmDeactivate() {
  if (!deactivating.value) return
  deactivateLoading.value = true
  try {
    await laborTypesApi.updateLaborType(deactivating.value.id, { active: false })
    toast.success('Tipo de labor desactivado')
    deactivating.value = null
    await load()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    deactivateLoading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold text-[var(--color-text)]">Tipos de labor</h1>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">Catálogo configurable usado al crear tareas</p>
      </div>
      <AppButton @click="openCreate">+ Nuevo tipo</AppButton>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <tr>
            <th class="px-4 py-3">Nombre</th>
            <th class="px-4 py-3">Descripción</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          <tr v-if="loading">
            <td colspan="4" class="px-4 py-8 text-center text-[var(--color-text-muted)]">Cargando…</td>
          </tr>
          <tr v-for="lt in laborTypes" v-else :key="lt.id">
            <td class="px-4 py-3 font-medium text-[var(--color-text)]">{{ lt.name }}</td>
            <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ lt.description || '—' }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="lt.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ lt.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1">
                <button type="button" class="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10" @click="openEdit(lt)">
                  Editar
                </button>
                <button type="button" class="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:bg-gray-100" @click="toggleActive(lt)">
                  {{ lt.active ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal v-if="showForm" :title="editing ? 'Editar tipo de labor' : 'Nuevo tipo de labor'" width-class="max-w-md" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <AppField label="Nombre" required>
          <input v-model="form.name" type="text" required class="field-input" />
        </AppField>
        <AppField label="Descripción">
          <textarea v-model="form.description" rows="2" class="field-input resize-none" />
        </AppField>
        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ error }}</p>
        <div class="flex justify-end gap-2 pt-2">
          <AppButton type="button" variant="secondary" @click="showForm = false">Cancelar</AppButton>
          <AppButton type="submit" :loading="saving">Guardar</AppButton>
        </div>
      </form>
    </AppModal>

    <ConfirmDialog
      v-if="deactivating"
      title="Desactivar tipo de labor"
      :message="`'${deactivating.name}' dejará de estar disponible al crear nuevas tareas. Podrás reactivarlo luego.`"
      confirm-label="Desactivar"
      variant="danger"
      :loading="deactivateLoading"
      @confirm="confirmDeactivate"
      @cancel="deactivating = null"
    />
  </div>
</template>
