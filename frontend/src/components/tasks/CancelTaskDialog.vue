<script setup lang="ts">
import { ref } from 'vue'
import AppButton from '../ui/AppButton.vue'
import AppField from '../ui/AppField.vue'
import AppModal from '../ui/AppModal.vue'

defineProps<{ loading?: boolean }>()
const emit = defineEmits<{ confirm: [reason: string]; close: [] }>()

const reason = ref('')
</script>

<template>
  <AppModal title="Cancelar tarea" width-class="max-w-sm" @close="emit('close')">
    <p class="mb-3 text-sm text-[var(--color-text-muted)]">
      Esta acción es definitiva. Indica el motivo de la cancelación.
    </p>
    <AppField label="Motivo" required>
      <textarea v-model="reason" rows="3" class="field-input resize-none" placeholder="Ej: Cliente canceló el servicio" />
    </AppField>
    <div class="mt-6 flex justify-end gap-2">
      <AppButton variant="secondary" :disabled="loading" @click="emit('close')">Volver</AppButton>
      <AppButton variant="danger" :disabled="reason.trim().length < 3" :loading="loading" @click="emit('confirm', reason.trim())">
        Cancelar tarea
      </AppButton>
    </div>
  </AppModal>
</template>
