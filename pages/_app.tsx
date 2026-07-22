import type { AppProps } from 'next/app';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { ToastContainer } from '../utils/toast';
import { Provider } from 'react-redux';
import { store, useAppDispatch } from '../store';
import { restoreSession, setIsLoading } from '../store/authSlice';
import { getToken } from '../lib/api';
import '../styles/globals.css';

function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  useEffect(() => {
    if (getToken()) {
      dispatch(restoreSession()).unwrap().catch(() => {
        // Token expired or invalid — redirect to login
        if (!router.pathname.startsWith('/auth/')) {
          router.replace('/auth/login');
        }
      });
    } else {
      // No token at all — immediately mark loading done so page guards can redirect
      dispatch(setIsLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch]);
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </Head>
      <AuthInit>
        <Component {...pageProps} />
        <ToastContainer />
      </AuthInit>
    </Provider>
  );
}
