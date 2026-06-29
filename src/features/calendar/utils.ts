import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { CalendarEvent } from '../../types';
import { DAY_END_HOUR, DAY_START_HOUR } from './constants';

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getMonthGridDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  return eachDayOfInterval({ start, end });
}

export function groupEventsByDate<T extends { date: string }>(
  events: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const event of events) {
    const list = map.get(event.date) ?? [];
    list.push(event);
    map.set(event.date, list);
  }
  return map;
}

export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function formatHourSlotTime(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`;
}

export function getSuggestedEndTime(startHour: number): string {
  if (startHour >= DAY_END_HOUR) return '23:59';
  return formatHourSlotTime(startHour + 1);
}

export function isAllDayEvent(event: CalendarEvent): boolean {
  return (
    event.startTime === '00:00' &&
    (event.endTime === '23:59' || event.endTime === '24:00')
  );
}

export function isUntimedEvent(event: CalendarEvent): boolean {
  return !isAllDayEvent(event) && event.startTime === event.endTime;
}

export function isTimedEvent(event: CalendarEvent): boolean {
  return !isAllDayEvent(event) && !isUntimedEvent(event);
}

export function getDayTimelineHours(): number[] {
  const hours: number[] = [];
  for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour++) {
    hours.push(hour);
  }
  return hours;
}

export function getEventTimelinePosition(
  event: CalendarEvent,
  hourHeight: number,
): { top: number; height: number } | null {
  if (!isTimedEvent(event)) return null;

  const dayStart = DAY_START_HOUR * 60;
  const dayEnd = (DAY_END_HOUR + 1) * 60;
  const start = Math.max(parseTimeToMinutes(event.startTime), dayStart);
  const end = Math.min(parseTimeToMinutes(event.endTime), dayEnd);

  if (end <= dayStart || start >= dayEnd) return null;

  const top = ((start - dayStart) / 60) * hourHeight;
  const height = Math.max(((end - start) / 60) * hourHeight, 28);

  return { top, height };
}
