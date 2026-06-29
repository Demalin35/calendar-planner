import { format, parseISO } from 'date-fns';
import type { Task } from '../../types';
import { formatDateKey } from '../calendar/utils';

export type TaskSection = 'overdue' | 'today' | 'upcoming' | 'completed';

export interface GroupedTasks {
  overdue: Task[];
  today: Task[];
  upcoming: Task[];
  completed: Task[];
}

const SECTION_ORDER: TaskSection[] = [
  'overdue',
  'today',
  'upcoming',
  'completed',
];

export const TASK_SECTION_LABELS: Record<TaskSection, string> = {
  overdue: 'Overdue',
  today: 'Today',
  upcoming: 'Upcoming',
  completed: 'Completed',
};

export function groupTasksBySection(tasks: Task[]): GroupedTasks {
  const todayKey = formatDateKey(new Date());
  const grouped: GroupedTasks = {
    overdue: [],
    today: [],
    upcoming: [],
    completed: [],
  };

  for (const task of tasks) {
    if (task.completed) {
      grouped.completed.push(task);
      continue;
    }

    if (!task.date) {
      grouped.upcoming.push(task);
      continue;
    }

    if (task.date < todayKey) {
      grouped.overdue.push(task);
    } else if (task.date === todayKey) {
      grouped.today.push(task);
    } else {
      grouped.upcoming.push(task);
    }
  }

  grouped.overdue.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  grouped.today.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  grouped.upcoming.sort((a, b) => {
    if (!a.date && !b.date) return a.createdAt.getTime() - b.createdAt.getTime();
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });
  grouped.completed.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  return grouped;
}

export function getTaskSections(grouped: GroupedTasks): TaskSection[] {
  return SECTION_ORDER.filter((section) => grouped[section].length > 0);
}

export function formatDueDate(date?: string): string {
  if (!date) return 'No due date';
  return format(parseISO(date), 'MMM d, yyyy');
}

import { normalizeItemColor } from '../../utils/color';

export function getTaskColor(task: Task, fallback: string): string {
  return normalizeItemColor(task.color || fallback);
}
