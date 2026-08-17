export type ReminderRecurrence = 'once' | 'monthly' | 'yearly';

export interface ReminderRecord {
  id: string;
  deviceId: string;
  title: string;
  emoji?: string;
  dueDate: string;
  recurrence: ReminderRecurrence;
  notifyDaysBefore: number;
  notifyTime?: string;
  timeZone?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PushSubscriptionRecord {
  id: string;
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: string;
}

export interface CreateReminderBody {
  title: string;
  emoji?: string;
  dueDate: string;
  recurrence: ReminderRecurrence;
  notifyDaysBefore: number;
  notifyTime?: string;
  timeZone?: string;
}

export interface UpdateReminderBody extends Partial<CreateReminderBody> {
  completed?: boolean;
}

export interface PushSubscribeBody {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface CompleteReminderResponse {
  reminder: ReminderRecord;
  suggestNext?: {
    title: string;
    emoji?: string;
    dueDate: string;
    recurrence: ReminderRecurrence;
    notifyDaysBefore: number;
    notifyTime: string;
    timeZone: string;
  };
}
