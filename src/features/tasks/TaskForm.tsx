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
import { formatDateKey } from '../calendar/utils';
import { DEFAULT_TASK_COLOR } from './constants';

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  emoji: z.string().optional(),
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
      emoji: '',
      dueDate: formatDateKey(selectedDate),
      notes: '',
      color: DEFAULT_TASK_COLOR,
      completed: false,
    },
  });

  const selectedColor = watch('color');
  const selectedEmoji = watch('emoji');

  useEffect(() => {
    if (isEditing && existingTask) {
      reset({
        title: existingTask.title,
        emoji: existingTask.emoji ?? '',
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
        emoji: '',
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
      emoji: values.emoji || undefined,
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
      <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Title
          </label>
          <EmojiPicker
            value={selectedEmoji ?? ''}
            onChange={(emoji) => setValue('emoji', emoji)}
          >
            <input
              {...register('title')}
              placeholder="Task title"
              className={clsx('min-w-0 flex-1', themeClasses.input)}
            />
          </EmojiPicker>
          {errors.title && (
            <p className="mt-1 text-xs text-rose-500">{errors.title.message}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-foreground">
            Due date
          </label>
          <input
            type="date"
            {...register('dueDate')}
            className={clsx('w-full', themeClasses.input)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-foreground">
            Color
          </label>
          <ColorSwatchPicker
            value={selectedColor}
            onChange={(color) => setValue('color', color)}
          />
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

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            {...register('completed')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary-soft"
          />
          Mark as completed
        </label>

        <div className="flex min-w-0 flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
          {isEditing && (
            <button
              type="button"
              onClick={onDelete}
              className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 sm:w-auto"
            >
              Delete
            </button>
          )}
          <button
            type="button"
            onClick={closeTaskModal}
            className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-surface-soft sm:w-auto"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={clsx('w-full sm:ml-auto sm:w-auto', themeClasses.primaryBtn)}
          >
            {isEditing ? 'Save' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
