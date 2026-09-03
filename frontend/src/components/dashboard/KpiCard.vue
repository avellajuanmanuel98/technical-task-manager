<script setup lang="ts">
withDefaults(defineProps<{ label: string; value: string; tone?: 'neutral' | 'brand' }>(), { tone: 'neutral' })
</script>

<template>
  <div class="card p-4">
    <p class="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">{{ label }}</p>
    <p class="mt-1.5 text-2xl font-semibold" :class="tone === 'brand' ? 'text-[var(--color-brand)]' : 'text-[var(--color-text)]'">
      {{ value }}
    </p>
  </div>
</template>
