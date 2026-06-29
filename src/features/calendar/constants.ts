export const EVENT_COLORS = [
  { id: 'sky', value: '#7CB9E8', label: 'Sky' },
  { id: 'lavender', value: '#C4B5FD', label: 'Lavender' },
  { id: 'rose', value: '#F9A8D4', label: 'Rose' },
  { id: 'mint', value: '#86EFAC', label: 'Mint' },
  { id: 'peach', value: '#FDBA74', label: 'Peach' },
  { id: 'lemon', value: '#FDE047', label: 'Lemon' },
] as const;

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].value;

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;
export const HOUR_HEIGHT_PX = 64;
