export const EVENT_COLORS = [
  { id: 'dusty-pink', value: '#F3C7D9', label: 'Dusty pink' },
  { id: 'soft-rose', value: '#F6D4DF', label: 'Soft rose' },
  { id: 'muted-lavender', value: '#DCCFEA', label: 'Muted lavender' },
  { id: 'soft-lilac', value: '#E6DDF2', label: 'Soft lilac' },
  { id: 'pale-mint', value: '#D9EFD8', label: 'Pale mint' },
  { id: 'soft-green', value: '#CFE8CE', label: 'Soft green' },
  { id: 'muted-aqua', value: '#CDECEE', label: 'Muted aqua' },
  { id: 'pale-blue', value: '#D7EAF5', label: 'Pale blue' },
  { id: 'warm-cream', value: '#F7E7C6', label: 'Warm cream' },
  { id: 'muted-peach', value: '#F4D6C8', label: 'Muted peach' },
] as const;

export const ITEM_COLORS = EVENT_COLORS;

export const DEFAULT_EVENT_COLOR = '#D7EAF5';

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;
export const HOUR_HEIGHT_PX = 64;

export const MIN_TIMED_EVENT_HEIGHT_DESKTOP = 56;
export const MIN_TIMED_EVENT_HEIGHT_MOBILE = 68;
