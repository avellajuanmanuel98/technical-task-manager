import axios from 'axios'
import type { ApiError } from '../types'

export const apiClient = axios.create({
  baseURL: '/api',
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ttm_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401 && window.location.pathname !== '/login') {
      localStorage.removeItem('ttm_token')
      localStorage.removeItem('ttm_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Extrae un mensaje legible del error de la API para mostrar en la UI.
export function extractErrorMessage(err: unknown): string {
  if (axios.isAxiosError<ApiError>(err)) {
    return err.response?.data?.error?.message ?? 'Ocurrió un error inesperado'
  }
  return 'Ocurrió un error inesperado'
}
