import clsx from 'clsx';
import type { ComponentProps, CSSProperties } from 'react';
import { themeClasses } from '../constants/theme';
import { EVENT_COLORS } from '../features/calendar/constants';
import { useUIStore } from '../store/uiStore';
import { getItemColorStyle, normalizeItemColor } from '../utils/color';

interface ColorSwatchPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatchPicker({ value, onChange }: ColorSwatchPickerProps) {
  const theme = useUIStore((s) => s.theme);
  const normalizedValue = normalizeItemColor(value);

  return (
    <div className="flex min-w-0 flex-wrap gap-2">
      {EVENT_COLORS.map((color) => {
        const isSelected = normalizedValue === color.value;
        const swatchStyle = getItemColorStyle(color.value, theme);

        return (
          <button
            key={color.id}
            type="button"
            onClick={() => onChange(color.value)}
            className={clsx(
              'h-9 w-9 rounded-full border transition',
              isSelected
                ? clsx(
                    themeClasses.colorRingActive,
                    'scale-110 ring-2 ring-offset-2 ring-offset-surface',
                  )
                : 'hover:scale-105',
            )}
            style={{
              backgroundColor: swatchStyle.backgroundColor,
              borderColor: swatchStyle.borderColor,
            }}
            aria-label={color.label}
            aria-pressed={isSelected}
          />
        );
      })}
    </div>
  );
}

interface PastelChipProps extends ComponentProps<'button'> {
  color: string;
}

export function PastelChip({
  color,
  className,
  style,
  children,
  type = 'button',
  ...rest
}: PastelChipProps) {
  const theme = useUIStore((s) => s.theme);
  const chipStyle = getItemColorStyle(color, theme);

  const mergedStyle: CSSProperties = {
    backgroundColor: chipStyle.backgroundColor,
    borderColor: chipStyle.borderColor,
    color: chipStyle.color,
    borderWidth: 1,
    borderStyle: 'solid',
    ...style,
  };

  return (
    <button
      type={type}
      style={mergedStyle}
      className={clsx('transition hover:brightness-[0.98]', className)}
      {...rest}
    >
      {children}
    </button>
  );
}
