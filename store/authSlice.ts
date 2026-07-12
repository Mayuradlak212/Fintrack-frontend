import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { User, LoginForm, RegisterForm, AuthState } from '../types';
import { fetchApi, setToken, removeToken, setRefreshToken } from '../lib/api';



const initialState: AuthState = {
  user: null,
  isLoading: true,
  error: null,
};

export const restoreSession = createAsyncThunk('auth/restoreSession', async (_, { rejectWithValue }) => {
  try {
    const data = await fetchApi<User>('/api/auth/me');
    return data;
  } catch (err: unknown) {
    removeToken();
    return rejectWithValue((err as Error).message || 'Failed to restore session');
  }
});

export const login = createAsyncThunk('auth/login', async (data: LoginForm, { rejectWithValue }) => {
  try {
    const res = await fetchApi<{ access_token: string; refresh_token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      data,
    });
    setToken(res.access_token);
    setRefreshToken(res.refresh_token);
    return res.user;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (data: RegisterForm, { rejectWithValue }) => {
  try {
    const res = await fetchApi<{ access_token: string; refresh_token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      data,
    });
    setToken(res.access_token);
    setRefreshToken(res.refresh_token);
    return res.user;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Registration failed');
  }
});

export const updateProfile = createAsyncThunk('auth/updateProfile', async (data: Partial<User>, { rejectWithValue }) => {
  try {
    const res = await fetchApi<User>('/api/auth/me', {
      method: 'PATCH',
      data,
    });
    return res;
  } catch (err: unknown) {
    return rejectWithValue((err as Error).message || 'Failed to update profile');
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      removeToken();
    }
  },
  extraReducers: (builder) => {
    builder
      // Restore Session
      .addCase(restoreSession.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(restoreSession.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.error = null;
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.isLoading = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Update Profile
      .addCase(updateProfile.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
