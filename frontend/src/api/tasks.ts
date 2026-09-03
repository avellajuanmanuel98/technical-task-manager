import { apiClient } from './client'
import type { PaginatedResult, Task, TaskFilters } from '../types'

export function listTasks(filters: TaskFilters) {
  return apiClient.get<PaginatedResult<Task>>('/tasks', { params: filters }).then((r) => r.data)
}

export function getTask(id: number) {
  return apiClient.get<Task>(`/tasks/${id}`).then((r) => r.data)
}

export interface CreateTaskInput {
  description: string
  technicianId: string
  laborTypeId: string
  scheduledDate: string
  observations?: string
}

export function createTask(input: CreateTaskInput) {
  return apiClient.post<Task>('/tasks', input).then((r) => r.data)
}

export interface UpdateTaskInput {
  description?: string
  technicianId?: string
  laborTypeId?: string
  scheduledDate?: string
  observations?: string
}

export function updateTask(id: number, input: UpdateTaskInput) {
  return apiClient.put<Task>(`/tasks/${id}`, input).then((r) => r.data)
}

export function startTask(id: number) {
  return apiClient.post<Task>(`/tasks/${id}/start`).then((r) => r.data)
}

export function finishTask(id: number, observations?: string) {
  return apiClient.post<Task>(`/tasks/${id}/finish`, { observations }).then((r) => r.data)
}

export function cancelTask(id: number, reason: string) {
  return apiClient.post<Task>(`/tasks/${id}/cancel`, { reason }).then((r) => r.data)
}

export type ExportFormat = 'xlsx' | 'csv'

export interface ExportFilters {
  technicianId?: string
  status?: string
  laborTypeId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  format: ExportFormat
}

function filenameFromContentDisposition(header: string | undefined, fallback: string): string {
  const match = header?.match(/filename="?([^";]+)"?/)
  return match?.[1] ?? fallback
}

export async function exportTasks(filters: ExportFilters) {
  const res = await apiClient.get('/tasks/export', { params: filters, responseType: 'blob' })
  const filename = filenameFromContentDisposition(res.headers['content-disposition'], `tareas.${filters.format}`)
  return { blob: res.data as Blob, filename }
}
