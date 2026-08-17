export const DEFAULT_NOTIFY_TIME = '09:00';

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function formatNotifyTimeDisplay(notifyTime: string | undefined): string {
  return notifyTime ?? DEFAULT_NOTIFY_TIME;
}
