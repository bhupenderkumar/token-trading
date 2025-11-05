import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

export type ToastType = 'info' | 'success' | 'error';
export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
  duration?: number; // in ms, default 3500
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  const removeToast = (id: number) => {
    setToasts((toasts) => toasts.filter((t) => t.id !== id));
  };

  const showToast = useCallback((type: ToastType, message: string, duration = 3500) => {
    const id = toastId.current++;
    setToasts((toasts) => [...toasts, { id, type, message, duration }]);
    setTimeout(() => removeToast(id), duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        alignItems: 'flex-end',
      }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              minWidth: 240,
              padding: '16px 24px',
              background: toast.type === 'error' ? '#2d1519' : toast.type === 'success' ? '#142d19' : '#1a1a1a',
              color: toast.type === 'error' ? '#ff5050' : toast.type === 'success' ? '#14f195' : '#eee',
              border: `1.5px solid ${toast.type === 'error' ? '#ff5050' : toast.type === 'success' ? '#14f195' : '#444'}`,
              borderRadius: 8,
              boxShadow: '0 4px 16px #0009',
              fontWeight: toast.type === 'success' ? 700 : 500,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'all 0.3s',
            }}
          >
            <span>
              {toast.type === 'success'
                ? '✓'
                : toast.type === 'error'
                ? '⨉'
                : 'ℹ️'}
            </span>
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};
