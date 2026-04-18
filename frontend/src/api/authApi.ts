import api from './axiosClient'
import type { AuthTokens, User } from '@/types'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<AuthTokens>('/auth/login/', { email, password }),

  logout: (refresh: string) =>
    api.post('/auth/logout/', { refresh }),

  refresh: (refresh: string) =>
    api.post<{ access: string }>('/auth/refresh/', { refresh }),

  register: (data: {
    email: string
    first_name: string
    last_name: string
    role: string
    password: string
    password2: string
    phone?: string
  }) => api.post<{ message: string; user: User }>('/accounts/register/', data),

  getProfile: () =>
    api.get<User>('/accounts/profile/'),

  updateProfile: (data: Partial<Pick<User, 'first_name' | 'last_name' | 'phone'>>) =>
    api.patch<User>('/accounts/profile/', data),

  changePassword: (old_password: string, new_password: string, new_password2: string) =>
    api.post('/accounts/change-password/', { old_password, new_password, new_password2 }),

  listUsers: (params?: Record<string, string>) =>
    api.get<{ count: number; results: User[] }>('/accounts/users/', { params }),
}
