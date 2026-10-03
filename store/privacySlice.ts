import { createSlice } from '@reduxjs/toolkit';
import { resetStore } from './authSlice';

interface PrivacyState {
  privacyMode: boolean;
  hideTransactionAmounts: boolean;
}

const initialState: PrivacyState = {
  privacyMode: true,
  hideTransactionAmounts: false,
};

const privacySlice = createSlice({
  name: 'privacy',
  initialState,
  reducers: {
    togglePrivacyMode(state) {
      state.privacyMode = !state.privacyMode;
    },
    setPrivacyMode(state, action) {
      state.privacyMode = action.payload;
    },
    toggleHideTransactionAmounts(state) {
      state.hideTransactionAmounts = !state.hideTransactionAmounts;
    },
    setHideTransactionAmounts(state, action) {
      state.hideTransactionAmounts = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetStore, () => initialState);
  },
});

export const {
  togglePrivacyMode,
  setPrivacyMode,
  toggleHideTransactionAmounts,
  setHideTransactionAmounts,
} = privacySlice.actions;
export default privacySlice.reducer;
