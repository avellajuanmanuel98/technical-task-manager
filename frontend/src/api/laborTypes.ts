import { apiClient } from './client'
import type { LaborType } from '../types'

export function listLaborTypes(filters: { active?: boolean } = {}) {
  return apiClient.get<LaborType[]>('/labor-types', { params: filters }).then((r) => r.data)
}

export interface CreateLaborTypeInput {
  name: string
  description?: string
}

export function createLaborType(input: CreateLaborTypeInput) {
  return apiClient.post<LaborType>('/labor-types', input).then((r) => r.data)
}

export interface UpdateLaborTypeInput {
  name?: string
  description?: string
  active?: boolean
}

export function updateLaborType(id: string, input: UpdateLaborTypeInput) {
  return apiClient.put<LaborType>(`/labor-types/${id}`, input).then((r) => r.data)
}
