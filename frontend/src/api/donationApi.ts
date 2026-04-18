import api from './axiosClient'
import type { Donation, PaginatedResponse } from '@/types'

export const donationApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Donation>>('/donations/', { params }),

  schedule: (data: {
    donor: number
    scheduled_date: string
    component_type: string
    volume_ml: number
    notes?: string
  }) => api.post<Donation>('/donations/schedule/', data),

  getById: (id: number) =>
    api.get<Donation>(`/donations/${id}/`),

  complete: (id: number, data: {
    donation_date: string
    storage_location?: string
    notes?: string
  }) => api.post<{ message: string; donation: Donation; blood_unit: unknown }>(`/donations/${id}/complete/`, data),

  cancel: (id: number, rejection_reason: string) =>
    api.post<Donation>(`/donations/${id}/cancel/`, { rejection_reason }),

  reject: (id: number, rejection_reason: string) =>
    api.post<Donation>(`/donations/${id}/reject/`, { rejection_reason }),

  myHistory: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<Donation>>('/donations/my-history/', { params }),
}
