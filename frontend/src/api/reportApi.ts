import api from './axiosClient'
import type {
  DashboardStats,
  DonationTrend,
  RequestTrend,
  InventoryByGroup,
} from '@/types'

interface DateRange { start_date?: string; end_date?: string }

export const reportApi = {
  dashboard: () =>
    api.get<DashboardStats>('/reports/dashboard/'),

  donationsByStatus: (range?: DateRange) =>
    api.get<{ status: string; count: number }[]>('/reports/donations/by-status/', { params: range }),

  donationsByBloodGroup: (range?: DateRange) =>
    api.get<{ blood_group: string; count: number; total_volume_ml: number }[]>(
      '/reports/donations/by-blood-group/', { params: range }
    ),

  donationTrend: (range?: DateRange) =>
    api.get<DonationTrend[]>('/reports/donations/trend/', { params: range }),

  inventoryByBloodGroup: () =>
    api.get<InventoryByGroup[]>('/reports/inventory/by-blood-group/'),

  expiringUnits: (days?: number) =>
    api.get<unknown[]>('/reports/inventory/expiring/', { params: days ? { days } : {} }),

  donorsByBloodGroup: () =>
    api.get<{ blood_group: string; total: number; eligible: number; unavailable: number }[]>(
      '/reports/donors/by-blood-group/'
    ),

  donorsByCity: (city?: string) =>
    api.get<{ city: string; total: number; eligible: number }[]>(
      '/reports/donors/by-city/', { params: city ? { city } : {} }
    ),

  requestsByStatus: (range?: DateRange) =>
    api.get<{ status: string; count: number }[]>('/reports/requests/by-status/', { params: range }),

  requestsByBloodGroup: (range?: DateRange) =>
    api.get<{ blood_group: string; total: number; fulfilled: number; pending: number; rejected: number }[]>(
      '/reports/requests/by-blood-group/', { params: range }
    ),

  requestTrend: (range?: DateRange) =>
    api.get<RequestTrend[]>('/reports/requests/trend/', { params: range }),
}
