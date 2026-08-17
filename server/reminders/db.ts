import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type {
  CreateReminderBody,
  PushSubscriptionRecord,
  ReminderRecord,
  ReminderRecurrence,
  UpdateReminderBody,
} from './types.js';
import {
  DEFAULT_NOTIFY_TIME,
  DEFAULT_TIME_ZONE,
  NOTIFY_TIME_RE,
  getLegacyNotificationSentKey,
  getNotificationSentKey,
  getScheduledNotifyDate,
  isValidIanaTimeZone,
  normalizeReminder,
} from './schedule.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_RECURRENCE = new Set<ReminderRecurrence>([
  'once',
  'monthly',
  'yearly',
]);
const VALID_NOTIFY_DAYS = new Set([0, 1, 3, 7]);

interface RemindersStoreData {
  reminders: ReminderRecord[];
  pushSubscriptions: PushSubscriptionRecord[];
  notificationSent: Array<{ reminderId: string; notifyOn: string }>;
}

let store: RemindersStoreData | null = null;
let storePath = '';

function resolveStorePath(): string {
  const configured =
    process.env.REMINDERS_DATA_PATH?.trim() ||
    process.env.REMINDERS_DB_PATH?.trim();
  if (configured) {
    return configured.endsWith('.json')
      ? configured
      : `${configured}.json`;
  }
  return path.resolve(process.cwd(), 'data', 'reminders.json');
}

function emptyStore(): RemindersStoreData {
  return {
    reminders: [],
    pushSubscriptions: [],
    notificationSent: [],
  };
}

function loadStoreFromDisk(): RemindersStoreData {
  if (!fs.existsSync(storePath)) {
    return emptyStore();
  }
  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<RemindersStoreData>;
    return {
      reminders: Array.isArray(parsed.reminders) ? parsed.reminders : [],
      pushSubscriptions: Array.isArray(parsed.pushSubscriptions)
        ? parsed.pushSubscriptions
        : [],
      notificationSent: Array.isArray(parsed.notificationSent)
        ? parsed.notificationSent
        : [],
    };
  } catch {
    return emptyStore();
  }
}

