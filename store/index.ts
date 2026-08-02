import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';
import transactionReducer from './transactionSlice';
import privacyReducer from './privacySlice';
import biometricReducer from './biometricSlice';
import { readBiometric } from '../lib/biometric';
import { AuthState } from '../types';

// Pre-hydrate: if there is no token in localStorage, skip the loading spinner
// so page-level auth guards immediately redirect to login instead of hanging.
const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('ft_token');

// Pre-hydrate the biometric gate too, so a locked app never paints its content
// for a frame before BiometricGate mounts.
const storedBiometric = readBiometric();
const biometricEnabled = !!storedBiometric?.enabled;

const preloadedState = {
  // No token means no session to restore, so skip the loading spinner entirely
  // and let page guards redirect to login immediately.
  auth: { user: null, isLoading: hasToken, error: null } as AuthState,
  biometric: {
    enabled: biometricEnabled,
    // Lock only when a token already existed at page load — i.e. the user is
    // re-entering an existing session. A fresh password login must not
    // immediately demand a fingerprint.
    isLocked: biometricEnabled && hasToken,
    isSupported: false,
  },
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    transactions: transactionReducer,
    privacy: privacyReducer,
    biometric: biometricReducer,
  },
  preloadedState,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
