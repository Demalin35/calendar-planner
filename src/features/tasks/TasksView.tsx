import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { Task } from '../../types';
import { DEFAULT_TASK_COLOR } from './constants';
import { TaskTitle } from './TaskTitle';
import {
  formatDueDate,
  getTaskColor,
  getTaskSections,
  groupTasksBySection,
  TASK_SECTION_LABELS,
  type TaskSection,
} from './utils';

export function TasksView() {
  const openTaskModal = useUIStore((s) => s.openTaskModal);

  const tasks = useLiveQuery(() => db.tasks.toArray(), []);

  const grouped = useMemo(
    () => groupTasksBySection(tasks ?? []),
    [tasks],
  );

  const sections = useMemo(() => getTaskSections(grouped), [grouped]);
  const isEmpty = (tasks ?? []).length === 0;

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-gray-100 px-3 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
            Tasks
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
            {(tasks ?? []).filter((t) => !t.completed).length} active
          </p>
        </div>
        <button
          type="button"
          onClick={() => openTaskModal()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sky-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-sky-600"
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add task</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {isEmpty ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-gray-500">No tasks yet.</p>
          <button
            type="button"
            onClick={() => openTaskModal()}
            className="mt-3 text-sm font-medium text-sky-600 hover:text-sky-700"
          >
            Create your first task
          </button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {sections.map((section) => (
            <TaskSectionBlock
              key={section}
              section={section}
              tasks={grouped[section]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskSectionBlock({
  section,
  tasks,
}: {
  section: TaskSection;
  tasks: Task[];
}) {
  return (
    <section className="px-4 py-4 sm:px-6">
      <div className="mb-3 flex items-center gap-2">
        <h3
          className={clsx(
            'text-xs font-semibold uppercase tracking-wide sm:text-sm',
            section === 'overdue' && 'text-rose-500',
            section === 'today' && 'text-sky-600',
            section === 'upcoming' && 'text-gray-500',
            section === 'completed' && 'text-gray-400',
          )}
        >
          {TASK_SECTION_LABELS[section]}
        </h3>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500 sm:text-xs">
          {tasks.length}
        </span>
      </div>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} section={section} />
        ))}
      </ul>
    </section>
  );
}

function TaskRow({ task, section }: { task: Task; section: TaskSection }) {
  const openTaskModal = useUIStore((s) => s.openTaskModal);
  const color = getTaskColor(task, DEFAULT_TASK_COLOR);
  const isCompleted = section === 'completed';

  const toggleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await db.tasks.update(task.id, {
      completed: !task.completed,
      updatedAt: new Date(),
    });
  };

  return (
    <li>
      <button
        type="button"
        onClick={() => openTaskModal(task.id)}
        className="flex w-full items-start gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-left transition hover:bg-sky-50/50 sm:p-3.5"
      >
        <span
          role="checkbox"
          aria-checked={task.completed}
          tabIndex={0}
          onClick={toggleComplete}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              void db.tasks.update(task.id, {
                completed: !task.completed,
                updatedAt: new Date(),
              });
            }
          }}
          className={clsx(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
            task.completed
              ? 'border-sky-500 bg-sky-500 text-white'
              : 'border-gray-300 bg-white hover:border-sky-400',
          )}
        >
          {task.completed && <Check size={12} strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <TaskTitle
              title={task.title}
              emoji={task.emoji}
              completed={isCompleted}
              className="min-w-0 flex-1"
              titleClassName="text-sm font-medium sm:text-base"
            />
          </span>
          <span
            className={clsx(
              'mt-1 block text-xs sm:text-sm',
              section === 'overdue' ? 'text-rose-500' : 'text-gray-500',
            )}
          >
            {formatDueDate(task.date)}
          </span>
          {task.notes && (
            <span className="mt-1 block truncate text-xs text-gray-400">
              {task.notes}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}
