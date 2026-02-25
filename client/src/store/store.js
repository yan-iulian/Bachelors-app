import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import masiniReducer from './masiniSlice'

const store = configureStore({
    reducer: {
        auth: authReducer,
        masini: masiniReducer
    }
})

export default store
