import type { AppProps } from 'next/app';
import { ToastContainer } from 'react-toastify';
import { AuthProvider } from '../context/AuthContext';
import { TransactionProvider } from '../context/TransactionContext';
import '../styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <TransactionProvider>
        <Component {...pageProps} />
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          closeOnClick
          pauseOnHover
          draggable
          theme="dark"
          toastClassName="!font-sans"
        />
      </TransactionProvider>
    </AuthProvider>
  );
}
