import api from './axiosClient'
import type { BloodUnit, StockSummary, PaginatedResponse } from '@/types'

export const inventoryApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get<PaginatedResponse<BloodUnit>>('/inventory/', { params }),

  add: (data: {
    batch_number: string
    blood_group: string
    component_type: string
    volume_ml: number
    collected_date: string
    expiry_date?: string
    storage_location?: string
    donor?: number
    notes?: string
  }) => api.post<BloodUnit>('/inventory/add/', data),

  getById: (id: number) =>
    api.get<BloodUnit>(`/inventory/${id}/`),

  updateStatus: (id: number, status: string, notes?: string) =>
    api.patch<BloodUnit>(`/inventory/${id}/`, { status, notes }),

  delete: (id: number) =>
    api.delete(`/inventory/${id}/`),

  summary: () =>
    api.get<StockSummary[]>('/inventory/summary/'),

  availableByBloodGroup: (bloodGroup: string) =>
    api.get<PaginatedResponse<BloodUnit>>(`/inventory/available/${encodeURIComponent(bloodGroup)}/`),

  markExpired: () =>
    api.post<{ message: string }>('/inventory/mark-expired/'),
}
