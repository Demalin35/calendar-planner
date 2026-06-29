import { zodResolver } from '@hookform/resolvers/zod';
import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Modal } from '../../components/Modal';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import { DEFAULT_EVENT_COLOR, EVENT_COLORS } from './constants';
import { formatDateKey } from './utils';

const eventSchema = z.object({
  title: z.string().min(1, 'Title is required'),
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
      date: formatDateKey(selectedDate),
      startTime: '09:00',
      endTime: '10:00',
      color: DEFAULT_EVENT_COLOR,
      notes: '',
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (isEditing && existingEvent) {
      reset({
        title: existingEvent.title,
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
        notes: values.notes || undefined,
        updatedAt: now,
      });
    } else {
      await db.events.add({
        id: uuidv4(),
        ...values,
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
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            {...register('title')}
            placeholder="Event title"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            {...register('date')}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              Start
            </label>
            <input
              type="time"
              {...register('startTime')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700">
              End
            </label>
            <input
              type="time"
              {...register('endTime')}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((color) => (
              <button
                key={color.id}
                type="button"
                onClick={() => setValue('color', color.value)}
                className={clsx(
                  'h-8 w-8 rounded-full ring-2 ring-offset-2 transition',
                  selectedColor === color.value
                    ? 'ring-gray-400'
                    : 'ring-transparent',
                )}
                style={{ backgroundColor: color.value }}
                aria-label={color.label}
              />
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Optional notes"
            className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
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
            className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-auto rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sky-600 disabled:opacity-60"
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
