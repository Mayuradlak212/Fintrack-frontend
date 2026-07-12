import { toast as reactToast, ToastOptions, ToastContainer as ToastContainerBase } from 'react-toastify';

const defaultOptions: ToastOptions = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "dark",
  className: "!font-sans",
};

export const toast = {
  success: (message: string, options?: ToastOptions) => reactToast.success(message, { ...defaultOptions, ...options }),
  error: (message: string, options?: ToastOptions) => reactToast.error(message, { ...defaultOptions, ...options }),
  info: (message: string, options?: ToastOptions) => reactToast.info(message, { ...defaultOptions, ...options }),
  warning: (message: string, options?: ToastOptions) => reactToast.warning(message, { ...defaultOptions, ...options }),
  warn: (message: string, options?: ToastOptions) => reactToast.warn(message, { ...defaultOptions, ...options }),
  default: (message: string, options?: ToastOptions) => reactToast(message, { ...defaultOptions, ...options }),
};

export const ToastContainer = ToastContainerBase;
