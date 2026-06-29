import clsx from 'clsx';
import { Smile } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PRESET_EMOJIS } from '../constants/emojis';

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const selectEmoji = (emoji: string) => {
    onChange(emoji);
    setOpen(false);
  };

  const clearEmoji = () => {
    onChange('');
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-xl border text-lg transition',
          open || value
            ? 'border-selected-border bg-primary-soft text-foreground'
            : 'border-border bg-surface-soft text-muted hover:border-selected-border hover:bg-primary-soft/60',
        )}
        aria-label={value ? `Selected emoji: ${value}` : 'Choose emoji'}
        aria-expanded={open}
      >
        {value ? (
          <span className="leading-none">{value}</span>
        ) : (
          <Smile size={18} strokeWidth={1.75} />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-1.5 max-w-[calc(100vw-3rem)] rounded-xl border border-border bg-surface p-2.5 shadow-lg ring-1 ring-black/5 sm:w-[17rem]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-muted">Pick emoji</span>
            {value && (
              <button
                type="button"
                onClick={clearEmoji}
                className="text-xs font-medium text-muted transition hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex max-h-44 flex-wrap gap-1 overflow-y-auto">
            {PRESET_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => selectEmoji(emoji)}
                className={clsx(
                  'flex h-8 w-8 items-center justify-center rounded-lg text-base transition',
                  value === emoji
                    ? 'bg-primary-soft ring-2 ring-selected-border'
                    : 'hover:bg-surface-soft',
                )}
                aria-label={`Select ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
