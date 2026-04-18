import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { donorApi } from '@/api/donorApi'
import type { DonorListItem, DonorProfile, PaginatedResponse } from '@/types'
import { extractApiError } from '@/utils/helpers'

interface DonorState {
  list: PaginatedResponse<DonorListItem> | null
  profile: DonorProfile | null
  loading: boolean
  error: string | null
}

const initialState: DonorState = {
  list: null,
  profile: null,
  loading: false,
  error: null,
}

export const fetchDonors = createAsyncThunk(
  'donors/fetchAll',
  async (params: Record<string, string | number> | undefined, { rejectWithValue }) => {
    try {
      const { data } = await donorApi.list(params)
      return data
    } catch (err) {
      return rejectWithValue(extractApiError(err))
    }
  }
)

export const fetchMyDonorProfile = createAsyncThunk(
  'donors/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await donorApi.getMe()
      return data
    } catch (err) {
      return rejectWithValue(extractApiError(err))
    }
  }
)

const donorSlice = createSlice({
  name: 'donors',
  initialState,
  reducers: {
    clearDonorError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDonors.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDonors.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchDonors.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchMyDonorProfile.fulfilled, (state, action) => {
        state.profile = action.payload
      })
  },
})

export const { clearDonorError } = donorSlice.actions
export default donorSlice.reducer
