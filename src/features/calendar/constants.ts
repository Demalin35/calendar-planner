export const EVENT_COLORS = [
  { id: 'blue', value: '#BFDBFE', label: 'Blue' },
  { id: 'purple', value: '#DDD6FE', label: 'Purple' },
  { id: 'pink', value: '#FBCFE8', label: 'Pink' },
  { id: 'green', value: '#BBF7D0', label: 'Green' },
  { id: 'yellow', value: '#FEF3C7', label: 'Yellow' },
  { id: 'orange', value: '#FED7AA', label: 'Orange' },
] as const;

export const DEFAULT_EVENT_COLOR = EVENT_COLORS[0].value;

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DAY_START_HOUR = 6;
export const DAY_END_HOUR = 23;
export const HOUR_HEIGHT_PX = 64;
