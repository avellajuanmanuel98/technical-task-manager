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
