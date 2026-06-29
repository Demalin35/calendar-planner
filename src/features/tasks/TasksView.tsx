import clsx from 'clsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus } from 'lucide-react';
import { useMemo } from 'react';
import { PastelChip } from '../../components/PastelChip';
import { themeClasses } from '../../constants/theme';
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
    <div className={themeClasses.card}>
      <div className={clsx('flex min-w-0 items-center justify-between gap-2 px-3 py-4 sm:px-6', themeClasses.cardHeader)}>
        <div className="min-w-0">
          <h2 className={clsx('text-lg sm:text-xl', themeClasses.heading)}>
            Tasks
          </h2>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            {(tasks ?? []).filter((t) => !t.completed).length} active
          </p>
        </div>
        <button
          type="button"
          onClick={() => openTaskModal()}
          className={clsx('inline-flex shrink-0 items-center gap-1.5', themeClasses.primaryBtnSm)}
        >
          <Plus size={18} />
          <span className="hidden sm:inline">Add task</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      {isEmpty ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-muted">No tasks yet.</p>
          <button
            type="button"
            onClick={() => openTaskModal()}
            className={clsx('mt-3 text-sm', themeClasses.linkBtn)}
          >
            Create your first task
          </button>
        </div>
      ) : (
        <div className="divide-y divide-border">
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
            section === 'today' && 'text-primary-strong',
            section === 'upcoming' && 'text-muted',
            section === 'completed' && 'text-muted/70',
          )}
        >
          {TASK_SECTION_LABELS[section]}
        </h3>
        <span className="rounded-full bg-surface-soft px-2 py-0.5 text-[10px] font-medium text-muted sm:text-xs">
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
      <PastelChip
        color={color}
        onClick={() => openTaskModal(task.id)}
        className="flex w-full items-start gap-3 rounded-xl p-3 text-left sm:p-3.5"
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
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 bg-surface transition',
            task.completed
              ? 'border-primary-strong bg-primary-strong text-white'
              : 'border-black/20 hover:border-primary-strong',
          )}
        >
          {task.completed && <Check size={12} strokeWidth={3} />}
        </span>

        <span className="min-w-0 flex-1">
          <TaskTitle
            title={task.title}
            emoji={task.emoji}
            completed={isCompleted}
            className="min-w-0 flex-1"
            titleClassName={clsx(
              'text-sm font-medium sm:text-base',
              isCompleted && 'opacity-60',
            )}
          />
          <span
            className={clsx(
              'mt-1 block text-xs sm:text-sm',
              section === 'overdue' ? 'text-rose-700' : 'opacity-[0.85]',
            )}
          >
            {formatDueDate(task.date)}
          </span>
          {task.notes && (
            <span className="mt-1 block truncate text-xs opacity-75">
              {task.notes}
            </span>
          )}
        </span>
      </PastelChip>
    </li>
  );
}