function persistStore() {
  if (!store) return;
  fs.mkdirSync(path.dirname(storePath), { recursive: true });
  const tempPath = `${storePath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tempPath, storePath);
}

function getStore(): RemindersStoreData {
  if (!store) {
    storePath = resolveStorePath();
    store = loadStoreFromDisk();
  }
  return store;
}

export function getRemindersDb(): RemindersStoreData {
  return getStore();
}

export function validateReminderInput(body: CreateReminderBody): string | null {
  if (!body.title?.trim()) return 'title is required';
  if (body.title.trim().length > 200) return 'title is too long';
  if (!body.dueDate || !DATE_RE.test(body.dueDate)) {
    return 'dueDate must be yyyy-MM-dd';
  }
  if (!VALID_RECURRENCE.has(body.recurrence)) return 'invalid recurrence';
  if (!VALID_NOTIFY_DAYS.has(body.notifyDaysBefore)) {
    return 'invalid notifyDaysBefore';
  }
  const notifyTime = body.notifyTime ?? DEFAULT_NOTIFY_TIME;
  if (!NOTIFY_TIME_RE.test(notifyTime)) return 'invalid notifyTime';
  const timeZone = body.timeZone ?? DEFAULT_TIME_ZONE;
  if (!isValidIanaTimeZone(timeZone)) return 'invalid timeZone';
  return null;
}

export function listReminders(deviceId: string): ReminderRecord[] {
  return getStore()
    .reminders.filter((reminder) => reminder.deviceId === deviceId)
    .map(normalizeReminder)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.title.localeCompare(b.title);
    });
}

export function getReminder(
  deviceId: string,
  id: string,
): ReminderRecord | null {
  const reminder =
    getStore().reminders.find(
      (entry) => entry.id === id && entry.deviceId === deviceId,
    ) ?? null;
  return reminder ? normalizeReminder(reminder) : null;
}

export function createReminder(
  deviceId: string,
  body: CreateReminderBody,
): ReminderRecord {
  const now = new Date().toISOString();
  const reminder: ReminderRecord = {
    id: randomUUID(),
    deviceId,
    title: body.title.trim(),
    emoji: body.emoji?.trim() || undefined,
    dueDate: body.dueDate,
    recurrence: body.recurrence,
    notifyDaysBefore: body.notifyDaysBefore,
    notifyTime: body.notifyTime ?? DEFAULT_NOTIFY_TIME,
    timeZone: body.timeZone ?? DEFAULT_TIME_ZONE,
    completed: false,
    createdAt: now,
    updatedAt: now,
  };

  getStore().reminders.push(reminder);
  persistStore();
  return normalizeReminder(reminder);
}

export function updateReminder(
  deviceId: string,
  id: string,
  body: UpdateReminderBody,
): ReminderRecord | null {
  const data = getStore();
  const index = data.reminders.findIndex(
    (reminder) => reminder.id === id && reminder.deviceId === deviceId,
  );
  if (index === -1) return null;

  const existing = data.reminders[index];
  const next = {
    title: body.title?.trim() ?? existing.title,
    emoji:
      body.emoji !== undefined ? body.emoji.trim() || undefined : existing.emoji,
    dueDate: body.dueDate ?? existing.dueDate,
    recurrence: body.recurrence ?? existing.recurrence,
    notifyDaysBefore: body.notifyDaysBefore ?? existing.notifyDaysBefore,
    notifyTime: body.notifyTime ?? existing.notifyTime,
    timeZone: existing.timeZone,
    completed: body.completed ?? existing.completed,
    completedAt:
      body.completed === true
        ? new Date().toISOString()
        : body.completed === false
          ? undefined
          : existing.completedAt,
  };

  if (validateReminderInput(next)) return null;

  data.reminders[index] = {
    ...existing,
    ...next,
    updatedAt: new Date().toISOString(),
  };
  persistStore();
  return normalizeReminder(data.reminders[index]);
}

export function deleteReminder(deviceId: string, id: string): boolean {
  const data = getStore();
  const before = data.reminders.length;
  data.reminders = data.reminders.filter(
    (reminder) => !(reminder.id === id && reminder.deviceId === deviceId),
  );
  if (data.reminders.length === before) return false;
  data.notificationSent = data.notificationSent.filter(
    (entry) => entry.reminderId !== id,
  );
  persistStore();
  return true;
}

export function addPushSubscription(
  deviceId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): PushSubscriptionRecord {
  const now = new Date().toISOString();
  const data = getStore();
  const existingIndex = data.pushSubscriptions.findIndex(
    (subscription) => subscription.endpoint === endpoint,
  );

  const record: PushSubscriptionRecord = {
    id: existingIndex >= 0 ? data.pushSubscriptions[existingIndex].id : randomUUID(),
    deviceId,
    endpoint,
    p256dh,
    auth,
    createdAt: now,
  };

  if (existingIndex >= 0) {
    data.pushSubscriptions[existingIndex] = record;
  } else {
    data.pushSubscriptions.push(record);
  }

  persistStore();
  return record;
}

export function listPushSubscriptions(
  deviceId: string,
): PushSubscriptionRecord[] {
  return getStore().pushSubscriptions.filter(
    (subscription) => subscription.deviceId === deviceId,
  );
}

export function removePushSubscription(
  deviceId: string,
  endpoint: string,
): boolean {
  const data = getStore();
  const before = data.pushSubscriptions.length;
  data.pushSubscriptions = data.pushSubscriptions.filter(
    (subscription) =>
      !(subscription.deviceId === deviceId && subscription.endpoint === endpoint),
  );
  if (data.pushSubscriptions.length === before) return false;
  persistStore();
  return true;
}

export function listRemindersDueForNotification(now: Date): ReminderRecord[] {
  return getStore()
    .reminders.filter((reminder) => !reminder.completed)
    .map(normalizeReminder)
    .filter((reminder) => getScheduledNotifyDate(reminder).getTime() <= now.getTime());
}

export function wasNotificationSentForReminder(
  reminder: ReminderRecord,
): boolean {
  const normalized = normalizeReminder(reminder);
  const key = getNotificationSentKey(normalized);
  if (wasNotificationSent(reminder.id, key)) return true;
  const legacyKey = getLegacyNotificationSentKey(normalized);
  return wasNotificationSent(reminder.id, legacyKey);
}

export function markNotificationSent(reminderId: string, notifyOn: string) {
  const data = getStore();
  const exists = data.notificationSent.some(
    (entry) => entry.reminderId === reminderId && entry.notifyOn === notifyOn,
  );
  if (exists) return;
  data.notificationSent.push({ reminderId, notifyOn });
  persistStore();
}

export function wasNotificationSent(
  reminderId: string,
  notifyOn: string,
): boolean {
  return getStore().notificationSent.some(
    (entry) => entry.reminderId === reminderId && entry.notifyOn === notifyOn,
  );
}

export function addRecurrence(
  dateKey: string,
  recurrence: ReminderRecurrence,
): string | null {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (recurrence === 'monthly') {
    date.setUTCMonth(date.getUTCMonth() + 1);
  } else if (recurrence === 'yearly') {
    date.setUTCFullYear(date.getUTCFullYear() + 1);
  } else {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

export function getDbPathForLogging(): string {
  if (!storePath) {
    storePath = resolveStorePath();
  }
  return storePath;
}
