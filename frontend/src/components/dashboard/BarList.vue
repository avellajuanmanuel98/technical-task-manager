<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  items: { label: string; value: number; sublabel?: string }[]
  emptyMessage?: string
}>()

const max = computed(() => Math.max(1, ...props.items.map((i) => i.value)))
</script>

<template>
  <div v-if="items.length === 0" class="py-6 text-center text-sm text-[var(--color-text-muted)]">
    {{ emptyMessage ?? 'Sin datos para este período' }}
  </div>
  <ul v-else class="space-y-3">
    <li v-for="item in items" :key="item.label">
      <div class="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span class="truncate font-medium text-[var(--color-text)]">{{ item.label }}</span>
        <span class="shrink-0 text-[var(--color-text-muted)]">
          {{ item.value }}
          <template v-if="item.sublabel"> · {{ item.sublabel }}</template>
        </span>
      </div>
      <div class="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          class="h-full rounded-full bg-[var(--color-brand)] transition-[width]"
          :style="{ width: `${(item.value / max) * 100}%` }"
        />
      </div>
    </li>
  </ul>
</template>
