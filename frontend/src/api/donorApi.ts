import api from './axiosClient'
import type { DonorProfile, DonorListItem, PaginatedResponse } from '@/types'

export const donorApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<DonorListItem>>('/donors/', { params }),

  create: (data: {
    blood_group: string
    date_of_birth: string
    gender: string
    phone: string
    city: string
    state?: string
    address?: string
    pincode?: string
    medical_notes?: string
  }) => api.post<DonorProfile>('/donors/create/', data),

  getMe: () =>
    api.get<DonorProfile>('/donors/me/'),

  setupMe: (data: {
    blood_group: string
    date_of_birth: string
    gender: string
    phone?: string
    city?: string
    address?: string
    state?: string
    pincode?: string
    medical_notes?: string
  }) => api.patch<DonorProfile>('/donors/me/', data),

  updateMe: (data: Partial<Pick<DonorProfile, 'phone' | 'address' | 'city' | 'state' | 'pincode' | 'is_available' | 'medical_notes'>>) =>
    api.patch<DonorProfile>('/donors/me/', data),

  getById: (id: number) =>
    api.get<DonorProfile>(`/donors/${id}/`),

  update: (id: number, data: Partial<DonorProfile>) =>
    api.patch<DonorProfile>(`/donors/${id}/`, data),

  updateLastDonation: (id: number, last_donation_date: string) =>
    api.patch<DonorProfile>(`/donors/${id}/update-donation/`, { last_donation_date }),

  eligibleByBloodGroup: (bloodGroup: string, city?: string) =>
    api.get<PaginatedResponse<DonorListItem>>(`/donors/eligible/${encodeURIComponent(bloodGroup)}/`, {
      params: city ? { city } : {},
    }),
}
