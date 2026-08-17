import webpush from 'web-push';
import {
  listDueNotificationCandidates,
  listPushSubscriptions,
  markNotificationSent,
  wasNotificationSent,
} from './db.js';
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
): Promise<void> {
  if (!configured) return;

  const subscriptions = listPushSubscriptions(deviceId);
  if (subscriptions.length === 0) return;

  const payload = JSON.stringify({
    title: `${reminder.emoji ? `${reminder.emoji} ` : ''}${reminder.title}`,
    body: formatNotificationBody(reminder),
    url: `/?view=reminders&reminderId=${encodeURIComponent(reminder.id)}`,
  });

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
      } catch (error) {
        console.error('[reminders] push delivery failed');
      }
    }),
  );
}

export async function processDueReminderNotifications() {
  if (!configured) return;

  const today = new Date().toISOString().slice(0, 10);
  const dueReminders = listDueNotificationCandidates(today);

  for (const reminder of dueReminders) {
    const notifyOn = today;
    if (wasNotificationSent(reminder.id, notifyOn)) continue;

    await sendReminderPush(reminder.deviceId, reminder);
    markNotificationSent(reminder.id, notifyOn);
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
