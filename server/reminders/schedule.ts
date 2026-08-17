import { fromZonedTime } from 'date-fns-tz';
import type { ReminderRecord } from './types.js';

export const DEFAULT_NOTIFY_TIME = '09:00';
export const DEFAULT_TIME_ZONE = 'UTC';
export const NOTIFY_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidIanaTimeZone(timeZone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function subtractDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function normalizeReminder(reminder: ReminderRecord): ReminderRecord {
  return {
    ...reminder,
    notifyTime: reminder.notifyTime ?? DEFAULT_NOTIFY_TIME,
    timeZone: reminder.timeZone ?? DEFAULT_TIME_ZONE,
  };
}

export function getScheduledNotifyDate(reminder: ReminderRecord): Date {
  const normalized = normalizeReminder(reminder);
  const notifyDate = subtractDays(
    normalized.dueDate,
    normalized.notifyDaysBefore,
  );
  const notifyTime = normalized.notifyTime ?? DEFAULT_NOTIFY_TIME;
  const timeZone = normalized.timeZone ?? DEFAULT_TIME_ZONE;
  return fromZonedTime(`${notifyDate}T${notifyTime}:00`, timeZone);
}

export function getNotificationSentKey(reminder: ReminderRecord): string {
  return getScheduledNotifyDate(reminder).toISOString();
}

export function getLegacyNotificationSentKey(reminder: ReminderRecord): string {
  const normalized = normalizeReminder(reminder);
  return subtractDays(normalized.dueDate, normalized.notifyDaysBefore);
}
