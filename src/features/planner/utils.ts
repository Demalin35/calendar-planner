import {
  eachDayOfInterval,
  endOfWeek,
  format,
  startOfWeek,
} from 'date-fns';
import { formatDateKey } from '../calendar/utils';

const WEEK_STARTS_ON = 0;

export function getWeekDays(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  const end = endOfWeek(date, { weekStartsOn: WEEK_STARTS_ON });
  return eachDayOfInterval({ start, end });
}

export function formatWeekRangeLabel(days: Date[]): string {
  if (days.length === 0) return '';

  const start = days[0];
  const end = days[days.length - 1];
  const sameMonth = format(start, 'MMM') === format(end, 'MMM');
  const sameYear = format(start, 'yyyy') === format(end, 'yyyy');

  if (sameMonth && sameYear) {
    return `${format(start, 'MMM d')} – ${format(end, 'd, yyyy')}`;
  }

  if (sameYear) {
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }

  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}

export function getWeekRangeKeys(days: Date[]): {
  rangeStart: string;
  rangeEnd: string;
} {
  return {
    rangeStart: formatDateKey(days[0]),
    rangeEnd: formatDateKey(days[days.length - 1]),
  };
}
