export type ReminderRecurrence = 'once' | 'monthly' | 'yearly';

export interface Reminder {
  id: string;
  deviceId: string;
  title: string;
  emoji?: string;
  dueDate: string;
  recurrence: ReminderRecurrence;
  notifyDaysBefore: number;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReminderDraft {
  title: string;
  emoji?: string;
  dueDate: string;
  recurrence: ReminderRecurrence;
  notifyDaysBefore: number;
}

export interface CompleteReminderResult {
  reminder: Reminder;
  suggestNext?: ReminderDraft;
}
