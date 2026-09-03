import { reactive } from 'vue'

export interface Toast {
  id: number
  message: string
  variant: 'success' | 'error' | 'info'
}

let nextId = 1
const toasts = reactive<Toast[]>([])

function push(message: string, variant: Toast['variant'] = 'info') {
  const id = nextId++
  toasts.push({ id, message, variant })
  setTimeout(() => {
    const idx = toasts.findIndex((t) => t.id === id)
    if (idx !== -1) toasts.splice(idx, 1)
  }, 4000)
}

export function useToast() {
  return {
    toasts,
    success: (message: string) => push(message, 'success'),
    error: (message: string) => push(message, 'error'),
    info: (message: string) => push(message, 'info'),
  }
}
