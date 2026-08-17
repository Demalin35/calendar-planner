import type { ReminderDraft, ReminderRecurrence } from './types';

export type RemindersLanguage = 'en' | 'ru';

type RemindersCopyKey =
  | 'reminders'
  | 'newReminder'
  | 'customReminder'
  | 'dueDate'
  | 'repeat'
  | 'once'
  | 'monthly'
  | 'yearly'
  | 'remindMe'
  | 'onDueDate'
  | 'oneDayBefore'
  | 'threeDaysBefore'
  | 'sevenDaysBefore'
  | 'enableNotifications'
  | 'enableNotificationsHint'
  | 'notificationsEnabled'
  | 'notificationsDenied'
  | 'notificationsUnsupported'
  | 'iosInstallForNotifications'
  | 'offline'
  | 'saveError'
  | 'loadError'
  | 'upcoming'
  | 'completed'
  | 'noReminders'
  | 'createFirst'
  | 'add'
  | 'create'
  | 'save'
  | 'delete'
  | 'cancel'
  | 'title'
  | 'activeCount'
  | 'completedLabel'
  | 'reminderCompleted'
  | 'createNext'
  | 'createNextPrompt'
  | 'yes'
  | 'changeDate'
  | 'noThanks'
  | 'presetRent'
  | 'presetHouseBills'
  | 'presetVehicleInspection'
  | 'presetVignette'
  | 'presetCarInsurance'
  | 'presetSubscription';

const COPY: Record<RemindersLanguage, Record<RemindersCopyKey, string>> = {
  en: {
    reminders: 'Reminders',
    newReminder: 'New reminder',
    customReminder: '+ Custom reminder',
    dueDate: 'Due date',
    repeat: 'Repeat',
    once: 'Once',
    monthly: 'Monthly',
    yearly: 'Yearly',
    remindMe: 'Remind me',
    onDueDate: 'On the due date',
    oneDayBefore: '1 day before',
    threeDaysBefore: '3 days before',
    sevenDaysBefore: '7 days before',
    enableNotifications: 'Enable notifications',
    enableNotificationsHint:
      'Allow Calendar Planner to notify you when important reminders are approaching.',
    notificationsEnabled: 'Notifications enabled',
    notificationsDenied:
      'Notifications are blocked. Enable them in browser settings to receive reminders.',
    notificationsUnsupported: 'Push notifications are not supported in this browser.',
    iosInstallForNotifications:
      'Install Calendar Planner on your Home Screen to receive reminder notifications.',
    offline: 'You are offline. Reminder changes require an internet connection.',
    saveError: 'Could not save the reminder. Please try again.',
    loadError: 'Could not load reminders. Please try again.',
    upcoming: 'Upcoming',
    completed: 'Completed',
    noReminders: 'No reminders yet.',
    createFirst: 'Create your first reminder',
    add: 'Add',
    create: 'Create',
    save: 'Save',
    delete: 'Delete',
    cancel: 'Cancel',
    title: 'Title',
    activeCount: '{count} active',
    completedLabel: 'Mark as completed',
    reminderCompleted: 'Reminder completed.',
    createNext: 'Create the next reminder for {date}?',
    createNextPrompt: 'Create the next reminder for {date}?',
    yes: 'Yes',
    changeDate: 'Change date',
    noThanks: 'No',
    presetRent: 'Pay rent',
    presetHouseBills: 'House bills',
    presetVehicleInspection: 'Vehicle inspection',
    presetVignette: 'Vignette',
    presetCarInsurance: 'Car insurance',
    presetSubscription: 'Subscription',
  },
  ru: {
    reminders: 'Напоминания',
    newReminder: 'Новое напоминание',
    customReminder: '+ Своё напоминание',
    dueDate: 'Срок',
    repeat: 'Повтор',
    once: 'Один раз',
    monthly: 'Ежемесячно',
    yearly: 'Ежегодно',
    remindMe: 'Напомнить',
    onDueDate: 'В день срока',
    oneDayBefore: 'За 1 день',
    threeDaysBefore: 'За 3 дня',
    sevenDaysBefore: 'За 7 дней',
    enableNotifications: 'Включить уведомления',
    enableNotificationsHint:
      'Разрешите Calendar Planner отправлять уведомления о важных напоминаниях.',
    notificationsEnabled: 'Уведомления включены',
    notificationsDenied:
      'Уведомления заблокированы. Включите их в настройках браузера.',
    notificationsUnsupported: 'Push-уведомления не поддерживаются в этом браузере.',
    iosInstallForNotifications:
      'Установите Calendar Planner на экран «Домой», чтобы получать уведомления.',
    offline: 'Нет сети. Для напоминаний нужно подключение к интернету.',
    saveError: 'Не удалось сохранить напоминание. Попробуйте снова.',
    loadError: 'Не удалось загрузить напоминания. Попробуйте снова.',
    upcoming: 'Предстоящие',
    completed: 'Завершённые',
    noReminders: 'Напоминаний пока нет.',
    createFirst: 'Создайте первое напоминание',
    add: 'Добавить',
    create: 'Создать',
    save: 'Сохранить',
    delete: 'Удалить',
    cancel: 'Отмена',
    title: 'Название',
    activeCount: 'Активных: {count}',
    completedLabel: 'Отметить выполненным',
    reminderCompleted: 'Напоминание выполнено.',
    createNext: 'Создать следующее напоминание на {date}?',
    createNextPrompt: 'Создать следующее напоминание на {date}?',
    yes: 'Да',
    changeDate: 'Изменить дату',
    noThanks: 'Нет',
    presetRent: 'Оплатить аренду',
    presetHouseBills: 'Коммунальные платежи',
    presetVehicleInspection: 'Техосмотр',
    presetVignette: 'Виньетка',
    presetCarInsurance: 'Страховка авто',
    presetSubscription: 'Подписка',
  },
};

