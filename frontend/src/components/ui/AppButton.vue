<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
    size?: 'sm' | 'md'
    type?: 'button' | 'submit'
    disabled?: boolean
    loading?: boolean
  }>(),
  { variant: 'primary', size: 'md', type: 'button', disabled: false, loading: false },
)
</script>

<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    class="inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    :class="[
      size === 'sm' ? 'px-3 py-1.5 text-sm' : 'px-4 py-2.5 text-sm',
      variant === 'primary' && 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-dark)] focus-visible:ring-[var(--color-brand)]',
      variant === 'secondary' && 'border border-[var(--color-border)] bg-white text-[var(--color-text)] hover:bg-gray-50 focus-visible:ring-gray-400',
      variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
      variant === 'ghost' && 'text-[var(--color-text-muted)] hover:bg-gray-100 hover:text-[var(--color-text)] focus-visible:ring-gray-300',
    ]"
  >
    <svg
      v-if="loading"
      class="h-4 w-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
    <slot />
  </button>
</template>
