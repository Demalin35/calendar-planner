import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { EmojiPicker } from '../../components/EmojiPicker';
import { ColorSwatchPicker } from '../../components/PastelChip';
import { themeClasses } from '../../constants/theme';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_EVENT_COLOR } from './constants';
import { formatDateKey } from './utils';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  emoji: z.string().optional(),
  date: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  color: z.string().min(1),
  notes: z.string().optional(),
});

type EventFormValues = z.infer<typeof eventSchema>;

export function EventForm() {
  const closeEventModal = useUIStore((s) => s.closeEventModal);
  const editingEventId = useUIStore((s) => s.editingEventId);
  const selectedDate = useUIStore((s) => s.selectedDate);
  const suggestedStartTime = useUIStore((s) => s.suggestedStartTime);
  const suggestedEndTime = useUIStore((s) => s.suggestedEndTime);

  const existingEvent = useLiveQuery(
    () => (editingEventId ? db.events.get(editingEventId) : undefined),
    [editingEventId],
  );

  const isEditing = Boolean(editingEventId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '',
      emoji: '',
      date: formatDateKey(selectedDate),
      startTime: '09:00',
      endTime: '10:00',
      color: DEFAULT_EVENT_COLOR,
      notes: '',
    },
  });

  const selectedColor = watch('color');
  const selectedEmoji = watch('emoji');

  useEffect(() => {
    if (isEditing && existingEvent) {
      reset({
        title: existingEvent.title,
        emoji: existingEvent.emoji ?? '',
        date: existingEvent.date,
        startTime: existingEvent.startTime,
        endTime: existingEvent.endTime,
        color: existingEvent.color,
        notes: existingEvent.notes ?? '',
      });
      return;
    }

    if (!isEditing) {
      reset({
        title: '',
        emoji: '',
        date: formatDateKey(selectedDate),
        startTime: suggestedStartTime ?? '09:00',
        endTime: suggestedEndTime ?? '10:00',
        color: DEFAULT_EVENT_COLOR,
        notes: '',
      });
    }
  }, [
    existingEvent,
    isEditing,
    reset,
    selectedDate,
    suggestedEndTime,
    suggestedStartTime,
  ]);

  const onSubmit = async (values: EventFormValues) => {
    const now = new Date();

    if (isEditing && editingEventId) {
      await db.events.update(editingEventId, {
        ...values,
        emoji: values.emoji || undefined,
        notes: values.notes || undefined,
        updatedAt: now,
      });
    } else {
      await db.events.add({
        id: uuidv4(),
        ...values,
        emoji: values.emoji || undefined,
        notes: values.notes || undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    closeEventModal();
  };

  const onDelete = async () => {
    if (!editingEventId) return;
    await db.events.delete(editingEventId);
    closeEventModal();
  };

  if (isEditing && existingEvent === undefined) {
    return null;
  }

  return (
    <Modal title={isEditing ? 'Edit Event' : 'New Event'} onClose={closeEventModal}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Title
          </label>
          <div className="flex min-w-0 gap-2">
            <EmojiPicker
              value={selectedEmoji ?? ''}
              onChange={(emoji) => setValue('emoji', emoji)}
            />
            <input
              {...register('title')}
              placeholder="Event title"
              className={clsx('min-w-0 flex-1', themeClasses.input)}
            />
          </div>
          {errors.title && (
            <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Date
          </label>
          <input
            type="date"
            {...register('date')}
            className={clsx('w-full', themeClasses.input)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              Start
            </label>
            <input
              type="time"
              {...register('startTime')}
              className={clsx('w-full', themeClasses.input)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">
              End
            </label>
            <input
              type="time"
              {...register('endTime')}
              className={clsx('w-full', themeClasses.input)}
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            <ColorSwatchPicker
              value={selectedColor}
              onChange={(color) => setValue('color', color)}
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Optional notes"
            className={clsx('w-full resize-none', themeClasses.input)}
          />
        </div>

        <div className="flex gap-2 pt-2">
          {isEditing && (
            <button
              type="button"
              onClick={onDelete}
              className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={closeEventModal}
            className="rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={clsx('ml-auto', themeClasses.primaryBtn)}
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
