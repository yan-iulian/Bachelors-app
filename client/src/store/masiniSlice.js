import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import API_URL from '../config/api'

// Helper pentru headers cu token
const authHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
})

// GET masini (catalog)
export const fetchMasini = createAsyncThunk('masini/fetchAll', async (_, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_URL}/api/masini`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data
    } catch (err) {
        return rejectWithValue(err.message)
    }
})

// GET masina by id
export const fetchMasina = createAsyncThunk('masini/fetchOne', async (id, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_URL}/api/masini/${id}`, { headers: authHeaders() })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data
    } catch (err) {
        return rejectWithValue(err.message)
    }
})

// POST masina (Director)
export const addMasina = createAsyncThunk('masini/add', async (masina, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_URL}/api/masini`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(masina)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data
    } catch (err) {
        return rejectWithValue(err.message)
    }
})

// PUT masina (Director)
export const updateMasina = createAsyncThunk('masini/update', async ({ id, masina }, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_URL}/api/masini/${id}`, {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify(masina)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return data
    } catch (err) {
        return rejectWithValue(err.message)
    }
})

// DELETE masina (Director)
export const deleteMasina = createAsyncThunk('masini/delete', async (id, { rejectWithValue }) => {
    try {
        const res = await fetch(`${API_URL}/api/masini/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        return id
    } catch (err) {
        return rejectWithValue(err.message)
    }
})

const masiniSlice = createSlice({
    name: 'masini',
    initialState: {
        lista: [],
        masinaSelectata: null,
        loading: false,
        error: null
    },
    reducers: {
        clearMasinaSelectata: (state) => {
            state.masinaSelectata = null
        },
        clearError: (state) => {
            state.error = null
        }
    },
    extraReducers: (builder) => {
        builder
            // Fetch all
            .addCase(fetchMasini.pending, (state) => { state.loading = true; state.error = null })
            .addCase(fetchMasini.fulfilled, (state, action) => { state.loading = false; state.lista = action.payload })
            .addCase(fetchMasini.rejected, (state, action) => { state.loading = false; state.error = action.payload })
            // Fetch one
            .addCase(fetchMasina.pending, (state) => { state.loading = true })
            .addCase(fetchMasina.fulfilled, (state, action) => { state.loading = false; state.masinaSelectata = action.payload })
            .addCase(fetchMasina.rejected, (state, action) => { state.loading = false; state.error = action.payload })
            // Add
            .addCase(addMasina.fulfilled, (state, action) => { state.lista.push(action.payload) })
            // Update
            .addCase(updateMasina.fulfilled, (state, action) => {
                const idx = state.lista.findIndex(m => m.idMasina === action.payload.idMasina)
                if (idx !== -1) state.lista[idx] = action.payload
            })
            // Delete
            .addCase(deleteMasina.fulfilled, (state, action) => {
                state.lista = state.lista.filter(m => m.idMasina !== action.payload)
            })
    }
})

export const { clearMasinaSelectata, clearError } = masiniSlice.actions
export default masiniSlice.reducer
