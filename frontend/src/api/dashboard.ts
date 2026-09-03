import { apiClient } from './client'
import type { DashboardFilters, DashboardStats } from '../types'

export function getDashboardStats(filters: DashboardFilters) {
  return apiClient.get<DashboardStats>('/dashboard/stats', { params: filters }).then((r) => r.data)
}
