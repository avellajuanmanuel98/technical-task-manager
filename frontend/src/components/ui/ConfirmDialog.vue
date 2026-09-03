<script setup lang="ts">
import AppButton from './AppButton.vue'
import AppModal from './AppModal.vue'

withDefaults(
  defineProps<{
    title: string
    message: string
    confirmLabel?: string
    variant?: 'primary' | 'danger'
    loading?: boolean
  }>(),
  { confirmLabel: 'Confirmar', variant: 'primary', loading: false },
)

const emit = defineEmits<{ confirm: []; cancel: [] }>()
</script>

<template>
  <AppModal :title="title" width-class="max-w-sm" @close="emit('cancel')">
    <p class="text-sm text-[var(--color-text-muted)]">{{ message }}</p>
    <div class="mt-6 flex justify-end gap-2">
      <AppButton variant="secondary" :disabled="loading" @click="emit('cancel')">Cancelar</AppButton>
      <AppButton :variant="variant" :loading="loading" @click="emit('confirm')">{{ confirmLabel }}</AppButton>
    </div>
  </AppModal>
</template>
