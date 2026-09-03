<script setup lang="ts">
import { useToast } from '../../composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div class="pointer-events-none fixed right-4 top-4 z-[60] flex w-80 flex-col gap-2">
      <TransitionGroup name="toast">
        <div
          v-for="t in toasts"
          :key="t.id"
          class="pointer-events-auto rounded-lg border px-4 py-3 text-sm font-medium shadow-lg"
          :class="{
            'border-green-200 bg-green-50 text-green-800': t.variant === 'success',
            'border-red-200 bg-red-50 text-red-800': t.variant === 'error',
            'border-blue-200 bg-blue-50 text-blue-800': t.variant === 'info',
          }"
        >
          {{ t.message }}
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.2s ease;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(20px);
}
.toast-leave-to {
  opacity: 0;
}
</style>
