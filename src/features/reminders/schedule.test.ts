import { describe, expect, it } from 'vitest';
import {
  DEFAULT_NOTIFY_TIME,
  DEFAULT_TIME_ZONE,
  getNotificationSentKey,
  getScheduledNotifyDate,
  isValidIanaTimeZone,
  normalizeReminder,
  subtractDays,
} from '../../../server/reminders/schedule.js';
import type { ReminderRecord } from '../../../server/reminders/types.js';

function makeReminder(
  overrides: Partial<ReminderRecord> = {},
): ReminderRecord {
  return {
    id: 'test-id',
    deviceId: 'device-12345678',
    title: 'Test',
    dueDate: '2026-08-30',
    recurrence: 'once',
    notifyDaysBefore: 3,
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('reminder schedule', () => {
  it('defaults missing notify time and timezone for old reminders', () => {
    const normalized = normalizeReminder(makeReminder());
    expect(normalized.notifyTime).toBe(DEFAULT_NOTIFY_TIME);
    expect(normalized.timeZone).toBe(DEFAULT_TIME_ZONE);
  });

  it('validates IANA timezones', () => {
    expect(isValidIanaTimeZone('Europe/Sofia')).toBe(true);
    expect(isValidIanaTimeZone('America/New_York')).toBe(true);
    expect(isValidIanaTimeZone('Not/A_Timezone')).toBe(false);
  });

  it('subtracts calendar days from due date', () => {
    expect(subtractDays('2026-08-30', 3)).toBe('2026-08-27');
  });

  it('schedules notification at local time in the reminder timezone', () => {
    const reminder = makeReminder({
      dueDate: '2026-08-30',
      notifyDaysBefore: 3,
      notifyTime: '09:00',
      timeZone: 'Europe/Sofia',
    });

    const scheduled = getScheduledNotifyDate(reminder);
    expect(scheduled.toISOString()).toBe('2026-08-27T06:00:00.000Z');
  });

  it('uses a stable sent key based on the scheduled instant', () => {
    const reminder = makeReminder({
      dueDate: '2026-08-30',
      notifyDaysBefore: 3,
      notifyTime: '09:00',
      timeZone: 'Europe/Sofia',
    });

    expect(getNotificationSentKey(reminder)).toBe('2026-08-27T06:00:00.000Z');
  });
});
