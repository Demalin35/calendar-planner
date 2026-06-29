import clsx from 'clsx';
import { addDays, format, isToday, subDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { EmojiTitle } from '../../components/EmojiTitle';
import { PastelChip } from '../../components/PastelChip';
import { themeClasses } from '../../constants/theme';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { CalendarEvent } from '../../types';
import {
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
  MIN_TIMED_EVENT_HEIGHT_DESKTOP,
  MIN_TIMED_EVENT_HEIGHT_MOBILE,
} from './constants';
import { layoutDayViewTimedEvents } from './dayViewLayout';
import {
  formatDateKey,
  formatHourLabel,
  formatHourSlotTime,
  getDayTimelineHours,
  getSuggestedEndTime,
  isAllDayEvent,
  isTimedEvent,
  isUntimedEvent,
} from './utils';

const timelineHours = getDayTimelineHours();
const timelineHeight = timelineHours.length * HOUR_HEIGHT_PX;

function useMinTimedEventHeight() {
  const [minHeight, setMinHeight] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(min-width: 768px)').matches
      ? MIN_TIMED_EVENT_HEIGHT_DESKTOP
      : MIN_TIMED_EVENT_HEIGHT_MOBILE,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const update = () =>
      setMinHeight(
        mediaQuery.matches
          ? MIN_TIMED_EVENT_HEIGHT_DESKTOP
          : MIN_TIMED_EVENT_HEIGHT_MOBILE,
      );

    update();
    mediaQuery.addEventListener('change', update);
    return () => mediaQuery.removeEventListener('change', update);
  }, []);

  return minHeight;
}

