import clsx from 'clsx';
import { addWeeks, format, isSameDay, isToday, subWeeks } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { EmojiTitle } from '../../components/EmojiTitle';
import { themeClasses } from '../../constants/theme';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { CalendarEvent, Task } from '../../types';
import { getItemColorStyle, normalizeItemColor, parseHexColor } from '../../utils/color';
import { getWeekDays, getWeekRangeKeys } from '../planner/utils';
import { DEFAULT_TASK_COLOR } from '../tasks/constants';
import { getTaskColor } from '../tasks/utils';
import {
  formatDateKey,
  getMobileEventTimeMeta,
  groupEventsByDate,
} from './utils';

const MOBILE_BLOCK_HEIGHT = 76;
const MOBILE_GRID_COLS = 3;

function formatMobileWeekRange(days: Date[]): string {
  if (days.length === 0) return '';

  const start = days[0];
  const end = days[days.length - 1];

  if (format(start, 'MMMM yyyy') === format(end, 'MMMM yyyy')) {
    return `${format(start, 'd')} - ${format(end, 'd')} ${format(end, 'MMMM')}`;
  }

  return `${format(start, 'd MMM')} - ${format(end, 'd MMM yyyy')}`;
}

export function MobileWeekCalendar() {
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
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return a.title.localeCompare(b.title);
      });
    }
    return map;
  }, [tasks]);

  const goToPreviousWeek = () => setSelectedDate(subWeeks(selectedDate, 1));
  const goToNextWeek = () => setSelectedDate(addWeeks(selectedDate, 1));
  const goToThisWeek = () => setSelectedDate(new Date());

  return (
    <div className={themeClasses.card}>
      <div
        className={clsx(
          'flex min-w-0 items-center justify-between gap-2 px-3 py-3',
          themeClasses.cardHeader,
        )}
      >
        <h2 className={clsx('min-w-0 truncate text-base font-semibold', themeClasses.heading)}>
          {formatMobileWeekRange(weekDays)}
        </h2>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={goToThisWeek}
            className={clsx('rounded-lg px-2 py-1 text-xs', themeClasses.linkBtn)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToPreviousWeek}
            className={clsx('rounded-lg p-1.5', themeClasses.ghostBtn)}
            aria-label="Previous week"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={goToNextWeek}
            className={clsx('rounded-lg p-1.5', themeClasses.ghostBtn)}
            aria-label="Next week"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="min-w-0 divide-y divide-border">
        {weekDays.map((day) => {
          const dateKey = formatDateKey(day);
          const dayEvents = [...(eventsByDate.get(dateKey) ?? [])].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );
          const dayTasks = tasksByDate.get(dateKey) ?? [];

          return (
            <MobileDayRow
              key={dateKey}
              day={day}
              events={dayEvents}
              tasks={dayTasks}
              isSelected={isSameDay(day, selectedDate)}
              isToday={isToday(day)}
            />
          );
        })}
      </div>
    </div>
  );
}

