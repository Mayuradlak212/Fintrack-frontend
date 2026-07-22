import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import authReducer from './authSlice';
import transactionReducer from './transactionSlice';
import privacyReducer from './privacySlice';

// Pre-hydrate: if there is no token in localStorage, skip the loading spinner
// so page-level auth guards immediately redirect to login instead of hanging.
const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('ft_token');

export const store = configureStore({
  reducer: {
    auth: authReducer,
    transactions: transactionReducer,
    privacy: privacyReducer,
  },
  preloadedState: hasToken ? undefined : { auth: { user: null, isLoading: false, error: null } },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
