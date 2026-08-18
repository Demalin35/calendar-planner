import type { Request, Response } from 'express';
import {
  addPushSubscription,
  addRecurrence,
  createReminder,
  deleteReminder,
  getReminder,
  listReminders,
  listPushSubscriptions,
  removePushSubscription,
  updateReminder,
  validateReminderInput,
} from './db.js';
import { getVapidPublicKey, isPushConfigured } from './push.js';
import { normalizeReminder } from './schedule.js';
import type {
  CompleteReminderResponse,
  CreateReminderBody,
  PushSubscribeBody,
  UpdateReminderBody,
} from './types.js';

const DEVICE_HEADER = 'x-device-id';
const DEVICE_ID_RE = /^[a-zA-Z0-9-]{8,64}$/;

function getDeviceId(req: Request, res: Response): string | null {
  const deviceId = req.header(DEVICE_HEADER)?.trim();
  if (!deviceId || !DEVICE_ID_RE.test(deviceId)) {
    res.status(400).json({ error: 'Valid X-Device-Id header is required' });
    return null;
  }
  return deviceId;
}

export function getReminders(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;
  res.json({ reminders: listReminders(deviceId) });
}

export function postReminder(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const body = req.body as CreateReminderBody;
  const validationError = validateReminderInput(body);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const reminder = createReminder(deviceId, body);
  res.status(201).json({ reminder });
}

export function putReminder(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const body = req.body as UpdateReminderBody;
  if (body.title !== undefined || body.dueDate !== undefined) {
    const existing = getReminder(deviceId, req.params.id);
    if (!existing) {
      res.status(404).json({ error: 'Reminder not found' });
      return;
    }
    const validationError = validateReminderInput({
      title: body.title ?? existing.title,
      emoji: body.emoji ?? existing.emoji,
      dueDate: body.dueDate ?? existing.dueDate,
      recurrence: body.recurrence ?? existing.recurrence,
      notifyDaysBefore: body.notifyDaysBefore ?? existing.notifyDaysBefore,
      notifyTime: body.notifyTime ?? existing.notifyTime,
      timeZone: existing.timeZone,
    });
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }
  }

  const reminder = updateReminder(deviceId, req.params.id, body);
  if (!reminder) {
    res.status(404).json({ error: 'Reminder not found' });
    return;
  }
  res.json({ reminder });
}

export function deleteReminderHandler(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const deleted = deleteReminder(deviceId, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: 'Reminder not found' });
    return;
  }
  res.status(204).send();
}

export function completeReminder(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const existing = getReminder(deviceId, req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Reminder not found' });
    return;
  }

  const reminder = updateReminder(deviceId, req.params.id, {
    completed: true,
  });
  if (!reminder) {
    res.status(404).json({ error: 'Reminder not found' });
    return;
  }

  const response: CompleteReminderResponse = { reminder };

  if (existing.recurrence !== 'once') {
    const nextDueDate = addRecurrence(existing.dueDate, existing.recurrence);
    if (nextDueDate) {
      const normalized = normalizeReminder(existing);
      response.suggestNext = {
        title: normalized.title,
        emoji: normalized.emoji,
        dueDate: nextDueDate,
        recurrence: normalized.recurrence,
        notifyDaysBefore: normalized.notifyDaysBefore,
        notifyTime: normalized.notifyTime!,
        timeZone: normalized.timeZone!,
      };
    }
  }

  res.json(response);
}

export function getVapidPublicKeyHandler(_req: Request, res: Response) {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    res.status(503).json({ error: 'Push notifications are not configured' });
    return;
  }
  res.json({ publicKey });
}

export function getPushSubscriptionStatus(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const subscriptions = listPushSubscriptions(deviceId);
  res.json({
    subscribed: subscriptions.length > 0,
    pushConfigured: isPushConfigured(),
  });
}

export function subscribePush(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const body = req.body as PushSubscribeBody;
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    res.status(400).json({ error: 'Invalid push subscription payload' });
    return;
  }

  const subscription = addPushSubscription(
    deviceId,
    body.endpoint,
    body.keys.p256dh,
    body.keys.auth,
  );
  res.status(201).json({ subscription });
}

export function unsubscribePush(req: Request, res: Response) {
  const deviceId = getDeviceId(req, res);
  if (!deviceId) return;

  const endpoint = (req.body as { endpoint?: string })?.endpoint?.trim();
  if (!endpoint) {
    res.status(400).json({ error: 'endpoint is required' });
    return;
  }

  removePushSubscription(deviceId, endpoint);
  res.status(204).send();
}
