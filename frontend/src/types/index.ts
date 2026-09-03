export type Role = 'ADMIN' | 'TECNICO'
export type TaskStatus = 'PENDIENTE' | 'EN_PROGRESO' | 'FINALIZADA' | 'CANCELADA'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  active: boolean
}

export interface UserRef {
  id: string
  name: string
}

export interface LaborType {
  id: string
  name: string
  description?: string | null
  active: boolean
}

export interface Task {
  id: number
  description: string
  status: TaskStatus
  technicianId: string
  technician: UserRef
  laborTypeId: string
  laborType: { id: string; name: string }
  scheduledDate: string
  startedAt: string | null
  startedBy: UserRef | null
  finishedAt: string | null
  finishedBy: UserRef | null
  totalMinutes: number | null
  cancelledAt: string | null
  cancelledBy: UserRef | null
  cancelReason: string | null
  observations: string | null
  createdBy: UserRef
  createdAt: string
  updatedAt: string
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export interface TaskFilters {
  technicianId?: string
  status?: TaskStatus
  laborTypeId?: string
  dateFrom?: string
  dateTo?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: 'scheduledDate' | 'createdAt' | 'status' | 'totalMinutes'
  sortDir?: 'asc' | 'desc'
}

export interface ApiError {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export interface DashboardStats {
  totals: {
    total: number
    pendiente: number
    enProgreso: number
    finalizada: number
    cancelada: number
  }
  avgAttentionMinutes: number | null
  totalWorkedMinutes: number
  byTechnician: { technicianId: string; technicianName: string; count: number; avgMinutes: number | null }[]
  byLaborType: { laborTypeId: string; laborTypeName: string; count: number }[]
  byDay: { date: string; count: number }[]
}

export interface DashboardFilters {
  dateFrom?: string
  dateTo?: string
}

export type ImportRowStatus = 'valid' | 'duplicate' | 'error'

export interface ImportPreviewRow {
  rowNumber: number
  externalRef: string | null
  description: string | null
  technicianRaw: string | null
  technicianId: string | null
  laborRaw: string | null
  laborTypeId: string | null
  scheduledDate: string | null
  startedAt: string | null
  finishedAt: string | null
  status: TaskStatus
  observations: string | null
  totalMinutes: number | null
  rowStatus: ImportRowStatus
  errors: string[]
}

export interface ImportPreviewResult {
  totalRows: number
  summary: { valid: number; duplicate: number; error: number }
  technicians: UserRef[]
  laborTypes: { id: string; name: string }[]
  rows: ImportPreviewRow[]
}

export interface ImportConfirmRow {
  rowNumber: number
  description: string
  technicianId: string
  laborTypeId: string
  scheduledDate: string
  startedAt: string | null
  finishedAt: string | null
  status: TaskStatus
  observations: string | null
  externalRef: string | null
}

export interface ImportConfirmResult {
  imported: number
  skippedDuplicates: number
  errors: { rowNumber: number; message: string }[]
}
