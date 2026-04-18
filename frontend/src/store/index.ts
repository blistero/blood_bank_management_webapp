import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import donorReducer from './slices/donorSlice'
import inventoryReducer from './slices/inventorySlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    donors: donorReducer,
    inventory: inventoryReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
