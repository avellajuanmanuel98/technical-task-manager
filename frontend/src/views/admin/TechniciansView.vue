<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as usersApi from '../../api/users'
import { extractErrorMessage } from '../../api/client'
import { useToast } from '../../composables/useToast'
import type { Role, User } from '../../types'
import AppButton from '../../components/ui/AppButton.vue'
import AppField from '../../components/ui/AppField.vue'
import AppModal from '../../components/ui/AppModal.vue'
import ConfirmDialog from '../../components/ui/ConfirmDialog.vue'

const toast = useToast()
const users = ref<User[]>([])
const loading = ref(false)

const showForm = ref(false)
const editing = ref<User | null>(null)
const form = reactive({ name: '', email: '', password: '', role: 'TECNICO' as Role })
const saving = ref(false)
const error = ref('')

const deactivating = ref<User | null>(null)
const deactivateLoading = ref(false)

async function load() {
  loading.value = true
  try {
    users.value = await usersApi.listUsers()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.email = ''
  form.password = ''
  form.role = 'TECNICO'
  error.value = ''
  showForm.value = true
}

function openEdit(u: User) {
  editing.value = u
  form.name = u.name
  form.email = u.email
  form.password = ''
  form.role = u.role
  error.value = ''
  showForm.value = true
}

async function handleSubmit() {
  saving.value = true
  error.value = ''
  try {
    if (editing.value) {
      const payload: Record<string, unknown> = { name: form.name, email: form.email, role: form.role }
      if (form.password) payload.password = form.password
      await usersApi.updateUser(editing.value.id, payload)
      toast.success('Usuario actualizado')
    } else {
      await usersApi.createUser({ ...form })
      toast.success('Usuario creado')
    }
    showForm.value = false
    await load()
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    saving.value = false
  }
}

async function toggleActive(u: User) {
  if (u.active) {
    deactivating.value = u
    return
  }
  try {
    await usersApi.updateUser(u.id, { active: true })
    toast.success('Usuario activado')
    await load()
  } catch (err) {
    toast.error(extractErrorMessage(err))
  }
}

async function confirmDeactivate() {
  if (!deactivating.value) return
  deactivateLoading.value = true
  try {
    await usersApi.updateUser(deactivating.value.id, { active: false })
    toast.success('Usuario desactivado')
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
        <h1 class="text-2xl font-semibold text-[var(--color-text)]">Técnicos y usuarios</h1>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">Gestiona quién puede recibir y atender tareas</p>
      </div>
      <AppButton @click="openCreate">+ Nuevo usuario</AppButton>
    </div>

    <div class="card overflow-hidden">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-[var(--color-border)] bg-gray-50 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
          <tr>
            <th class="px-4 py-3">Nombre</th>
            <th class="px-4 py-3">Correo</th>
            <th class="px-4 py-3">Rol</th>
            <th class="px-4 py-3">Estado</th>
            <th class="px-4 py-3">Acciones</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--color-border)]">
          <tr v-if="loading">
            <td colspan="5" class="px-4 py-8 text-center text-[var(--color-text-muted)]">Cargando…</td>
          </tr>
          <tr v-for="u in users" v-else :key="u.id">
            <td class="px-4 py-3 font-medium text-[var(--color-text)]">{{ u.name }}</td>
            <td class="px-4 py-3 text-[var(--color-text-muted)]">{{ u.email }}</td>
            <td class="px-4 py-3">{{ u.role === 'ADMIN' ? 'Coordinador' : 'Técnico' }}</td>
            <td class="px-4 py-3">
              <span
                class="rounded-full px-2.5 py-1 text-xs font-semibold"
                :class="u.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'"
              >
                {{ u.active ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="px-4 py-3">
              <div class="flex gap-1">
                <button type="button" class="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-brand)] hover:bg-[var(--color-brand)]/10" @click="openEdit(u)">
                  Editar
                </button>
                <button type="button" class="rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] hover:bg-gray-100" @click="toggleActive(u)">
                  {{ u.active ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AppModal v-if="showForm" :title="editing ? 'Editar usuario' : 'Nuevo usuario'" width-class="max-w-md" @close="showForm = false">
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <AppField label="Nombre completo" required>
          <input v-model="form.name" type="text" required class="field-input" />
        </AppField>
        <AppField label="Correo electrónico" required>
          <input v-model="form.email" type="email" required class="field-input" />
        </AppField>
        <AppField label="Rol" required>
          <select v-model="form.role" class="field-input">
            <option value="TECNICO">Técnico</option>
            <option value="ADMIN">Administrador / Coordinador</option>
          </select>
        </AppField>
        <AppField :label="editing ? 'Nueva contraseña (opcional)' : 'Contraseña'" :required="!editing">
          <input v-model="form.password" type="password" :required="!editing" minlength="8" class="field-input" />
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
      title="Desactivar usuario"
      :message="`'${deactivating.name}' no podrá iniciar sesión ni recibir nuevas tareas mientras esté inactivo.`"
      confirm-label="Desactivar"
      variant="danger"
      :loading="deactivateLoading"
      @confirm="confirmDeactivate"
      @cancel="deactivating = null"
    />
  </div>
</template>
