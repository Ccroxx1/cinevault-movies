import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
            className="pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-2xl bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 text-neutral-100"
          >
            {toast.type === 'success' && (
              <CheckCircle2 className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            {toast.type === 'error' && (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            )}
            {toast.type === 'info' && (
              <Info className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
            )}

            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold tracking-tight text-white">
                {toast.title}
              </div>
              {toast.description && (
                <div className="text-xs text-neutral-400 mt-0.5 truncate">
                  {toast.description}
                </div>
              )}
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="text-neutral-500 hover:text-neutral-300 transition-colors p-1 cursor-pointer"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
