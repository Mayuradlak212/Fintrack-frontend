import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { ToastContainer } from '../utils/toast';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '../store';
import { restoreSession } from '../store/authSlice';
import { getToken } from '../lib/api';
import '../styles/globals.css';

function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  useEffect(() => {
    if (getToken()) {
      dispatch(restoreSession());
    }
  }, [dispatch]);
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <AuthInit>
        <Component {...pageProps} />
        <ToastContainer />
      </AuthInit>
    </Provider>
  );
}