export function DayView() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const openEventModal = useUIStore((s) => s.openEventModal);
  const minEventHeight = useMinTimedEventHeight();

  const dateKey = formatDateKey(selectedDate);

  const events = useLiveQuery(
    () => db.events.where('date').equals(dateKey).toArray(),
    [dateKey],
  );

  const { allDayEvents, untimedEvents, timedEvents } = useMemo(() => {
    const list = events ?? [];
    return {
      allDayEvents: list.filter(isAllDayEvent),
      untimedEvents: list.filter(isUntimedEvent),
      timedEvents: list.filter(isTimedEvent),
    };
  }, [events]);

  const timedEventLayouts = useMemo(
    () =>
      layoutDayViewTimedEvents(timedEvents, HOUR_HEIGHT_PX, minEventHeight),
    [timedEvents, minEventHeight],
  );

  const goToPreviousDay = () => setSelectedDate(subDays(selectedDate, 1));
  const goToNextDay = () => setSelectedDate(addDays(selectedDate, 1));
  const goToToday = () => setSelectedDate(new Date());

  const openSlot = (hour: number) => {
    const startTime = formatHourSlotTime(hour);
    openEventModal(
      selectedDate,
      undefined,
      startTime,
      getSuggestedEndTime(hour),
    );
  };

  return (
    <div className={themeClasses.card}>
      <div className={clsx('flex min-w-0 flex-col gap-3 px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6', themeClasses.cardHeader)}>
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug text-foreground sm:text-lg lg:text-xl">
            <span className="sm:hidden">{format(selectedDate, 'EEE, MMM d')}</span>
            <span className="hidden sm:inline">
              {format(selectedDate, 'EEEE, MMMM d, yyyy')}
            </span>
          </h2>
          {isToday(selectedDate) && (
            <p className="mt-0.5 text-xs font-medium text-primary-strong sm:text-sm">
              Today
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={goToToday}
            className={clsx('rounded-lg px-3 py-1.5 text-xs sm:text-sm', themeClasses.linkBtn)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={goToPreviousDay}
            className={clsx('rounded-lg p-2', themeClasses.ghostBtn)}
            aria-label="Previous day"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={goToNextDay}
            className={clsx('rounded-lg p-2', themeClasses.ghostBtn)}
            aria-label="Next day"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {(allDayEvents.length > 0 || untimedEvents.length > 0) && (
        <div className="space-y-3 border-b border-border px-4 py-3 sm:px-6">
          {allDayEvents.length > 0 && (
            <DayEventSection label="All day" events={allDayEvents} />
          )}
          {untimedEvents.length > 0 && (
            <DayEventSection label="No time" events={untimedEvents} />
          )}
        </div>
      )}

      <div className="max-h-[calc(100svh-17rem)] overflow-y-auto sm:max-h-[calc(100svh-19rem)]">
        <div
          className="relative min-w-0 px-2 py-3 sm:px-4"
          style={{ height: timelineHeight }}
        >
          {timelineHours.map((hour) => {
            const top = (hour - DAY_START_HOUR) * HOUR_HEIGHT_PX;

            return (
              <div
                key={hour}
                className="absolute left-0 right-0 flex"
                style={{ top, height: HOUR_HEIGHT_PX }}
              >
                <div className="w-12 shrink-0 pr-2 pt-1 text-right text-[10px] font-medium text-muted sm:w-16 sm:text-xs">
                  {formatHourLabel(hour)}
                </div>
                <button
                  type="button"
                  onClick={() => openSlot(hour)}
                  className="group relative min-h-0 flex-1 border-t border-border text-left transition hover:bg-primary-soft/60"
                  aria-label={`Add event at ${formatHourLabel(hour)}`}
                >
                  <span className="sr-only">
                    Add event at {formatHourLabel(hour)}
                  </span>
                </button>
              </div>
            );
          })}

          <div className="pointer-events-none absolute bottom-0 left-12 right-0 top-0 sm:left-16">
            {timedEventLayouts.map((layout) => (
              <TimedEventBlock
                key={layout.event.id}
                event={layout.event}
                top={layout.top}
                height={layout.height}
                column={layout.column}
                columnCount={layout.columnCount}
                onClick={() => openEventModal(selectedDate, layout.event.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayEventSection({
  label,
  events,
}: {
  label: string;
  events: CalendarEvent[];
}) {
  const openEventModal = useUIStore((s) => s.openEventModal);
  const selectedDate = useUIStore((s) => s.selectedDate);

  return (
    <div>
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {events.map((event) => (
          <PastelChip
            key={event.id}
            color={event.color}
            onClick={() => openEventModal(selectedDate, event.id)}
            className="rounded-lg px-3 py-1.5 text-left text-xs font-medium sm:text-sm"
          >
            <EmojiTitle
              title={event.title}
              emoji={event.emoji}
              titleClassName="text-xs font-medium sm:text-sm"
            />
          </PastelChip>
        ))}
      </div>
    </div>
  );
}

function TimedEventBlock({
  event,
  top,
  height,
  column,
  columnCount,
  onClick,
}: {
  event: CalendarEvent;
  top: number;
  height: number;
  column: number;
  columnCount: number;
  onClick: () => void;
}) {
  const widthPercent = 100 / columnCount;
  const leftPercent = column * widthPercent;
  const horizontalGap = 4;

  return (
    <PastelChip
      color={event.color}
      onClick={onClick}
      className={clsx(
        'pointer-events-auto absolute flex min-w-0 flex-col justify-start rounded-lg border border-black/10 px-2 py-1.5 text-left shadow-sm sm:px-2.5 sm:py-2',
      )}
      style={{
        top,
        height,
        left: `calc(${leftPercent}% + ${horizontalGap}px)`,
        width: `calc(${widthPercent}% - ${horizontalGap * 2}px)`,
      }}
    >
      <EmojiTitle
        title={event.title}
        emoji={event.emoji}
        compact
        className="min-w-0 shrink-0"
        titleClassName="truncate text-[11px] font-semibold leading-tight sm:text-xs"
      />
      <p
        className="mt-0.5 shrink-0 truncate text-[10px] leading-tight sm:text-[11px]"
        style={{ opacity: 0.85 }}
      >
        {event.startTime} – {event.endTime}
      </p>
    </PastelChip>
  );
}
