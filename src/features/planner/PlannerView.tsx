import clsx from 'clsx';
import { addWeeks, format, isToday, subWeeks } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { CalendarPlus, ChevronLeft, ChevronRight, ListPlus } from 'lucide-react';
import { useMemo } from 'react';
import { db } from '../../db';
import { EmojiTitle } from '../../components/EmojiTitle';
import { useUIStore } from '../../store/uiStore';
import type { CalendarEvent, Task } from '../../types';
import { WEEKDAY_LABELS } from '../calendar/constants';
import { formatDateKey, groupEventsByDate } from '../calendar/utils';
import { DEFAULT_TASK_COLOR } from '../tasks/constants';
import { getTaskColor } from '../tasks/utils';
import { TaskTitle } from '../tasks/TaskTitle';
import {
  formatWeekRangeLabel,
  getWeekDays,
  getWeekRangeKeys,
} from './utils';

export function PlannerView() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const { rangeStart, rangeEnd } = useMemo(
    () => getWeekRangeKeys(weekDays),
    [weekDays],
  );

  const events = useLiveQuery(
    () =>
      db.events
        .where('date')
        .between(rangeStart, rangeEnd, true, true)
        .toArray(),
    [rangeStart, rangeEnd],
  );

  const tasks = useLiveQuery(
    () =>
      db.tasks
        .where('date')
        .between(rangeStart, rangeEnd, true, true)
        .toArray(),
    [rangeStart, rangeEnd],
  );

  const eventsByDate = useMemo(
    () => groupEventsByDate(events ?? []),
    [events],
  );

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of tasks ?? []) {
      if (!task.date) continue;
      const list = map.get(task.date) ?? [];
      list.push(task);
      map.set(task.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
    }
    return map;
  }, [tasks]);

  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const goToNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));
  const goToThisWeek = () => setSelectedDate(new Date());

  return (
    <div className="min-w-0 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex min-w-0 flex-col gap-3 border-b border-gray-100 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
            Weekly Planner
          </h2>
          <p className="mt-0.5 truncate text-xs text-gray-500 sm:text-sm">
            {formatWeekRangeLabel(weekDays)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={goToThisWeek}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50 sm:px-3 sm:text-sm"
          >
            This week
          </button>
          <button
            type="button"
            onClick={goToPreviousWeek}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Previous week"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Next week"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="hidden min-w-0 gap-1.5 p-2 lg:grid lg:grid-cols-7 lg:p-3">
        {weekDays.map((day, index) => (
          <PlannerDayColumn
            key={formatDateKey(day)}
            day={day}
            weekdayLabel={WEEKDAY_LABELS[index]}
            events={eventsByDate.get(formatDateKey(day)) ?? []}
            tasks={tasksByDate.get(formatDateKey(day)) ?? []}
            compact
          />
        ))}
      </div>

      <div className="flex flex-col gap-4 p-3 lg:hidden">
        {weekDays.map((day, index) => (
          <PlannerDayColumn
            key={formatDateKey(day)}
            day={day}
            weekdayLabel={WEEKDAY_LABELS[index]}
            events={eventsByDate.get(formatDateKey(day)) ?? []}
            tasks={tasksByDate.get(formatDateKey(day)) ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function PlannerDayColumn({
  day,
  weekdayLabel,
  events,
  tasks,
  compact = false,
}: {
  day: Date;
  weekdayLabel: string;
  events: CalendarEvent[];
  tasks: Task[];
  compact?: boolean;
}) {
  const openEventModal = useUIStore((s) => s.openEventModal);
  const openTaskModal = useUIStore((s) => s.openTaskModal);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events],
  );

  const today = isToday(day);

  return (
    <div
      className={clsx(
        'box-border w-full min-w-0 rounded-xl border-2',
        compact
          ? 'flex min-h-0 flex-col p-2'
          : 'flex flex-col p-3',
        today
          ? 'border-sky-300 bg-sky-50/80'
          : 'border-gray-100 bg-gray-50/50',
      )}
    >
      <div className="min-w-0 border-b border-gray-100 pb-2">
        <p
          className={clsx(
            'truncate font-semibold uppercase tracking-wide text-gray-400',
            compact ? 'text-[9px] xl:text-[10px]' : 'text-xs',
          )}
        >
          {weekdayLabel}
        </p>
        <p
          className={clsx(
            'truncate font-semibold',
            compact ? 'text-xs lg:text-sm' : 'text-base',
            today ? 'text-sky-600' : 'text-gray-900',
          )}
        >
          {format(day, compact ? 'd' : 'MMM d, yyyy')}
        </p>
      </div>

      <div
        className={clsx(
          'min-w-0',
          compact
            ? 'mb-2 flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden'
            : 'flex flex-col gap-2 py-3',
        )}
      >
        {sortedEvents.length === 0 && tasks.length === 0 && (
          <p className="py-1 text-center text-xs text-gray-400">Nothing planned</p>
        )}

        {sortedEvents.map((event) => (
          <button
            key={event.id}
            type="button"
            onClick={() => openEventModal(day, event.id)}
            className="w-full min-w-0 rounded-lg px-2 py-1.5 text-left transition hover:opacity-80"
            style={{ backgroundColor: `${event.color}66` }}
          >
            <EmojiTitle
              title={event.title}
              emoji={event.emoji}
              titleClassName={clsx(
                'font-medium text-gray-900',
                compact ? 'text-[10px] xl:text-xs' : 'text-sm',
              )}
            />
            {!compact && (
              <p className="truncate text-xs text-gray-600">
                {event.startTime}
                {event.endTime !== event.startTime ? ` – ${event.endTime}` : ''}
              </p>
            )}
          </button>
        ))}

        {tasks.length > 0 && (
          <div className="min-w-0 space-y-1.5">
            {sortedEvents.length > 0 && (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Tasks
              </p>
            )}
            {tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => openTaskModal(task.id)}
                className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-gray-100 bg-white px-2 py-1.5 text-left transition hover:bg-gray-50"
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: getTaskColor(task, DEFAULT_TASK_COLOR),
                  }}
                />
                <TaskTitle
                  title={task.title}
                  emoji={task.emoji}
                  completed={task.completed}
                  className="min-w-0 flex-1"
                  titleClassName={clsx(
                    compact ? 'text-[10px] xl:text-xs' : 'text-sm',
                    !task.completed && 'text-gray-800',
                  )}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <div
        className={clsx(
          'grid w-full min-w-0 gap-2 border-t border-gray-100 pt-3',
          compact ? 'mt-auto grid-cols-1 gap-1 pt-2' : 'grid-cols-2',
        )}
      >
        <button
          type="button"
          onClick={() => openEventModal(day)}
          aria-label="Add event"
          className={clsx(
            'flex w-full min-w-0 items-center justify-center gap-1.5 rounded-lg bg-white font-medium text-sky-600 ring-1 ring-gray-100 transition hover:bg-sky-50',
            compact ? 'px-1 py-1.5 text-[10px]' : 'px-2 py-2 text-xs',
          )}
        >
          <CalendarPlus size={compact ? 12 : 16} className="shrink-0" />
          <span className={clsx(compact && 'sr-only xl:not-sr-only')}>Event</span>
        </button>
        <button
          type="button"
          onClick={() => openTaskModal(undefined, day)}
          aria-label="Add task"
          className={clsx(
            'flex w-full min-w-0 items-center justify-center gap-1.5 rounded-lg bg-white font-medium text-violet-600 ring-1 ring-gray-100 transition hover:bg-violet-50',
            compact ? 'px-1 py-1.5 text-[10px]' : 'px-2 py-2 text-xs',
          )}
        >
          <ListPlus size={compact ? 12 : 16} className="shrink-0" />
          <span className={clsx(compact && 'sr-only xl:not-sr-only')}>Task</span>
        </button>
      </div>
    </div>
  );
}
