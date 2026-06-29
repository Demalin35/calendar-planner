import type { AppTheme } from '../types/theme';

export const THEME_STORAGE_KEY = 'calendar-planner-theme';

export const themeColors = {
  day: {
    appBg: '#F4FAFD',
    surface: '#FFFFFF',
    surfaceSoft: '#F8FCFF',
    primarySoft: '#DFF3FC',
    primary: '#38BDF8',
    primaryStrong: '#0284C7',
    border: '#E5EEF5',
    text: '#111827',
    textMuted: '#6B7280',
    today: '#0EA5E9',
    selectedBg: '#F0F9FF',
    selectedBorder: '#7DD3FC',
  },
  night: {
    appBg: '#111827',
    surface: '#1F2937',
    surfaceSoft: '#273244',
    primarySoft: '#E9D5FF',
    primary: '#C084FC',
    primaryStrong: '#A855F7',
    border: '#374151',
    text: '#F9FAFB',
    textMuted: '#D1D5DB',
    today: '#C084FC',
    selectedBg: '#2D2640',
    selectedBorder: '#A855F7',
  },
} as const;

const transition = 'transition-colors duration-200';

export const themeClasses = {
  page: `min-h-screen w-full overflow-x-hidden bg-app ${transition}`,
  card: `min-w-0 rounded-2xl bg-surface shadow-sm ring-1 ring-border ${transition}`,
  cardHeader: `border-b border-border ${transition}`,
  heading: `font-semibold text-foreground ${transition}`,
  muted: `text-muted ${transition}`,
  nav: `rounded-2xl bg-surface p-1 shadow-sm ring-1 ring-border ${transition}`,
  navTabActive: `bg-primary-soft text-primary-strong ${transition}`,
  navTabInactive: `text-muted hover:bg-surface-soft hover:text-foreground ${transition}`,
  primaryBtn: `rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-strong disabled:opacity-60`,
  primaryBtnSm: `rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-primary-strong`,
  linkBtn: `font-medium text-primary-strong transition-colors duration-200 hover:bg-primary-soft`,
  ghostBtn: `text-muted transition-colors duration-200 hover:bg-surface-soft`,
  input: `rounded-xl border border-border bg-surface px-3 py-2.5 text-sm text-foreground outline-none transition-colors duration-200 focus:border-primary focus:ring-2 focus:ring-primary-soft`,
  selectedDay: `bg-selected ring-1 ring-inset ring-selected-border ${transition}`,
  todayCircle: `bg-today text-white ${transition}`,
  colorRingActive: 'ring-primary-strong',
  themeToggle: `rounded-xl border border-border bg-surface p-2 text-muted transition-colors duration-200 hover:bg-surface-soft hover:text-foreground`,
} as const;

export function applyTheme(theme: AppTheme) {
  document.documentElement.setAttribute('data-theme', theme);
}

export function getStoredTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    return saved === 'night' ? 'night' : 'day';
  } catch {
    return 'day';
  }
}

export function persistTheme(theme: AppTheme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // ignore storage errors
  }
}
