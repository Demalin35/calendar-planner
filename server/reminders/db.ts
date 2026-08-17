import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import type {
  CreateReminderBody,
  PushSubscriptionRecord,
  ReminderRecord,
  ReminderRecurrence,
  UpdateReminderBody,
} from './types.js';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_RECURRENCE = new Set<ReminderRecurrence>([
  'once',
  'monthly',
  'yearly',
]);
const VALID_NOTIFY_DAYS = new Set([0, 1, 3, 7]);

let db: Database.Database | null = null;

function resolveDbPath(): string {
  const configured = process.env.REMINDERS_DB_PATH?.trim();
  if (configured) return configured;
  return path.resolve(process.cwd(), 'data', 'reminders.db');
}

export function getRemindersDb(): Database.Database {
  if (db) return db;

  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  initializeSchema(db);
  return db;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      title TEXT NOT NULL,
      emoji TEXT,
      due_date TEXT NOT NULL,
      recurrence TEXT NOT NULL,
      notify_days_before INTEGER NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_reminders_device_id ON reminders(device_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_due_date ON reminders(due_date);

    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      endpoint TEXT NOT NULL UNIQUE,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_push_subscriptions_device_id
      ON push_subscriptions(device_id);

    CREATE TABLE IF NOT EXISTS notification_sent (
      reminder_id TEXT NOT NULL,
      notify_on TEXT NOT NULL,
      PRIMARY KEY (reminder_id, notify_on)
    );
  `);
}

function mapReminder(row: Record<string, unknown>): ReminderRecord {
  return {
    id: String(row.id),
    deviceId: String(row.device_id),
    title: String(row.title),
    emoji: row.emoji ? String(row.emoji) : undefined,
    dueDate: String(row.due_date),
    recurrence: String(row.recurrence) as ReminderRecurrence,
    notifyDaysBefore: Number(row.notify_days_before),
    completed: Boolean(row.completed),
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
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
  return null;
}

export function listReminders(deviceId: string): ReminderRecord[] {
  const rows = getRemindersDb()
    .prepare(
      `SELECT * FROM reminders
       WHERE device_id = ?
       ORDER BY completed ASC, due_date ASC, title ASC`,
    )
    .all(deviceId) as Record<string, unknown>[];

  return rows.map(mapReminder);
}

export function getReminder(
  deviceId: string,
  id: string,
): ReminderRecord | null {
  const row = getRemindersDb()
    .prepare('SELECT * FROM reminders WHERE id = ? AND device_id = ?')
    .get(id, deviceId) as Record<string, unknown> | undefined;

  return row ? mapReminder(row) : null;
}

export function createReminder(
  deviceId: string,
  body: CreateReminderBody,
): ReminderRecord {
  const now = new Date().toISOString();
  const id = randomUUID();
  getRemindersDb()
    .prepare(
      `INSERT INTO reminders (
        id, device_id, title, emoji, due_date, recurrence,
        notify_days_before, completed, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    )
    .run(
      id,
      deviceId,
      body.title.trim(),
      body.emoji?.trim() || null,
      body.dueDate,
      body.recurrence,
      body.notifyDaysBefore,
      now,
      now,
    );

  return getReminder(deviceId, id)!;
}

export function updateReminder(
  deviceId: string,
  id: string,
  body: UpdateReminderBody,
): ReminderRecord | null {
  const existing = getReminder(deviceId, id);
  if (!existing) return null;

  const next = {
    title: body.title?.trim() ?? existing.title,
    emoji: body.emoji !== undefined ? body.emoji.trim() || undefined : existing.emoji,
    dueDate: body.dueDate ?? existing.dueDate,
    recurrence: body.recurrence ?? existing.recurrence,
    notifyDaysBefore: body.notifyDaysBefore ?? existing.notifyDaysBefore,
    completed: body.completed ?? existing.completed,
    completedAt:
      body.completed === true
        ? new Date().toISOString()
        : body.completed === false
          ? undefined
          : existing.completedAt,
  };

  if (validateReminderInput(next)) return null;

  getRemindersDb()
    .prepare(
      `UPDATE reminders SET
        title = ?, emoji = ?, due_date = ?, recurrence = ?,
        notify_days_before = ?, completed = ?, completed_at = ?,
        updated_at = ?
      WHERE id = ? AND device_id = ?`,
    )
    .run(
      next.title,
      next.emoji ?? null,
      next.dueDate,
      next.recurrence,
      next.notifyDaysBefore,
      next.completed ? 1 : 0,
      next.completedAt ?? null,
      new Date().toISOString(),
      id,
      deviceId,
    );

  return getReminder(deviceId, id);
}

export function deleteReminder(deviceId: string, id: string): boolean {
  const result = getRemindersDb()
    .prepare('DELETE FROM reminders WHERE id = ? AND device_id = ?')
    .run(id, deviceId);
  return result.changes > 0;
}

export function addPushSubscription(
  deviceId: string,
  endpoint: string,
  p256dh: string,
  auth: string,
): PushSubscriptionRecord {
  const now = new Date().toISOString();
  const id = randomUUID();
  getRemindersDb()
    .prepare(
      `INSERT INTO push_subscriptions (id, device_id, endpoint, p256dh, auth, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(endpoint) DO UPDATE SET
         device_id = excluded.device_id,
         p256dh = excluded.p256dh,
         auth = excluded.auth,
         created_at = excluded.created_at`,
    )
    .run(id, deviceId, endpoint, p256dh, auth, now);

  return {
    id,
    deviceId,
    endpoint,
    p256dh,
    auth,
    createdAt: now,
  };
}

export function listPushSubscriptions(deviceId: string): PushSubscriptionRecord[] {
  const rows = getRemindersDb()
    .prepare('SELECT * FROM push_subscriptions WHERE device_id = ?')
    .all(deviceId) as Record<string, unknown>[];

  return rows.map((row) => ({
    id: String(row.id),
    deviceId: String(row.device_id),
    endpoint: String(row.endpoint),
    p256dh: String(row.p256dh),
    auth: String(row.auth),
    createdAt: String(row.created_at),
  }));
}

export function removePushSubscription(deviceId: string, endpoint: string): boolean {
  const result = getRemindersDb()
    .prepare(
      'DELETE FROM push_subscriptions WHERE device_id = ? AND endpoint = ?',
    )
    .run(deviceId, endpoint);
  return result.changes > 0;
}

export function listDueNotificationCandidates(today: string): ReminderRecord[] {
  const rows = getRemindersDb()
    .prepare(
      `SELECT * FROM reminders
       WHERE completed = 0`,
    )
    .all() as Record<string, unknown>[];

  return rows
    .map(mapReminder)
    .filter((reminder) => {
      const notifyOn = subtractDays(reminder.dueDate, reminder.notifyDaysBefore);
      return notifyOn === today;
    });
}

export function markNotificationSent(reminderId: string, notifyOn: string) {
  getRemindersDb()
    .prepare(
      `INSERT OR IGNORE INTO notification_sent (reminder_id, notify_on)
       VALUES (?, ?)`,
    )
    .run(reminderId, notifyOn);
}

export function wasNotificationSent(
  reminderId: string,
  notifyOn: string,
): boolean {
  const row = getRemindersDb()
    .prepare(
      `SELECT 1 FROM notification_sent
       WHERE reminder_id = ? AND notify_on = ?`,
    )
    .get(reminderId, notifyOn);
  return Boolean(row);
}

export function subtractDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
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
  return resolveDbPath();
}
