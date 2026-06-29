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
import { formatDateKey } from '../calendar/utils';
import { DEFAULT_TASK_COLOR, TASK_COLORS } from './constants';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  color: z.string().min(1),
  completed: z.boolean(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskForm() {
  const closeTaskModal = useUIStore((s) => s.closeTaskModal);
  const editingTaskId = useUIStore((s) => s.editingTaskId);
  const selectedDate = useUIStore((s) => s.selectedDate);

  const existingTask = useLiveQuery(
    () => (editingTaskId ? db.tasks.get(editingTaskId) : undefined),
    [editingTaskId],
  );

  const isEditing = Boolean(editingTaskId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      dueDate: formatDateKey(selectedDate),
      notes: '',
      color: DEFAULT_TASK_COLOR,
      completed: false,
    },
  });

  const selectedColor = watch('color');

  useEffect(() => {
    if (isEditing && existingTask) {
      reset({
        title: existingTask.title,
        dueDate: existingTask.date ?? '',
        notes: existingTask.notes ?? '',
        color: existingTask.color || DEFAULT_TASK_COLOR,
        completed: existingTask.completed,
      });
      return;
    }

    if (!isEditing) {
      reset({
        title: '',
        dueDate: formatDateKey(selectedDate),
        notes: '',
        color: DEFAULT_TASK_COLOR,
        completed: false,
      });
    }
  }, [existingTask, isEditing, reset, selectedDate]);

  const onSubmit = async (values: TaskFormValues) => {
    const now = new Date();
    const payload = {
      title: values.title,
      date: values.dueDate || undefined,
      notes: values.notes || undefined,
      color: values.color,
      completed: values.completed,
      updatedAt: now,
    };

    if (isEditing && editingTaskId) {
      await db.tasks.update(editingTaskId, payload);
    } else {
      await db.tasks.add({
        id: uuidv4(),
        ...payload,
        createdAt: now,
      });
    }

    closeTaskModal();
  };

  const onDelete = async () => {
    if (!editingTaskId) return;
    await db.tasks.delete(editingTaskId);
    closeTaskModal();
  };

  if (isEditing && existingTask === undefined) {
    return null;
  }

  return (
    <Modal title={isEditing ? 'Edit Task' : 'New Task'} onClose={closeTaskModal}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Title
          </label>
          <input
            {...register('title')}
            placeholder="Task title"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Due date
          </label>
          <input
            type="date"
            {...register('dueDate')}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Color
          </label>
          <div className="flex flex-wrap gap-2">
            {TASK_COLORS.map((color) => (
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

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            {...register('completed')}
            className="h-4 w-4 rounded border-gray-300 text-sky-500 focus:ring-sky-200"
          />
          Mark as completed
        </label>

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
            onClick={closeTaskModal}
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
