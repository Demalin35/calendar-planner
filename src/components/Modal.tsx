import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    const { overflow, position, width, top } = document.body.style;
    const scrollY = window.scrollY;

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.top = `-${scrollY}px`;

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.position = position;
      document.body.style.width = width;
      document.body.style.top = top;
      window.scrollTo(0, scrollY);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none p-3 sm:items-center sm:p-4"
      style={{ touchAction: 'pan-y' }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        aria-label="Close modal"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          'relative z-10 box-border flex w-full min-w-0 flex-col overflow-x-hidden overflow-y-auto overscroll-contain',
          'max-w-[calc(100vw-24px)] rounded-2xl bg-surface p-4 shadow-xl ring-1 ring-border',
          'max-h-[calc(100dvh-24px)] sm:max-h-[90svh] sm:max-w-md sm:p-6',
        )}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3 sm:mb-5">
          <h2 className="min-w-0 truncate text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-full p-1.5 text-muted transition hover:bg-surface-soft hover:text-foreground"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="min-w-0 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
