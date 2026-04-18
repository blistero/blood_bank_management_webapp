import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/store'
import { login, logout, clearError } from '@/store/slices/authSlice'

export function useAuth() {
  const dispatch = useDispatch<AppDispatch>()
  const { user, tokens, isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  )

  return {
    user,
    tokens,
    isAuthenticated,
    loading,
    error,
    login: (email: string, password: string) => dispatch(login({ email, password })),
    logout: () => dispatch(logout()),
    clearError: () => dispatch(clearError()),
  }
}
