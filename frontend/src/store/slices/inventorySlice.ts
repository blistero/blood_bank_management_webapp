import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { inventoryApi } from '@/api/inventoryApi'
import type { BloodUnit, PaginatedResponse, StockSummary } from '@/types'
import { extractApiError } from '@/utils/helpers'

interface InventoryState {
  list: PaginatedResponse<BloodUnit> | null
  summary: StockSummary[]
  loading: boolean
  error: string | null
}

const initialState: InventoryState = {
  list: null,
  summary: [],
  loading: false,
  error: null,
}

export const fetchInventory = createAsyncThunk(
  'inventory/fetchAll',
  async (params: Record<string, string | number | boolean> | undefined, { rejectWithValue }) => {
    try {
      const { data } = await inventoryApi.list(params)
      return data
    } catch (err) {
      return rejectWithValue(extractApiError(err))
    }
  }
)

export const fetchStockSummary = createAsyncThunk(
  'inventory/fetchSummary',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await inventoryApi.summary()
      return data
    } catch (err) {
      return rejectWithValue(extractApiError(err))
    }
  }
)

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,
  reducers: {
    clearInventoryError(state) { state.error = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInventory.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchInventory.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchInventory.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })
      .addCase(fetchStockSummary.fulfilled, (state, action) => {
        state.summary = action.payload
      })
  },
})

export const { clearInventoryError } = inventorySlice.actions
export default inventorySlice.reducer
