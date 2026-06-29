import { X } from 'lucide-react';
import type { ReactNode } from 'react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90svh] w-full min-w-0 max-w-md overflow-y-auto rounded-2xl bg-surface p-5 shadow-xl ring-1 ring-border sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted transition hover:bg-surface-soft hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
