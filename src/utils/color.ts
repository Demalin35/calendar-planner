import {
  DEFAULT_EVENT_COLOR,
  EVENT_COLORS,
} from '../features/calendar/constants';
import type { AppTheme } from '../types/theme';

const DARK_TEXT = '#111827';
const LIGHT_TEXT = '#F9FAFB';

export interface ItemColorStyle {
  backgroundColor: string;
  borderColor: string;
  color: string;
}

export function parseHexColor(
  hex: string,
): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '').trim();
  if (normalized.length === 3) {
    return {
      r: Number.parseInt(normalized[0] + normalized[0], 16),
      g: Number.parseInt(normalized[1] + normalized[1], 16),
      b: Number.parseInt(normalized[2] + normalized[2], 16),
    };
  }
  if (normalized.length === 6) {
    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }
  return null;
}

function colorDistance(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

export function normalizeItemColor(color: string): string {
  const rgb = parseHexColor(color);
  if (!rgb) return DEFAULT_EVENT_COLOR;

  const exact = EVENT_COLORS.find(
    (entry) => entry.value.toLowerCase() === color.toLowerCase(),
  );
  if (exact) return exact.value;

  let closest: string = DEFAULT_EVENT_COLOR;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const entry of EVENT_COLORS) {
    const paletteRgb = parseHexColor(entry.value);
    if (!paletteRgb) continue;

    const distance = colorDistance(rgb, paletteRgb);
    if (distance < minDistance) {
      minDistance = distance;
      closest = entry.value;
    }
  }

  return closest;
}

export function getReadableTextColor(baseColor: string): string {
  const rgb = parseHexColor(normalizeItemColor(baseColor));
  if (!rgb) return DARK_TEXT;

  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 145 ? DARK_TEXT : LIGHT_TEXT;
}

export function getItemColorStyle(
  color: string,
  theme: AppTheme,
): ItemColorStyle {
  const base = normalizeItemColor(color);
  const rgb = parseHexColor(base);
  if (!rgb) {
    return {
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      color: DARK_TEXT,
    };
  }

  const backgroundAlpha = theme === 'day' ? 0.9 : 0.88;
  const borderAlpha = theme === 'day' ? 0.98 : 0.95;

  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${backgroundAlpha})`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${borderAlpha})`,
    color: getReadableTextColor(base),
  };
}
