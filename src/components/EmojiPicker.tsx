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
            ? 'border-sky-200 bg-sky-50 text-gray-900'
            : 'border-gray-200 bg-gray-50 text-gray-400 hover:border-sky-200 hover:bg-sky-50/60',
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
        <div className="absolute left-0 top-full z-30 mt-1.5 w-[min(17rem,calc(100vw-2.5rem))] rounded-xl border border-gray-100 bg-white p-2.5 shadow-lg ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-gray-500">Pick emoji</span>
            {value && (
              <button
                type="button"
                onClick={clearEmoji}
                className="text-xs font-medium text-gray-500 transition hover:text-gray-700"
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
                    ? 'bg-sky-100 ring-2 ring-sky-300'
                    : 'hover:bg-gray-100',
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
