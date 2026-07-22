import { createSlice } from '@reduxjs/toolkit';
import { resetStore } from './authSlice';

interface PrivacyState {
  privacyMode: boolean;
}

const initialState: PrivacyState = {
  privacyMode: true,
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
  },
  extraReducers: (builder) => {
    builder.addCase(resetStore, () => initialState);
  },
});

export const { togglePrivacyMode, setPrivacyMode } = privacySlice.actions;
export default privacySlice.reducer;