export function getRemindersLanguage(): RemindersLanguage {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function rt(
  lang: RemindersLanguage,
  key: RemindersCopyKey,
  vars?: Record<string, string | number>,
): string {
  let text = COPY[lang][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}

export const NOTIFY_OPTIONS: Array<{
  value: number;
  labelKey: RemindersCopyKey;
}> = [
  { value: 0, labelKey: 'onDueDate' },
  { value: 1, labelKey: 'oneDayBefore' },
  { value: 3, labelKey: 'threeDaysBefore' },
  { value: 7, labelKey: 'sevenDaysBefore' },
];

export const RECURRENCE_OPTIONS: Array<{
  value: ReminderRecurrence;
  labelKey: RemindersCopyKey;
}> = [
  { value: 'once', labelKey: 'once' },
  { value: 'monthly', labelKey: 'monthly' },
  { value: 'yearly', labelKey: 'yearly' },
];

export type ReminderPresetKey =
  | 'presetRent'
  | 'presetHouseBills'
  | 'presetVehicleInspection'
  | 'presetVignette'
  | 'presetCarInsurance'
  | 'presetSubscription';

export const REMINDER_PRESETS: Array<
  ReminderDraft & { emoji: string; titleKey: ReminderPresetKey }
> = [
  {
    emoji: '🏠',
    titleKey: 'presetRent',
    title: 'Pay rent',
    dueDate: '',
    recurrence: 'monthly',
    notifyDaysBefore: 3,
  },
  {
    emoji: '💵',
    titleKey: 'presetHouseBills',
    title: 'House bills',
    dueDate: '',
    recurrence: 'monthly',
    notifyDaysBefore: 3,
  },
  {
    emoji: '🚗',
    titleKey: 'presetVehicleInspection',
    title: 'Vehicle inspection',
    dueDate: '',
    recurrence: 'yearly',
    notifyDaysBefore: 7,
  },
  {
    emoji: '🛣️',
    titleKey: 'presetVignette',
    title: 'Vignette',
    dueDate: '',
    recurrence: 'yearly',
    notifyDaysBefore: 7,
  },
  {
    emoji: '🛡️',
    titleKey: 'presetCarInsurance',
    title: 'Car insurance',
    dueDate: '',
    recurrence: 'yearly',
    notifyDaysBefore: 7,
  },
  {
    emoji: '💳',
    titleKey: 'presetSubscription',
    title: 'Subscription',
    dueDate: '',
    recurrence: 'monthly',
    notifyDaysBefore: 1,
  },
];
