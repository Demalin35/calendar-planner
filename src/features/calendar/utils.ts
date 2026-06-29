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

export function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export function formatEventTimeLabel(event: CalendarEvent): string {
  if (isAllDayEvent(event)) return 'All day';
  if (isUntimedEvent(event)) return '';
  if (event.endTime !== event.startTime) {
    return `${event.startTime} – ${event.endTime}`;
  }
  return event.startTime;
}

export function formatCompactTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  if (minutes === 0) return `${hour12} ${period}`;
  return `${hour12}:${String(minutes).padStart(2, '0')} ${period}`;
}

export function formatEventDuration(event: CalendarEvent): string {
  if (isAllDayEvent(event) || isUntimedEvent(event)) return '';
  const start = parseTimeToMinutes(event.startTime);
  const end = parseTimeToMinutes(event.endTime);
  if (end <= start) return '';

  const mins = end - start;
  if (mins < 60) return `${mins}m`;
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export function getMobileEventTimeMeta(event: CalendarEvent): {
  time: string;
  duration: string;
} {
  if (isAllDayEvent(event)) return { time: 'All day', duration: '' };
  if (isUntimedEvent(event)) return { time: '', duration: '' };

  const time = formatCompactTime(event.startTime);
  const duration = formatEventDuration(event);
  return { time, duration };
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
  const height = ((end - start) / 60) * hourHeight;

  return { top, height };
}
