import clsx from 'clsx';
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  subMonths,
} from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { EmojiTitle } from '../../components/EmojiTitle';
import { themeClasses } from '../../constants/theme';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { CalendarEvent, Task } from '../../types';
import { WEEKDAY_LABELS } from './constants';
import {
  chunkIntoWeeks,
  formatDateKey,
  getMonthGridDays,
  groupEventsByDate,
} from './utils';

export function MonthView() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);

  const gridDays = useMemo(
    () => getMonthGridDays(selectedDate),
    [selectedDate],
  );

  const weeks = useMemo(() => chunkIntoWeeks(gridDays), [gridDays]);

  const rangeStart = formatDateKey(gridDays[0]);
  const rangeEnd = formatDateKey(gridDays[gridDays.length - 1]);

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
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [tasks]);

  const goToPreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const goToNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className={themeClasses.card}>
      <div className={clsx('flex min-w-0 items-center justify-between gap-2 px-3 py-4 sm:px-6', themeClasses.cardHeader)}>
        <div className="min-w-0">
          <h2 className={clsx('truncate text-lg sm:text-xl', themeClasses.heading)}>
            {format(selectedDate, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            className={clsx('rounded-lg px-3 py-1.5 text-xs sm:text-sm', themeClasses.linkBtn)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToPreviousMonth}
            className={clsx('rounded-lg p-2', themeClasses.ghostBtn)}
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className={clsx('rounded-lg p-2', themeClasses.ghostBtn)}
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-7 border-b border-border bg-surface-soft/80">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="min-w-0 px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted sm:px-1 sm:text-xs"
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="min-w-0">
        {weeks.map((week) => (
          <div
            key={formatDateKey(week[0])}
            className="grid min-w-0 grid-cols-7 items-stretch"
          >
            {week.map((day) => (
              <MonthDayCell
                key={formatDateKey(day)}
                day={day}
                month={selectedDate}
                events={eventsByDate.get(formatDateKey(day)) ?? []}
                tasks={tasksByDate.get(formatDateKey(day)) ?? []}
                isSelected={isSameDay(day, selectedDate)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthDayCell({
  day,
  month,
  events,
  tasks,
  isSelected,
}: {
  day: Date;
  month: Date;
  events: CalendarEvent[];
  tasks: Task[];
  isSelected: boolean;
}) {
  const openEventModal = useUIStore((s) => s.openEventModal);
  const openTaskModal = useUIStore((s) => s.openTaskModal);
  const inCurrentMonth = isSameMonth(day, month);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events],
  );

  return (
    <div
      className={clsx(
        'flex min-h-14 min-w-0 flex-col border-b border-r border-border p-0.5 sm:min-h-16 sm:p-1',
        !inCurrentMonth && 'bg-surface-soft/50',
        isSelected && themeClasses.selectedDay,
      )}
    >
      <button
        type="button"
        onClick={() => openEventModal(day)}
        className="mb-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition hover:bg-primary-soft sm:h-6 sm:w-6 sm:text-xs"
        aria-label={`Add event on ${format(day, 'MMMM d')}`}
      >
        <span
          className={clsx(
            'inline-flex h-full w-full items-center justify-center rounded-full',
            isToday(day) && themeClasses.todayCircle,
            !isToday(day) && inCurrentMonth && 'text-foreground',
            !isToday(day) && !inCurrentMonth && 'text-muted/50',
          )}
        >
          {format(day, 'd')}
        </span>
      </button>

      <div className="flex min-w-0 flex-col gap-0.5 pb-0.5">
        {sortedEvents.map((event) => (
          <MonthEventBar
            key={event.id}
            event={event}
            onClick={() => openEventModal(day, event.id)}
          />
        ))}
        {tasks.map((task) => (
          <MonthTaskBar
            key={task.id}
            task={task}
            onClick={() => openTaskModal(task.id)}
          />
        ))}
      </div>
    </div>
  );
}

function MonthEventBar({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full min-w-0 overflow-hidden rounded px-1 py-px text-left leading-tight transition hover:brightness-95 sm:rounded-md sm:px-1.5 sm:py-0.5"
      style={{ backgroundColor: `${event.color}66` }}
    >
      <EmojiTitle
        title={event.title}
        emoji={event.emoji}
        compact
        className="w-full"
        titleClassName="text-[10px] font-medium text-foreground sm:text-xs"
      />
    </button>
  );
}

function MonthTaskBar({
  task,
  onClick,
}: {
  task: Task;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full min-w-0 overflow-hidden rounded border border-border bg-surface px-1 py-px text-left leading-tight transition hover:bg-surface-soft sm:rounded-md sm:px-1.5 sm:py-0.5"
    >
      <EmojiTitle
        title={task.title}
        emoji={task.emoji}
        completed={task.completed}
        compact
        className="w-full"
        titleClassName="text-[10px] font-medium text-muted sm:text-xs"
      />
    </button>
  );
}
