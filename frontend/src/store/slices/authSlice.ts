import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { authApi } from '@/api/authApi'
import type { AuthState, AuthTokens, User } from '@/types'
import { extractApiError } from '@/utils/helpers'

const storedTokens = localStorage.getItem('tokens')
const storedUser = localStorage.getItem('user')

const initialState: AuthState = {
  tokens: storedTokens ? (JSON.parse(storedTokens) as AuthTokens) : null,
  user: storedUser ? (JSON.parse(storedUser) as User) : null,
  isAuthenticated: !!storedTokens,
  loading: false,
  error: null,
}

export const login = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const { data: tokens } = await authApi.login(email, password)
      localStorage.setItem('tokens', JSON.stringify(tokens))
      const { data: user } = await authApi.getProfile()
      localStorage.setItem('user', JSON.stringify(user))
      return { tokens, user }
    } catch (err) {
      return rejectWithValue(extractApiError(err))
    }
  }
)

export const logout = createAsyncThunk('auth/logout', async (_, { getState }) => {
  const state = getState() as { auth: AuthState }
  const refresh = state.auth.tokens?.refresh
  if (refresh) {
    try { await authApi.logout(refresh) } catch { /* ignore */ }
  }
  localStorage.removeItem('tokens')
  localStorage.removeItem('user')
})

export const fetchProfile = createAsyncThunk(
  'auth/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authApi.getProfile()
      localStorage.setItem('user', JSON.stringify(data))
      return data
    } catch (err) {
      return rejectWithValue(extractApiError(err))
    }
  }
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.tokens = action.payload.tokens
        state.user = action.payload.user
        state.isAuthenticated = true
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(logout.fulfilled, (state) => {
        state.tokens = null
        state.user = null
        state.isAuthenticated = false
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.user = action.payload
      })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
