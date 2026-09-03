import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '../api/auth'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('ttm_token'))
  const user = ref<User | null>(JSON.parse(localStorage.getItem('ttm_user') ?? 'null'))

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isTecnico = computed(() => user.value?.role === 'TECNICO')

  async function login(email: string, password: string) {
    const res = await authApi.login(email, password)
    token.value = res.token
    user.value = res.user
    localStorage.setItem('ttm_token', res.token)
    localStorage.setItem('ttm_user', JSON.stringify(res.user))
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('ttm_token')
    localStorage.removeItem('ttm_user')
  }

  return { token, user, isAuthenticated, isAdmin, isTecnico, login, logout }
})
