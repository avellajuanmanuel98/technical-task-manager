<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import * as tasksApi from '../../api/tasks'
import { extractErrorMessage } from '../../api/client'
import { useCatalogs } from '../../composables/useCatalogs'
import { toDateInputValue } from '../../utils/datetime'
import type { Task } from '../../types'
import AppButton from '../ui/AppButton.vue'
import AppField from '../ui/AppField.vue'
import AppModal from '../ui/AppModal.vue'

const props = defineProps<{ task?: Task }>()
const emit = defineEmits<{ close: []; saved: [task: Task] }>()

const { technicians, laborTypes, load } = useCatalogs()

const form = reactive({
  description: props.task?.description ?? '',
  technicianId: props.task?.technicianId ?? '',
  laborTypeId: props.task?.laborTypeId ?? '',
  scheduledDate: props.task ? toDateInputValue(props.task.scheduledDate) : toDateInputValue(new Date().toISOString()),
  observations: props.task?.observations ?? '',
})

const loading = ref(false)
const error = ref('')

onMounted(() => load())

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const task = props.task
      ? await tasksApi.updateTask(props.task.id, { ...form })
      : await tasksApi.createTask({ ...form })
    emit('saved', task)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <AppModal :title="task ? `Editar tarea #${task.id}` : 'Nueva tarea'" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="handleSubmit">
      <AppField label="Descripción de la tarea" required>
        <textarea
          v-model="form.description"
          required
          rows="2"
          class="field-input resize-none"
          placeholder="Ej: Computador no enciende"
        />
      </AppField>

      <div class="grid grid-cols-2 gap-4">
        <AppField label="Técnico asignado" required>
          <select v-model="form.technicianId" required class="field-input">
            <option value="" disabled>Seleccionar</option>
            <option v-for="t in technicians" :key="t.id" :value="t.id">{{ t.name }}</option>
          </select>
        </AppField>

        <AppField label="Tipo de labor" required>
          <select v-model="form.laborTypeId" required class="field-input">
            <option value="" disabled>Seleccionar</option>
            <option v-for="lt in laborTypes" :key="lt.id" :value="lt.id">{{ lt.name }}</option>
          </select>
        </AppField>
      </div>

      <AppField label="Fecha programada" required>
        <input v-model="form.scheduledDate" type="date" required class="field-input" />
      </AppField>

      <AppField label="Observaciones (opcional)">
        <textarea v-model="form.observations" rows="2" class="field-input resize-none" />
      </AppField>

      <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ error }}</p>

      <div class="flex justify-end gap-2 pt-2">
        <AppButton type="button" variant="secondary" :disabled="loading" @click="emit('close')">Cancelar</AppButton>
        <AppButton type="submit" :loading="loading">{{ task ? 'Guardar cambios' : 'Crear tarea' }}</AppButton>
      </div>
    </form>
  </AppModal>
</template>
