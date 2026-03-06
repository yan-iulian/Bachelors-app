import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import API_URL from "../config/api";

// Login
export const login = createAsyncThunk(
  "auth/login",
  async ({ email, parola }, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, parola }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.utilizator));
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// Register (auto-login)
export const register = createAsyncThunk(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Auto-login: persist token + user
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.utilizator));
      return data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

// Verificare token existent la reload
const savedUser = localStorage.getItem("user");
const savedToken = localStorage.getItem("token");

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: savedUser ? JSON.parse(savedUser) : null,
    token: savedToken || null,
    loading: false,
    error: null,
    registerSuccess: false,
  },
  reducers: {
    logout: (state) => {
      // Curăță datele AI și wishlist pentru utilizatorul curent
      const userId = state.user?.id;
      if (userId) {
        localStorage.removeItem(`aiPrefs_${userId}`);
        localStorage.removeItem(`aiMatchScores_${userId}`);
      }
      // Curăță și eventualele date rămase de la 'guest'
      localStorage.removeItem("aiPrefs_guest");
      localStorage.removeItem("aiMatchScores_guest");
      localStorage.removeItem("wishlist");

      // Curăță filtrele catalogului din sessionStorage
      sessionStorage.removeItem("catalogSort");
      sessionStorage.removeItem("catalogPage");
      sessionStorage.removeItem("catalogBrands");
      sessionStorage.removeItem("catalogFuel");
      sessionStorage.removeItem("catalogCaroserii");

      state.user = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    },
    clearError: (state) => {
      state.error = null;
    },
    clearRegisterSuccess: (state) => {
      state.registerSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.utilizator;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action) => {
        state.loading = false;
        state.registerSuccess = true;
        state.user = action.payload.utilizator;
        state.token = action.payload.token;
      })
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearError, clearRegisterSuccess } = authSlice.actions;
export default authSlice.reducer;
