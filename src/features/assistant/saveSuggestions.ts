import { v4 as uuidv4 } from 'uuid';
import { db } from '../../db';
import type { CalendarEvent } from '../../types';
import { hasEventTimeConflict } from '../calendar/eventConflicts';
import type { SaveSuggestionsResult, SuggestedItem } from './assistantTypes';

export async function saveApprovedSuggestions(
  items: SuggestedItem[],
  existingEvents: CalendarEvent[],
): Promise<SaveSuggestionsResult> {
  const now = new Date();
  const savedEvents: CalendarEvent[] = [...existingEvents];
  let savedEventCount = 0;
  let savedTaskCount = 0;
  let skipped = 0;
  const skippedTitles: string[] = [];

  for (const item of items) {
    if (item.hasConflict) {
      skipped += 1;
      skippedTitles.push(item.title);
      continue;
    }

    if (item.type === 'event') {
      if (
        hasEventTimeConflict(
          item.date,
          item.startTime,
          item.endTime,
          savedEvents,
        )
      ) {
        skipped += 1;
        skippedTitles.push(item.title);
        continue;
      }

      const event: CalendarEvent = {
        id: uuidv4(),
        title: item.title,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        color: item.color,
        emoji: item.emoji,
        notes: item.notes,
        createdAt: now,
        updatedAt: now,
      };

      await db.events.add(event);
      savedEvents.push(event);
      savedEventCount += 1;
      continue;
    }

    const taskNotes = [item.notes, `Suggested time: ${item.startTime} – ${item.endTime}`]
      .filter(Boolean)
      .join('\n');

    await db.tasks.add({
      id: uuidv4(),
      title: item.title,
      date: item.date,
      color: item.color,
      emoji: item.emoji,
      notes: taskNotes || undefined,
      completed: false,
      createdAt: now,
      updatedAt: now,
    });
    savedTaskCount += 1;
  }

  return {
    savedEvents: savedEventCount,
    savedTasks: savedTaskCount,
    skipped,
    skippedTitles,
  };
}
