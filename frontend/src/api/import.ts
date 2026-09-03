import { apiClient } from './client'
import type { ImportConfirmResult, ImportConfirmRow, ImportPreviewResult } from '../types'

export function previewImport(file: File) {
  const form = new FormData()
  form.append('file', file)
  return apiClient.post<ImportPreviewResult>('/import/preview', form).then((r) => r.data)
}

export function confirmImport(rows: ImportConfirmRow[]) {
  return apiClient.post<ImportConfirmResult>('/import/confirm', { rows }).then((r) => r.data)
}

export function downloadTemplate() {
  return apiClient.get('/import/template', { responseType: 'blob' }).then((r) => r.data as Blob)
}
