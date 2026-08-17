import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { EmojiPicker } from '../../components/EmojiPicker';
import { themeClasses } from '../../constants/theme';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { useUIStore } from '../../store/uiStore';
import { formatDateKey } from '../calendar/utils';
import {
  NOTIFY_OPTIONS,
  RECURRENCE_OPTIONS,
  getRemindersLanguage,
  rt,
} from './remindersCopy';
import {
  createReminderApi,
  deleteReminderApi,
  updateReminderApi,
} from './remindersApi';
import type { Reminder, ReminderDraft } from './types';

const reminderSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  emoji: z.string().optional(),
  dueDate: z.string().min(1),
  recurrence: z.enum(['once', 'monthly', 'yearly']),
  notifyDaysBefore: z.number(),
  completed: z.boolean(),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

interface ReminderFormProps {
  editingReminder: Reminder | null;
  onSaved: () => void;
}

export function ReminderForm({ editingReminder, onSaved }: ReminderFormProps) {
  const lang = getRemindersLanguage();
  const isOnline = useOnlineStatus();
  const closeReminderModal = useUIStore((s) => s.closeReminderModal);
  const editingReminderId = useUIStore((s) => s.editingReminderId);
  const reminderDraft = useUIStore((s) => s.reminderDraft);
  const selectedDate = useUIStore((s) => s.selectedDate);

  const isEditing = Boolean(editingReminderId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      title: '',
      emoji: '',
      dueDate: formatDateKey(selectedDate),
      recurrence: 'once',
      notifyDaysBefore: 0,
      completed: false,
    },
  });

  const selectedEmoji = watch('emoji');

  useEffect(() => {
    if (isEditing && editingReminder) {
      reset({
        title: editingReminder.title,
        emoji: editingReminder.emoji ?? '',
        dueDate: editingReminder.dueDate,
        recurrence: editingReminder.recurrence,
        notifyDaysBefore: editingReminder.notifyDaysBefore,
        completed: editingReminder.completed,
      });
      return;
    }

    if (!isEditing) {
      reset({
        title: reminderDraft?.title ?? '',
        emoji: reminderDraft?.emoji ?? '',
        dueDate: reminderDraft?.dueDate || formatDateKey(selectedDate),
        recurrence: reminderDraft?.recurrence ?? 'once',
        notifyDaysBefore: reminderDraft?.notifyDaysBefore ?? 0,
        completed: false,
      });
    }
  }, [
    editingReminder,
    isEditing,
    reminderDraft,
    reset,
    selectedDate,
  ]);

  const onSubmit = async (values: ReminderFormValues) => {
    if (!isOnline) return;

    const payload: ReminderDraft = {
      title: values.title.trim(),
      emoji: values.emoji || undefined,
      dueDate: values.dueDate,
      recurrence: values.recurrence,
      notifyDaysBefore: values.notifyDaysBefore,
    };

    try {
      if (isEditing && editingReminderId) {
        await updateReminderApi(editingReminderId, {
          ...payload,
          completed: values.completed,
        });
      } else {
        await createReminderApi(payload);
      }
      onSaved();
      closeReminderModal();
    } catch {
      // error surfaced by parent if needed
    }
  };

  const onDelete = async () => {
    if (!editingReminderId || !isOnline) return;
    await deleteReminderApi(editingReminderId);
    onSaved();
    closeReminderModal();
  };

  return (
    <Modal
      title={isEditing ? rt(lang, 'save') : rt(lang, 'newReminder')}
      onClose={closeReminderModal}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4">
        {!isOnline && (
          <p className="text-sm text-rose-600" role="status">
            {rt(lang, 'offline')}
          </p>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {rt(lang, 'title')}
          </label>
          <EmojiPicker
            value={selectedEmoji ?? ''}
            onChange={(emoji) => setValue('emoji', emoji)}
          >
            <input
              {...register('title')}
              className={clsx('min-w-0 flex-1', themeClasses.input)}
            />
          </EmojiPicker>
          {errors.title && (
            <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {rt(lang, 'dueDate')}
          </label>
          <input
            type="date"
            {...register('dueDate')}
            className={clsx('w-full', themeClasses.input)}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {rt(lang, 'repeat')}
          </label>
          <select
            {...register('recurrence')}
            className={clsx('w-full', themeClasses.input)}
          >
            {RECURRENCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {rt(lang, option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            {rt(lang, 'remindMe')}
          </label>
          <select
            {...register('notifyDaysBefore', { valueAsNumber: true })}
            className={clsx('w-full', themeClasses.input)}
          >
            {NOTIFY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {rt(lang, option.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {isEditing && (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              {...register('completed')}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary-soft"
            />
            {rt(lang, 'completedLabel')}
          </label>
        )}

        <div className="flex min-w-0 flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          {isEditing && (
            <button
              type="button"
              onClick={() => void onDelete()}
              disabled={!isOnline || isSubmitting}
              className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 sm:w-auto"
            >
              {rt(lang, 'delete')}
            </button>
          )}
          <button
            type="button"
            onClick={closeReminderModal}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft sm:w-auto"
          >
            {rt(lang, 'cancel')}
          </button>
          <button
            type="submit"
            disabled={!isOnline || isSubmitting}
            className={clsx('w-full sm:ml-auto sm:w-auto', themeClasses.primaryBtn)}
          >
            {isEditing ? rt(lang, 'save') : rt(lang, 'create')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
