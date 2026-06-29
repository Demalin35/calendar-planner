import type { CalendarEvent } from '../../types';
import { parseTimeToMinutes } from './utils';

const MINUTES_PER_DAY = 24 * 60;

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
    return { start: 0, end: MINUTES_PER_DAY };
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

export function isEventTimeRangeInvalid(
  startTime: string,
  endTime: string,
): boolean {
  if (isAllDayTimeRange(startTime, endTime)) return false;
  if (isUntimedTimeRange(startTime, endTime)) return false;
  return parseTimeToMinutes(endTime) <= parseTimeToMinutes(startTime);
}

export function hasEventTimeConflict(
  date: string,
  startTime: string,
  endTime: string,
  existingEvents: CalendarEvent[],
  editingEventId?: string | null,
): boolean {
  const newRange = getConflictableTimeRange(startTime, endTime);
  if (!newRange) return false;

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
        newRange.start,
        newRange.end,
        existingRange.start,
        existingRange.end,
      )
    ) {
      return true;
    }
  }

  return false;
}
