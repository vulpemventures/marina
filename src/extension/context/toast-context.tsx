import { createContext, useContext, useState } from 'react';

const TOAST_TIMEOUT = 5000;

export type Toast = {
  id: number;
  message: string;
  duration: number;
};

export interface ToastContextProps {
  showToast: (message: string) => void;
  deleteToast: (id: number) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextProps>({
  showToast: () => {
    throw new Error('ToastContext not initialized');
  },
  deleteToast: () => {
    throw new Error('ToastContext not initialized');
  },
  toasts: [],
});

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string) => {
    const id = Math.floor(Math.random() * 1000);
    setToasts([...toasts, { id, message, duration: TOAST_TIMEOUT }]);
  };

  const deleteToast = (id: number) => {
    setToasts(toasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider
      value={{
        showToast,
        deleteToast,
        toasts,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => useContext(ToastContext);
