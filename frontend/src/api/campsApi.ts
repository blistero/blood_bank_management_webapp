import api from './axiosClient'
import type { DonationCamp, DonationCampFormData, PaginatedResponse } from '@/types'

interface CampListParams {
  page?: number
  status?: string
  city?: string
  state?: string
  search?: string
  ordering?: string
}

export const campsApi = {
  list: (params?: CampListParams) =>
    api.get<PaginatedResponse<DonationCamp>>('/camps/', { params }),

  nearby: (city?: string) =>
    api.get<PaginatedResponse<DonationCamp>>('/camps/nearby/', { params: city ? { city } : {} }),

  live: () =>
    api.get<DonationCamp[]>('/camps/live/'),

  create: (data: DonationCampFormData) =>
    api.post<DonationCamp>('/camps/create/', data),

  get: (id: number) =>
    api.get<DonationCamp>(`/camps/${id}/`),

  update: (id: number, data: Partial<DonationCampFormData>) =>
    api.patch<DonationCamp>(`/camps/${id}/`, data),

  delete: (id: number) =>
    api.delete(`/camps/${id}/`),
}
