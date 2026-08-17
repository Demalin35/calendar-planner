import { getDeviceId } from './deviceId';
import type {
  CompleteReminderResult,
  Reminder,
  ReminderDraft,
} from './types';

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'X-Device-Id': getDeviceId(),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function fetchReminders(): Promise<Reminder[]> {
  const data = await request<{ reminders: Reminder[] }>('/api/reminders');
  return data.reminders;
}

export async function createReminderApi(
  payload: ReminderDraft,
): Promise<Reminder> {
  const data = await request<{ reminder: Reminder }>('/api/reminders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.reminder;
}

export async function updateReminderApi(
  id: string,
  payload: Partial<ReminderDraft> & { completed?: boolean },
): Promise<Reminder> {
  const data = await request<{ reminder: Reminder }>(`/api/reminders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return data.reminder;
}

export async function deleteReminderApi(id: string): Promise<void> {
  await request<void>(`/api/reminders/${id}`, { method: 'DELETE' });
}

export async function completeReminderApi(
  id: string,
): Promise<CompleteReminderResult> {
  return request<CompleteReminderResult>(`/api/reminders/${id}/complete`, {
    method: 'POST',
  });
}

export async function fetchVapidPublicKey(): Promise<string> {
  const data = await request<{ publicKey: string }>(
    '/api/reminders/push/vapid-public-key',
  );
  return data.publicKey;
}

export async function subscribePushApi(subscription: PushSubscriptionJSON) {
  await request('/api/reminders/push/subscribe', {
    method: 'POST',
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    }),
  });
}
