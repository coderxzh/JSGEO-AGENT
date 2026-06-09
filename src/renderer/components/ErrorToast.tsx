import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

type ToastType = 'error' | 'success' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

interface ErrorToastContextType {
  showError: (message: string, options?: { title?: string; duration?: number }) => void;
  showSuccess: (message: string, options?: { title?: string; duration?: number }) => void;
  showWarning: (message: string, options?: { title?: string; duration?: number }) => void;
  showInfo: (message: string, options?: { title?: string; duration?: number }) => void;
}

const ErrorToastContext = createContext<ErrorToastContextType | null>(null);

// 脱敏错误消息
function sanitizeMessage(message: string): string {
  if (!message) return message;

  let sanitized = message.replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer [REDACTED]');
  sanitized = sanitized.replace(/api[_-]?key[=:]\s*[A-Za-z0-9._-]+/gi, 'api_key=[REDACTED]');

  if (sanitized.length > 300) {
    sanitized = sanitized.slice(0, 300) + '...';
  }

  return sanitized;
}

// 单个 Toast 组件
function ToastItem({
  toast,
  onRemove,
}: {
  key?: string;
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const icons = {
    error: <AlertCircle className="h-4 w-4 text-red-500" />,
    success: <CheckCircle className="h-4 w-4 text-emerald-500" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    info: <AlertCircle className="h-4 w-4 text-blue-500" />,
  };

  const bgColors = {
    error: 'bg-red-50 border-red-200 dark:bg-red-950/50 dark:border-red-800',
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/50 dark:border-amber-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/50 dark:border-blue-800',
  };

  const textColors = {
    error: 'text-red-800 dark:text-red-200',
    success: 'text-emerald-800 dark:text-emerald-200',
    warning: 'text-amber-800 dark:text-amber-200',
    info: 'text-blue-800 dark:text-blue-200',
  };

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm overflow-hidden rounded-lg border shadow-lg animate-in slide-in-from-right',
        bgColors[toast.type]
      )}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">{icons[toast.type]}</div>
          <div className="flex-1">
            {toast.title && (
              <p className={cn('text-[13px] font-semibold', textColors[toast.type])}>
                {toast.title}
              </p>
            )}
            <p className={cn('text-[12px]', textColors[toast.type])}>
              {sanitizeMessage(toast.message)}
            </p>
          </div>
          <button
            onClick={() => onRemove(toast.id)}
            className="flex-shrink-0 rounded p-1 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="h-3.5 w-3.5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Toast 容器
function ToastContainer({
  toasts,
  onRemove,
}: {
  toasts: Toast[];
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="pointer-events-none fixed bottom-4 right-4 z-[99999] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>,
    document.body
  );
}

// Provider 组件
export function ErrorToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, options?: { title?: string; duration?: number }) => {
      const id = Math.random().toString(36).slice(2, 9);
      const toast: Toast = {
        id,
        type,
        message,
        title: options?.title,
        duration: options?.duration ?? 5000,
      };

      setToasts((prev) => [...prev, toast]);

      // 自动消失
      if (toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, toast.duration);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showError = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast('error', message, { title: options?.title || '错误', duration: options?.duration ?? 8000 });
    },
    [addToast]
  );

  const showSuccess = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast('success', message, { title: options?.title || '成功', duration: options?.duration ?? 3000 });
    },
    [addToast]
  );

  const showWarning = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast('warning', message, { title: options?.title || '警告', duration: options?.duration ?? 5000 });
    },
    [addToast]
  );

  const showInfo = useCallback(
    (message: string, options?: { title?: string; duration?: number }) => {
      addToast('info', message, { title: options?.title || '提示', duration: options?.duration ?? 4000 });
    },
    [addToast]
  );

  return (
    <ErrorToastContext.Provider value={{ showError, showSuccess, showWarning, showInfo }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ErrorToastContext.Provider>
  );
}

// Hook
export function useToast() {
  const context = useContext(ErrorToastContext);
  if (!context) {
    throw new Error('useToast must be used within ErrorToastProvider');
  }
  return context;
}
