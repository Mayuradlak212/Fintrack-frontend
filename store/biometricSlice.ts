import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BiometricState } from '../types';
import { resetStore } from './authSlice';

const initialState: BiometricState = {
  enabled: false,
  isLocked: false,
  isSupported: false,
};

const biometricSlice = createSlice({
  name: 'biometric',
  initialState,
  reducers: {
    setSupported(state, action: PayloadAction<boolean>) {
      state.isSupported = action.payload;
    },
    setEnabled(state, action: PayloadAction<boolean>) {
      state.enabled = action.payload;
      // Turning it off must never leave the gate up.
      if (!action.payload) state.isLocked = false;
    },
    lock(state) {
      if (state.enabled) state.isLocked = true;
    },
    unlock(state) {
      state.isLocked = false;
    },
  },
  extraReducers: (builder) => {
    // On logout keep `isSupported` (a device fact) but drop the session lock.
    builder.addCase(resetStore, (state) => ({ ...initialState, isSupported: state.isSupported }));
  },
});

export const { setSupported, setEnabled, lock, unlock } = biometricSlice.actions;
export default biometricSlice.reducer;
