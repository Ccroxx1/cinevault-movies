import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  description?: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl cv-surface-elevated border backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {toast.type === 'success' && (
            <CheckCircle2
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: 'var(--cv-success-soft-fg)' }}
              aria-hidden="true"
            />
          )}
          {toast.type === 'error' && (
            <AlertCircle
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: 'var(--cv-error-soft-fg)' }}
              aria-hidden="true"
            />
          )}
          {toast.type === 'info' && (
            <Info
              className="w-5 h-5 shrink-0 mt-0.5"
              style={{ color: 'var(--cv-info-soft-fg)' }}
              aria-hidden="true"
            />
          )}

          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold tracking-tight cv-text">
              {toast.title}
            </div>
            {toast.description && (
              <div className="text-xs cv-text-muted mt-0.5 truncate">
                {toast.description}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="cv-text-muted hover:text-[var(--cv-text)] transition-colors p-1 cursor-pointer rounded-lg hover:bg-[var(--cv-surface-muted)]"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
