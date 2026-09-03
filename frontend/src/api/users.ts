import { apiClient } from './client'
import type { Role, User } from '../types'

export function listUsers(filters: { role?: Role; active?: boolean } = {}) {
  return apiClient.get<User[]>('/users', { params: filters }).then((r) => r.data)
}

export interface CreateUserInput {
  name: string
  email: string
  password: string
  role: Role
}

export function createUser(input: CreateUserInput) {
  return apiClient.post<User>('/users', input).then((r) => r.data)
}

export interface UpdateUserInput {
  name?: string
  email?: string
  password?: string
  role?: Role
  active?: boolean
}

export function updateUser(id: string, input: UpdateUserInput) {
  return apiClient.put<User>(`/users/${id}`, input).then((r) => r.data)
}
