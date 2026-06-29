import type { CalendarEvent } from '../../types';
import { getEventTimelinePosition } from './utils';

export interface TimedEventLayoutItem {
  event: CalendarEvent;
  top: number;
  height: number;
  column: number;
  columnCount: number;
}

interface PositionedEvent {
  event: CalendarEvent;
  top: number;
  height: number;
  bottom: number;
  column: number;
  columnCount: number;
}

function rangesOverlap(
  topA: number,
  bottomA: number,
  topB: number,
  bottomB: number,
): boolean {
  return topA < bottomB && bottomA > topB;
}

export function layoutDayViewTimedEvents(
  events: CalendarEvent[],
  hourHeight: number,
  minHeight: number,
): TimedEventLayoutItem[] {
  const positioned: PositionedEvent[] = [];

  for (const event of events) {
    const position = getEventTimelinePosition(event, hourHeight);
    if (!position) continue;

    const height = Math.max(position.height, minHeight);
    positioned.push({
      event,
      top: position.top,
      height,
      bottom: position.top + height,
      column: 0,
      columnCount: 1,
    });
  }

  positioned.sort((a, b) => a.top - b.top || a.bottom - b.bottom);

  const columnEnds: number[] = [];

  for (const item of positioned) {
    let column = columnEnds.findIndex((end) => end <= item.top);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(0);
    }
    item.column = column;
    columnEnds[column] = item.bottom;
  }

  for (const item of positioned) {
    const cluster = positioned.filter((other) =>
      rangesOverlap(item.top, item.bottom, other.top, other.bottom),
    );
    item.columnCount = Math.max(...cluster.map((entry) => entry.column), 0) + 1;
  }

  return positioned.map(({ event, top, height, column, columnCount }) => ({
    event,
    top,
    height,
    column,
    columnCount,
  }));
}
