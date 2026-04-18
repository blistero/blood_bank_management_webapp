import api from './axiosClient'
import type { BloodRequest, PaginatedResponse } from '@/types'

export const requestApi = {
  list: (params?: Record<string, string | number | boolean>) =>
    api.get<PaginatedResponse<BloodRequest>>('/requests/', { params }),

  create: (data: {
    patient_name: string
    blood_group: string
    component_type: string
    units_required: number
    urgency: string
    required_by_date: string
    notes?: string
  }) => api.post<BloodRequest>('/requests/create/', data),

  getById: (id: number) =>
    api.get<BloodRequest>(`/requests/${id}/`),

  update: (id: number, data: Partial<BloodRequest>) =>
    api.patch<BloodRequest>(`/requests/${id}/`, data),

  approve: (id: number) =>
    api.post<BloodRequest>(`/requests/${id}/approve/`),

  reject: (id: number, rejection_reason: string) =>
    api.post<BloodRequest>(`/requests/${id}/reject/`, { rejection_reason }),

  fulfil: (id: number, unit_ids: number[]) =>
    api.post<BloodRequest>(`/requests/${id}/fulfil/`, { unit_ids }),

  cancel: (id: number) =>
    api.post<BloodRequest>(`/requests/${id}/cancel/`),
}
