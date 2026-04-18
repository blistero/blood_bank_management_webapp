import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

const BASE_URL = '/api/v1'

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Attach JWT access token to every request
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  try {
    const raw = localStorage.getItem('tokens')
    if (raw) {
      const parsed = JSON.parse(raw) as { access?: string }
      if (parsed.access) {
        config.headers['Authorization'] = `Bearer ${parsed.access}`
      }
    }
  } catch {
    // Corrupted localStorage entry — remove it so the user is redirected to login
    localStorage.removeItem('tokens')
    localStorage.removeItem('user')
  }
  return config
})

// On 401 → attempt token refresh; on failure clear storage and redirect to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const tokens = localStorage.getItem('tokens')
      if (tokens) {
        try {
          const parsed = JSON.parse(tokens) as { refresh?: string }
          if (!parsed.refresh) throw new Error('No refresh token')
          const { data } = await axios.post(`${BASE_URL}/auth/refresh/`, {
            refresh: parsed.refresh,
          })
          const updated = { ...parsed, access: data.access }
          localStorage.setItem('tokens', JSON.stringify(updated))
          original.headers['Authorization'] = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('tokens')
          localStorage.removeItem('user')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api
