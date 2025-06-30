import type { ToastType } from '../components/Toast';

interface ToastData {
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Utility functions for showing toasts
export const toast = {
  success: (title: string, message?: string, duration?: number) => {
    (window as unknown as { addToast?: (toast: ToastData) => void }).addToast?.({ type: 'success', title, message, duration });
  },
  error: (title: string, message?: string, duration?: number) => {
    (window as unknown as { addToast?: (toast: ToastData) => void }).addToast?.({ type: 'error', title, message, duration });
  },
  warning: (title: string, message?: string, duration?: number) => {
    (window as unknown as { addToast?: (toast: ToastData) => void }).addToast?.({ type: 'warning', title, message, duration });
  },
  info: (title: string, message?: string, duration?: number) => {
    (window as unknown as { addToast?: (toast: ToastData) => void }).addToast?.({ type: 'info', title, message, duration });
  }
};