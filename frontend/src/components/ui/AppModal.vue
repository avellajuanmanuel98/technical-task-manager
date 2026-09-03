<script setup lang="ts">
withDefaults(defineProps<{ title: string; widthClass?: string }>(), { widthClass: 'max-w-lg' })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" @click.self="emit('close')">
      <div class="card w-full p-6" :class="widthClass" role="dialog" aria-modal="true">
        <div class="mb-4 flex items-start justify-between">
          <h2 class="text-lg font-semibold text-[var(--color-text)]">{{ title }}</h2>
          <button
            type="button"
            class="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
            @click="emit('close')"
          >
            ✕
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
