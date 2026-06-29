import clsx from 'clsx';
import { addDays, format, isToday, subDays } from 'date-fns';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { EmojiTitle } from '../../components/EmojiTitle';
import { PastelChip } from '../../components/PastelChip';
import { themeClasses } from '../../constants/theme';
import { db } from '../../db';
import { useUIStore } from '../../store/uiStore';
import type { CalendarEvent } from '../../types';
import {
  DAY_START_HOUR,
  HOUR_HEIGHT_PX,
} from './constants';
import {
  formatDateKey,
  formatHourLabel,
  formatHourSlotTime,
  getDayTimelineHours,
  getEventTimelinePosition,
  getSuggestedEndTime,
  isAllDayEvent,
  isTimedEvent,
  isUntimedEvent,
} from './utils';

const timelineHours = getDayTimelineHours();
const timelineHeight = timelineHours.length * HOUR_HEIGHT_PX;

export function DayView() {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const openEventModal = useUIStore((s) => s.openEventModal);

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
            {timedEvents.map((event) => {
              const position = getEventTimelinePosition(event, HOUR_HEIGHT_PX);
              if (!position) return null;

              return (
                <TimedEventBlock
                  key={event.id}
                  event={event}
                  top={position.top}
                  height={position.height}
                  onClick={() => openEventModal(selectedDate, event.id)}
                />
              );
            })}
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
  onClick,
}: {
  event: CalendarEvent;
  top: number;
  height: number;
  onClick: () => void;
}) {
  return (
    <PastelChip
      color={event.color}
      onClick={onClick}
      className={clsx(
        'pointer-events-auto absolute left-1 right-2 overflow-hidden rounded-lg border border-black/10 px-2 py-1 text-left shadow-sm sm:left-2 sm:right-3 sm:px-3 sm:py-1.5',
      )}
      style={{ top, height }}
    >
      <EmojiTitle
        title={event.title}
        emoji={event.emoji}
        titleClassName="text-xs font-semibold sm:text-sm"
      />
      <p className="truncate text-[10px] sm:text-xs" style={{ opacity: 0.85 }}>
        {event.startTime} – {event.endTime}
      </p>
    </PastelChip>
  );
}
