<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { extractErrorMessage } from '../api/client'
import AppButton from '../components/ui/AppButton.vue'
import AppField from '../components/ui/AppField.vue'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const email = ref('')
const password = ref('')
const loading = ref(false)
const error = ref('')

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || (auth.isAdmin ? '/dashboard' : '/my-tasks')
    router.push(redirect)
  } catch (err) {
    error.value = extractErrorMessage(err)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4">
    <div class="w-full max-w-sm">
      <div class="mb-8 text-center">
        <div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-brand)] text-lg font-bold text-white">
          T
        </div>
        <h1 class="text-xl font-semibold text-[var(--color-text)]">Technical Task Manager</h1>
        <p class="mt-1 text-sm text-[var(--color-text-muted)]">Ingresa con tu cuenta para continuar</p>
      </div>

      <form class="card space-y-4 p-6" @submit.prevent="handleSubmit">
        <AppField label="Correo electrónico" required>
          <input v-model="email" type="email" required autocomplete="username" class="field-input" placeholder="tucorreo@empresa.com" />
        </AppField>
        <AppField label="Contraseña" required>
          <input v-model="password" type="password" required autocomplete="current-password" class="field-input" placeholder="••••••••" />
        </AppField>

        <p v-if="error" class="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{{ error }}</p>

        <AppButton type="submit" class="w-full" :loading="loading">Iniciar sesión</AppButton>
      </form>
    </div>
  </div>
</template>
