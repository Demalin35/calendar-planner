import webpush from 'web-push';
import {
  listPushSubscriptions,
  listRemindersDueForNotification,
  markNotificationSent,
  wasNotificationSentForReminder,
} from './db.js';
import { getNotificationSentKey, normalizeReminder } from './schedule.js';
import type { ReminderRecord } from './types.js';

let configured = false;

export function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() || 'mailto:reminders@calendar-planner.local';

  if (!publicKey || !privateKey) {
    console.warn(
      '[reminders] VAPID keys missing — push notifications are disabled.',
    );
    configured = false;
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export function isPushConfigured(): boolean {
  return configured;
}

function formatNotificationBody(reminder: ReminderRecord): string {
  const dueLabel = reminder.dueDate;
  if (reminder.notifyDaysBefore === 0) {
    return `Due today (${dueLabel}).`;
  }
  return `Due on ${dueLabel}.`;
}

export async function sendReminderPush(
  deviceId: string,
  reminder: ReminderRecord,
): Promise<boolean> {
  if (!configured) return false;

  const subscriptions = listPushSubscriptions(deviceId);
  if (subscriptions.length === 0) return false;

  const payload = JSON.stringify({
    title: `${reminder.emoji ? `${reminder.emoji} ` : ''}${reminder.title}`,
    body: formatNotificationBody(reminder),
    url: `/?view=reminders&reminderId=${encodeURIComponent(reminder.id)}`,
  });

  let anySuccess = false;
  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          payload,
        );
        anySuccess = true;
      } catch {
        console.error('[reminders] push delivery failed');
      }
    }),
  );

  return anySuccess;
}

export async function processDueReminderNotifications() {
  if (!configured) return;

  const now = new Date();
  const dueReminders = listRemindersDueForNotification(now);

  for (const reminder of dueReminders) {
    if (wasNotificationSentForReminder(reminder)) continue;

    const sent = await sendReminderPush(reminder.deviceId, reminder);
    if (sent) {
      const normalized = normalizeReminder(reminder);
      markNotificationSent(reminder.id, getNotificationSentKey(normalized));
    }
  }
}

export function startReminderScheduler() {
  if (!configureWebPush()) return;

  const intervalMs = 60_000;
  void processDueReminderNotifications();
  setInterval(() => {
    void processDueReminderNotifications();
  }, intervalMs);

  console.log('[reminders] notification scheduler started');
}
