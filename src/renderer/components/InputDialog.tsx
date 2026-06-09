import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MessageSquare } from 'lucide-react';

interface InputDialogProps {
  open: boolean;
  title: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function InputDialog({
  open,
  title,
  message,
  placeholder = '',
  confirmLabel = '确定',
  cancelLabel = '取消',
  variant = 'info',
  onConfirm,
  onCancel,
}: InputDialogProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  const variantStyles = {
    danger: {
      icon: 'text-error',
      button: 'bg-error text-on-error hover:bg-error/90',
    },
    warning: {
      icon: 'text-amber-500',
      button: 'bg-amber-500 text-white hover:bg-amber-600',
    },
    info: {
      icon: 'text-secondary',
      button: 'bg-secondary text-on-secondary hover:bg-secondary/90',
    },
  };

  const styles = variantStyles[variant];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onConfirm(value.trim());
    }
  };

  const dialog = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="relative w-full max-w-[400px] rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <MessageSquare className="size-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-primary">{title}</h3>
            <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">{message}</p>
          </div>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mt-4">
            <input
              type="text"
              className="w-full rounded-xl border border-outline-variant bg-surface px-4 py-3 text-sm text-primary outline-none transition-colors focus:border-secondary"
              placeholder={placeholder}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-outline-variant bg-surface px-4 py-2 text-sm font-medium text-on-surface-variant transition-colors hover:bg-surface-container"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={!value.trim()}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition-colors ${styles.button} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}

// 全局 input 状态管理
let globalInputDialogState: {
  open: boolean;
  title: string;
  message: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  variant: 'danger' | 'warning' | 'info';
  resolve: (value: string | null) => void;
} | null = null;

let globalInputDialogListeners: Array<() => void> = [];

function notifyGlobalInputDialogListeners() {
  globalInputDialogListeners.forEach((listener) => listener());
}

export function showInputDialog(options: {
  title?: string;
  message: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
}): Promise<string | null> {
  return new Promise((resolve) => {
    globalInputDialogState = {
      open: true,
      title: options.title || '输入',
      message: options.message,
      placeholder: options.placeholder || '',
      confirmLabel: options.confirmLabel || '确定',
      cancelLabel: options.cancelLabel || '取消',
      variant: options.variant || 'info',
      resolve,
    };
    notifyGlobalInputDialogListeners();
  });
}

export function GlobalInputDialog() {
  const [, setUpdate] = useState(0);

  useEffect(() => {
    const listener = () => setUpdate((n) => n + 1);
    globalInputDialogListeners.push(listener);
    return () => {
      globalInputDialogListeners = globalInputDialogListeners.filter((l) => l !== listener);
    };
  }, []);

  const handleConfirm = (value: string) => {
    globalInputDialogState?.resolve(value);
    globalInputDialogState = null;
    setUpdate((n) => n + 1);
  };

  const onCancel = () => {
    globalInputDialogState?.resolve(null);
    globalInputDialogState = null;
    setUpdate((n) => n + 1);
  };

  return (
    <InputDialog
      open={globalInputDialogState?.open ?? false}
      title={globalInputDialogState?.title || ''}
      message={globalInputDialogState?.message || ''}
      placeholder={globalInputDialogState?.placeholder}
      confirmLabel={globalInputDialogState?.confirmLabel}
      cancelLabel={globalInputDialogState?.cancelLabel}
      variant={globalInputDialogState?.variant}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    />
  );
}
