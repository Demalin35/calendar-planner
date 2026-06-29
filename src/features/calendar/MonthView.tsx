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
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { CalendarEvent } from '../../types';
import { WEEKDAY_LABELS } from './constants';
import {
  formatDateKey,
  getMonthGridDays,
  groupEventsByDate,
} from './utils';

const MAX_VISIBLE_EVENTS = 3;

export function MonthView() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const openEventModal = useUIStore((s) => s.openEventModal);

  const gridDays = useMemo(
    () => getMonthGridDays(selectedDate),
    [selectedDate],
  );

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

  const eventsByDate = useMemo(
    () => groupEventsByDate(events ?? []),
    [events],
  );

  const goToPreviousMonth = () => setSelectedDate(subMonths(selectedDate, 1));
  const goToNextMonth = () => setSelectedDate(addMonths(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
      <div className="flex min-w-0 items-center justify-between gap-2 border-b border-gray-100 px-3 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-gray-900 sm:text-xl">
            {format(selectedDate, 'MMMM yyyy')}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-sky-600 transition hover:bg-sky-50 sm:text-sm"
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Previous month"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
            aria-label="Next month"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-7 border-b border-gray-100 bg-gray-50/80">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="min-w-0 px-0.5 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-gray-400 sm:px-1 sm:text-xs"
          >
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.charAt(0)}</span>
          </div>
        ))}
      </div>

      <div className="grid min-w-0 grid-cols-7">
        {gridDays.map((day) => {
          const dateKey = formatDateKey(day);
          const dayEvents = eventsByDate.get(dateKey) ?? [];
          const inCurrentMonth = isSameMonth(day, selectedDate);
          const isSelected = isSameDay(day, selectedDate);

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => openEventModal(day)}
              className={clsx(
                'group flex min-h-[72px] min-w-0 flex-col border-b border-r border-gray-100 p-0.5 text-left transition hover:bg-sky-50/50 sm:min-h-[100px] sm:p-1.5',
                !inCurrentMonth && 'bg-gray-50/50',
                isSelected && 'bg-sky-50 ring-1 ring-inset ring-sky-200',
              )}
            >
              <span
                className={clsx(
                  'mb-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium sm:text-sm',
                  isToday(day) && 'bg-sky-500 text-white',
                  !isToday(day) && inCurrentMonth && 'text-gray-800',
                  !isToday(day) && !inCurrentMonth && 'text-gray-300',
                )}
              >
                {format(day, 'd')}
              </span>

              <div className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map((event) => (
                  <EventPill
                    key={event.id}
                    event={event}
                    onClick={(e) => {
                      e.stopPropagation();
                      openEventModal(day, event.id);
                    }}
                  />
                ))}
                {dayEvents.length > MAX_VISIBLE_EVENTS && (
                  <span className="truncate px-1 text-[10px] font-medium text-gray-400 sm:text-xs">
                    +{dayEvents.length - MAX_VISIBLE_EVENTS} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EventPill({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent);
        }
      }}
      className="truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium text-gray-800 sm:text-xs"
      style={{ backgroundColor: `${event.color}66` }}
    >
      {event.title}
    </span>
  );
}
