import type { CalendarEventDto } from './types.js';

export const DEFAULT_WORK_DAY_START = '09:00';
export const DEFAULT_WORK_DAY_END = '18:00';
export const DEFAULT_EVENT_COLOR = '#D7EAF5';

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function minutesToTime(totalMinutes: number): string {
  const clamped = Math.max(0, Math.min(totalMinutes, 23 * 60 + 59));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function isAllDayTimeRange(startTime: string, endTime: string): boolean {
  return startTime === '00:00' && (endTime === '23:59' || endTime === '24:00');
}

export function isUntimedTimeRange(startTime: string, endTime: string): boolean {
  return !isAllDayTimeRange(startTime, endTime) && startTime === endTime;
}

export function getConflictableTimeRange(
  startTime: string,
  endTime: string,
): { start: number; end: number } | null {
  if (isUntimedTimeRange(startTime, endTime)) return null;
  if (isAllDayTimeRange(startTime, endTime)) {
    return { start: 0, end: 24 * 60 };
  }
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (end <= start) return null;
  return { start, end };
}

export function doTimeRangesOverlap(
  startA: number,
  endA: number,
  startB: number,
  endB: number,
): boolean {
  return startA < endB && endA > startB;
}

export function hasEventTimeConflict(
  date: string,
  startTime: string,
  endTime: string,
  existingEvents: CalendarEventDto[],
  editingEventId?: string | null,
  bufferBeforeMinutes = 0,
  bufferAfterMinutes = 0,
): { conflict: boolean; conflictingEvents: CalendarEventDto[] } {
  const newRange = getConflictableTimeRange(startTime, endTime);
  if (!newRange) return { conflict: false, conflictingEvents: [] };

  const buffered = {
    start: newRange.start - bufferBeforeMinutes,
    end: newRange.end + bufferAfterMinutes,
  };

  const conflictingEvents: CalendarEventDto[] = [];

  for (const existing of existingEvents) {
    if (existing.date !== date) continue;
    if (editingEventId && existing.id === editingEventId) continue;

    const existingRange = getConflictableTimeRange(
      existing.startTime,
      existing.endTime,
    );
    if (!existingRange) continue;

    if (
      doTimeRangesOverlap(
        buffered.start,
        buffered.end,
        existingRange.start,
        existingRange.end,
      )
    ) {
      conflictingEvents.push(existing);
    }
  }

  return {
    conflict: conflictingEvents.length > 0,
    conflictingEvents,
  };
}

export function findFreeSlots(params: {
  date: string;
  durationMinutes: number;
  events: CalendarEventDto[];
  workDayStart?: string;
  workDayEnd?: string;
  preferAfter?: string;
  preferBefore?: string;
}): Array<{ startTime: string; endTime: string }> {
  const workStart = parseTimeToMinutes(
    params.workDayStart ?? DEFAULT_WORK_DAY_START,
  );
  const workEnd = parseTimeToMinutes(params.workDayEnd ?? DEFAULT_WORK_DAY_END);
  const duration = params.durationMinutes;
  const preferAfter = params.preferAfter
    ? parseTimeToMinutes(params.preferAfter)
    : workStart;
  const preferBefore = params.preferBefore
    ? parseTimeToMinutes(params.preferBefore)
    : workEnd;

  const occupied = params.events
    .filter((event) => event.date === params.date)
    .map((event) => getConflictableTimeRange(event.startTime, event.endTime))
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);

  const slots: Array<{ startTime: string; endTime: string }> = [];
  const searchStart = Math.max(workStart, preferAfter);
  const searchEnd = Math.min(workEnd, preferBefore);

  for (let start = searchStart; start + duration <= searchEnd; start += 15) {
    const end = start + duration;
    const overlaps = occupied.some((range) =>
      doTimeRangesOverlap(start, end, range.start, range.end),
    );
    if (!overlaps) {
      slots.push({
        startTime: minutesToTime(start),
        endTime: minutesToTime(end),
      });
      if (slots.length >= 5) break;
    }
  }

  return slots;
}

export function describeGapBeforeConflict(params: {
  date: string;
  startTime: string;
  endTime: string;
  events: CalendarEventDto[];
}): {
  availableMinutes: number | null;
  nextEvent: CalendarEventDto | null;
} {
  const start = parseTimeToMinutes(params.startTime);
  const requestedEnd = parseTimeToMinutes(params.endTime);
  const sameDay = params.events
    .filter((event) => event.date === params.date)
    .map((event) => ({
      event,
      range: getConflictableTimeRange(event.startTime, event.endTime),
    }))
    .filter(
      (
        entry,
      ): entry is {
        event: CalendarEventDto;
        range: { start: number; end: number };
      } => entry.range !== null,
    )
    .sort((a, b) => a.range.start - b.range.start);

  const next = sameDay.find((entry) => entry.range.start > start);
  if (!next) {
    return { availableMinutes: null, nextEvent: null };
  }

  const availableMinutes = Math.max(0, next.range.start - start);
  if (requestedEnd <= next.range.start) {
    return { availableMinutes, nextEvent: null };
  }

  return { availableMinutes, nextEvent: next.event };
}
