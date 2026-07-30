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
  let updatedEvents = 0;
  let deletedEvents = 0;
  let skipped = 0;
  const skippedTitles: string[] = [];

  for (const item of items) {
    const action = item.action ?? 'create';

    if (item.hasConflict && action !== 'delete') {
      skipped += 1;
      skippedTitles.push(item.title);
      continue;
    }

    if (action === 'delete') {
      if (!item.targetEventId) {
        skipped += 1;
        skippedTitles.push(item.title);
        continue;
      }
      await db.events.delete(item.targetEventId);
      const index = savedEvents.findIndex((event) => event.id === item.targetEventId);
      if (index >= 0) savedEvents.splice(index, 1);
      deletedEvents += 1;
      continue;
    }

    if (action === 'update') {
      if (!item.targetEventId) {
        skipped += 1;
        skippedTitles.push(item.title);
        continue;
      }

      if (
        hasEventTimeConflict(
          item.date,
          item.startTime,
          item.endTime,
          savedEvents,
          item.targetEventId,
        )
      ) {
        skipped += 1;
        skippedTitles.push(item.title);
        continue;
      }

      await db.events.update(item.targetEventId, {
        title: item.title,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        notes: item.notes,
        updatedAt: now,
      });

      const index = savedEvents.findIndex((event) => event.id === item.targetEventId);
      if (index >= 0) {
        savedEvents[index] = {
          ...savedEvents[index],
          title: item.title,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          notes: item.notes,
          updatedAt: now,
        };
      }
      updatedEvents += 1;
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

    const taskNotes = [
      item.notes,
      `Suggested time: ${item.startTime} – ${item.endTime}`,
    ]
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
    updatedEvents,
    deletedEvents,
    skipped,
    skippedTitles,
  };
}
