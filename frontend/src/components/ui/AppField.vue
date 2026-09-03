<script setup lang="ts">
withDefaults(defineProps<{ label: string; error?: string; required?: boolean }>(), { required: false })
</script>

<template>
  <label class="block">
    <span class="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
      {{ label }}
      <span v-if="required" class="text-red-500">*</span>
    </span>
    <slot />
    <span v-if="error" class="mt-1 block text-xs font-medium text-red-600">{{ error }}</span>
  </label>
</template>
