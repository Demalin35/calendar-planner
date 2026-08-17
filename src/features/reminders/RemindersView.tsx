import clsx from 'clsx';
import { format, parseISO } from 'date-fns';
import { Bell, Check, Plus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { EmojiTitle } from '../../components/EmojiTitle';
import { themeClasses } from '../../constants/theme';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useUIStore } from '../../store/uiStore';
import { isIosSafariBrowser } from '../../utils/pwa';
import { formatDateKey } from '../calendar/utils';
import { CompleteReminderDialog } from './CompleteReminderDialog';
import { ReminderForm } from './ReminderForm';
import {
  REMINDER_PRESETS,
  getRemindersLanguage,
  rt,
} from './remindersCopy';
import {
  completeReminderApi,
  createReminderApi,
  fetchReminders,
} from './remindersApi';
import {
  enableReminderNotifications,
  getNotificationPermissionState,
  type NotificationPermissionState,
} from './pushNotifications';
import type { Reminder, ReminderDraft } from './types';

function formatReminderDate(dateKey: string): string {
  try {
    return format(parseISO(dateKey), 'MMM d, yyyy');
  } catch {
    return dateKey;
  }
}

export function RemindersView() {
  const lang = getRemindersLanguage();
  const isOnline = useOnlineStatus();
  const openReminderModal = useUIStore((s) => s.openReminderModal);
  const isReminderModalOpen = useUIStore((s) => s.isReminderModalOpen);
  const editingReminderId = useUIStore((s) => s.editingReminderId);
  const focusedReminderId = useUIStore((s) => s.focusedReminderId);
  const setFocusedReminderId = useUIStore((s) => s.setFocusedReminderId);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notificationState, setNotificationState] =
    useState<NotificationPermissionState>(() => getNotificationPermissionState());
  const [pendingNext, setPendingNext] = useState<{
    dueDate: string;
    draft: ReminderDraft;
  } | null>(null);

  const loadReminders = useCallback(async () => {
    if (!navigator.onLine) {
      setLoadError(rt(lang, 'offline'));
      return;
    }
    try {
      const data = await fetchReminders();
      setReminders(data);
      setLoadError(null);
    } catch {
      setLoadError(rt(lang, 'loadError'));
    }
  }, [lang]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    if (!focusedReminderId) return;
    const element = document.getElementById(`reminder-${focusedReminderId}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setFocusedReminderId(null);
  }, [focusedReminderId, reminders, setFocusedReminderId]);

  const { upcoming, completed } = useMemo(() => {
    const active: Reminder[] = [];
    const done: Reminder[] = [];
    for (const reminder of reminders) {
      if (reminder.completed) done.push(reminder);
      else active.push(reminder);
    }
    return { upcoming: active, completed: done };
  }, [reminders]);

  const editingReminder =
    reminders.find((reminder) => reminder.id === editingReminderId) ?? null;

  const openPreset = (draft: ReminderDraft) => {
    openReminderModal(undefined, {
      ...draft,
      dueDate: draft.dueDate || formatDateKey(new Date()),
    });
  };

  useEffect(() => {
    const refreshPermission = () => {
      setNotificationState(getNotificationPermissionState());
    };

    refreshPermission();
    document.addEventListener('visibilitychange', refreshPermission);
    return () => {
      document.removeEventListener('visibilitychange', refreshPermission);
    };
  }, []);

  const handleEnableNotifications = async () => {
    const next = await enableReminderNotifications();
    setNotificationState(next.state);
  };

  const handleComplete = async (reminder: Reminder) => {
    if (!isOnline) return;
    const result = await completeReminderApi(reminder.id);
    await loadReminders();
    if (result.suggestNext) {
      setPendingNext({
        dueDate: result.suggestNext.dueDate,
        draft: result.suggestNext,
      });
    }
  };

  const handleCreateNext = async () => {
    if (!pendingNext || !isOnline) return;
    await createReminderApi({
      ...pendingNext.draft,
      dueDate: pendingNext.dueDate,
    });
    setPendingNext(null);
    await loadReminders();
  };

  const handleChangeNextDate = () => {
    if (!pendingNext) return;
    openReminderModal(undefined, {
      ...pendingNext.draft,
      dueDate: pendingNext.dueDate,
    });
    setPendingNext(null);
  };

  const showIosInstallHint =
    isIosSafariBrowser() && notificationState !== 'granted';
  const showEnableButton =
    !showIosInstallHint &&
    notificationState !== 'granted' &&
    notificationState !== 'denied' &&
    notificationState !== 'unsupported' &&
    notificationState !== 'misconfigured';
  const showNotificationSection =
    showIosInstallHint ||
    notificationState === 'granted' ||
    notificationState === 'denied' ||
    notificationState === 'unsupported' ||
    notificationState === 'misconfigured' ||
    notificationState === 'error' ||
    notificationState === 'default';

  return (
    <>
      <div className={themeClasses.card}>
        <div
          className={clsx(
            'flex min-w-0 items-center justify-between gap-2 px-3 py-4 sm:px-6',
            themeClasses.cardHeader,
          )}
        >
          <div className="min-w-0">
            <h2 className={clsx('text-lg sm:text-xl', themeClasses.heading)}>
              {rt(lang, 'reminders')}
            </h2>
            <p className="mt-0.5 text-xs text-muted sm:text-sm">
              {rt(lang, 'activeCount', { count: upcoming.length })}
            </p>
          </div>
          <button
            type="button"
            onClick={() => openReminderModal()}
            className={clsx(
              'inline-flex shrink-0 items-center gap-1.5',
              themeClasses.primaryBtnSm,
            )}
          >
            <Plus size={18} />
            <span className="hidden sm:inline">{rt(lang, 'add')}</span>
          </button>
        </div>

        <div className="space-y-3 border-b border-border px-3 py-4 sm:px-6">
          <div className="flex min-w-0 flex-wrap gap-2">
            {REMINDER_PRESETS.map((preset) => (
              <button
                key={preset.titleKey}
                type="button"
                onClick={() =>
                  openPreset({
                    title: rt(lang, preset.titleKey),
                    emoji: preset.emoji,
                    dueDate: '',
                    recurrence: preset.recurrence,
                    notifyDaysBefore: preset.notifyDaysBefore,
                  })
                }
                className={clsx(
                  'rounded-xl border border-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-foreground',
                  'transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-soft',
                )}
              >
                {preset.emoji} {rt(lang, preset.titleKey)}
              </button>
            ))}
            <button
              type="button"
              onClick={() => openReminderModal()}
              className={clsx(
                'rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted',
                'transition hover:bg-surface-soft hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary-soft',
              )}
            >
              {rt(lang, 'customReminder')}
            </button>
          </div>

          {showNotificationSection && (
            <div className="rounded-xl border border-border bg-surface-soft px-3 py-3">
              {showIosInstallHint ? (
                <p className="text-xs text-muted">
                  {rt(lang, 'iosInstallForNotifications')}
                </p>
              ) : notificationState === 'granted' ? (
                <p className="text-xs text-muted">{rt(lang, 'notificationsEnabled')}</p>
              ) : (
                <div className="flex items-start gap-2">
                  <Bell size={16} className="mt-0.5 shrink-0 text-primary-strong" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {rt(lang, 'enableNotifications')}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {rt(lang, 'enableNotificationsHint')}
                    </p>

                    {showEnableButton && (
                      <button
                        type="button"
                        onClick={() => void handleEnableNotifications()}
                        disabled={!isOnline}
                        className={clsx('mt-3', themeClasses.primaryBtnSm)}
                      >
                        {rt(lang, 'enableNotifications')}
                      </button>
                    )}

                    {notificationState === 'denied' && (
                      <p className="mt-2 text-xs text-rose-600">
                        {rt(lang, 'notificationsDenied')}
                      </p>
                    )}
                    {notificationState === 'unsupported' && (
                      <p className="mt-2 text-xs text-muted">
                        {rt(lang, 'notificationsUnsupported')}
                      </p>
                    )}
                    {notificationState === 'misconfigured' && (
                      <p className="mt-2 text-xs text-rose-600">
                        {rt(lang, 'notificationsMisconfigured')}
                      </p>
                    )}
                    {notificationState === 'error' && (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs text-rose-600">
                          {rt(lang, 'notificationsEnableError')}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleEnableNotifications()}
                          disabled={!isOnline}
                          className={clsx(themeClasses.primaryBtnSm)}
                        >
                          {rt(lang, 'enableNotifications')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {loadError ? (
          <div className="px-6 py-10 text-center text-sm text-rose-600">{loadError}</div>
        ) : reminders.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <p className="text-sm text-muted">{rt(lang, 'noReminders')}</p>
            <button
              type="button"
              onClick={() => openReminderModal()}
              className={clsx('mt-3 text-sm', themeClasses.linkBtn)}
            >
              {rt(lang, 'createFirst')}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <ReminderSection
              title={rt(lang, 'upcoming')}
              reminders={upcoming}
              onOpen={openReminderModal}
              onComplete={handleComplete}
              isOnline={isOnline}
            />
            <ReminderSection
              title={rt(lang, 'completed')}
              reminders={completed}
              onOpen={openReminderModal}
              onComplete={handleComplete}
              isOnline={isOnline}
              completed
            />
          </div>
        )}
      </div>

      {isReminderModalOpen && (
        <ReminderForm editingReminder={editingReminder} onSaved={loadReminders} />
      )}

      {pendingNext && (
        <CompleteReminderDialog
          dueDate={formatReminderDate(pendingNext.dueDate)}
          draft={pendingNext.draft}
          onConfirm={() => void handleCreateNext()}
          onChangeDate={handleChangeNextDate}
          onDismiss={() => setPendingNext(null)}
        />
      )}
    </>
  );
}

function ReminderSection({
  title,
  reminders,
  onOpen,
  onComplete,
  isOnline,
  completed = false,
}: {
  title: string;
  reminders: Reminder[];
  onOpen: (id: string) => void;
  onComplete: (reminder: Reminder) => Promise<void>;
  isOnline: boolean;
  completed?: boolean;
}) {
  if (reminders.length === 0) return null;

  return (
    <section className="px-4 py-4 sm:px-6">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted sm:text-sm">
        {title}
      </h3>
      <ul className="space-y-2">
        {reminders.map((reminder) => (
          <li key={reminder.id} id={`reminder-${reminder.id}`}>
            <div className="flex items-start gap-2 rounded-xl border border-border bg-surface-soft p-3">
              {!completed && (
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => void onComplete(reminder)}
                  className={clsx(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-black/20 bg-surface transition',
                    'hover:border-primary-strong disabled:opacity-50',
                  )}
                  aria-label="Complete reminder"
                >
                  <Check size={12} />
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpen(reminder.id)}
                className="min-w-0 flex-1 text-left"
              >
                <EmojiTitle
                  title={reminder.title}
                  emoji={reminder.emoji}
                  titleClassName={clsx(
                    'text-sm font-medium sm:text-base',
                    completed && 'opacity-60 line-through',
                  )}
                />
                <p className="mt-1 text-xs text-muted">
                  {formatReminderDate(reminder.dueDate)}
                </p>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