function MobileDayRow({
  day,
  events,
  tasks,
  isSelected,
  isToday: today,
}: {
  day: Date;
  events: CalendarEvent[];
  tasks: Task[];
  isSelected: boolean;
  isToday: boolean;
}) {
  const openEventModal = useUIStore((s) => s.openEventModal);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const items = events.length + tasks.length;
  const useHorizontalScroll = items > MOBILE_GRID_COLS * 2;

  return (
    <div
      className={clsx(
        'relative grid min-h-[76px] min-w-0 grid-cols-[52px_1fr]',
        isSelected && 'bg-selected/50',
      )}
    >
      {isSelected && (
        <div
          className="absolute bottom-0 left-0 top-0 w-1 bg-primary"
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={() => {
          setSelectedDate(day);
          openEventModal(day);
        }}
        className={clsx(
          'flex flex-col items-center justify-center border-r border-border py-2 text-center',
          isSelected && 'text-primary-strong',
        )}
      >
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {format(day, 'EEE')}
        </span>
        <span
          className={clsx(
            'mt-0.5 flex h-7 w-7 items-center justify-center text-sm font-semibold',
            today && themeClasses.todayCircle,
            !today && 'text-foreground',
            isSelected && !today && 'text-primary-strong',
          )}
        >
          {format(day, 'd')}
        </span>
      </button>

      <div className="min-w-0 p-1">
        {items === 0 ? (
          <button
            type="button"
            onClick={() => openEventModal(day)}
            className="flex h-[76px] w-full items-center justify-center rounded-sm border border-dashed border-border/80 text-[11px] text-muted transition hover:border-primary hover:bg-surface-soft"
            aria-label={`Add event on ${format(day, 'MMMM d')}`}
          />
        ) : (
          <div
            className={clsx(
              'min-w-0',
              useHorizontalScroll && 'overflow-x-auto overscroll-x-contain',
            )}
          >
            <div
              className={clsx(
                useHorizontalScroll
                  ? 'inline-grid auto-cols-[minmax(88px,1fr)] grid-flow-col gap-1'
                  : 'grid grid-cols-3 gap-1',
              )}
              style={
                useHorizontalScroll
                  ? { gridTemplateRows: `repeat(2, ${MOBILE_BLOCK_HEIGHT}px)` }
                  : undefined
              }
            >
              {events.map((event) => (
                <MobileEventBlock key={event.id} day={day} event={event} />
              ))}
              {tasks.map((task) => (
                <MobileTaskBlock key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MobileEventBlock({ day, event }: { day: Date; event: CalendarEvent }) {
  const openEventModal = useUIStore((s) => s.openEventModal);
  const theme = useUIStore((s) => s.theme);
  const { time, duration } = getMobileEventTimeMeta(event);
  const style = getItemColorStyle(event.color, theme);
  const rgb = parseHexColor(normalizeItemColor(event.color));
  const accent = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : style.borderColor;

  return (
    <button
      type="button"
      onClick={() => openEventModal(day, event.id)}
      className="flex min-w-0 flex-col justify-between overflow-hidden rounded-sm px-1.5 py-1 text-left transition hover:brightness-[0.98]"
      style={{
        height: MOBILE_BLOCK_HEIGHT,
        backgroundColor: style.backgroundColor,
        borderTop: `3px solid ${accent}`,
        color: style.color,
      }}
    >
      <EmojiTitle
        title={event.title}
        emoji={event.emoji}
        compact
        className="w-full"
        titleClassName="line-clamp-2 text-[11px] font-medium leading-tight"
      />
      {(time || duration) && (
        <div className="mt-auto flex min-w-0 items-baseline gap-1 text-[10px] leading-none opacity-80">
          {time && <span className="truncate">{time}</span>}
          {duration && <span className="shrink-0">{duration}</span>}
        </div>
      )}
    </button>
  );
}

function MobileTaskBlock({ task }: { task: Task }) {
  const openTaskModal = useUIStore((s) => s.openTaskModal);
  const theme = useUIStore((s) => s.theme);
  const color = getTaskColor(task, DEFAULT_TASK_COLOR);
  const style = getItemColorStyle(color, theme);
  const rgb = parseHexColor(normalizeItemColor(color));
  const accent = rgb ? `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})` : style.borderColor;

  return (
    <button
      type="button"
      onClick={() => openTaskModal(task.id)}
      className="flex min-w-0 flex-col justify-between overflow-hidden rounded-sm px-1.5 py-1 text-left transition hover:brightness-[0.98]"
      style={{
        height: MOBILE_BLOCK_HEIGHT,
        backgroundColor: style.backgroundColor,
        borderTop: `3px solid ${accent}`,
        color: style.color,
      }}
    >
      <EmojiTitle
        title={task.title}
        emoji={task.emoji}
        completed={task.completed}
        compact
        className="w-full"
        titleClassName={clsx(
          'line-clamp-2 text-[11px] font-medium leading-tight',
          task.completed && 'opacity-60',
        )}
      />
      <span className="mt-auto text-[10px] leading-none opacity-80">Task</span>
    </button>
  );
}
