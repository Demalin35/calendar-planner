import { addDays, format, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent, Task } from '../../types';
import { DEFAULT_EVENT_COLOR } from '../calendar/constants';
import { hasEventTimeConflict } from '../calendar/eventConflicts';
import { parseTimeToMinutes } from '../calendar/utils';
import { DEFAULT_TASK_COLOR } from '../tasks/constants';
import type {
  AssistantPlanResponse,
  PlanningContext,
  SuggestedItem,
} from './assistantTypes';

const ACTIVITY_PATTERNS: Array<{
  keywords: string[];
  title: string;
  emoji: string;
  type: 'event' | 'task';
  color: string;
  durationMinutes: number;
}> = [
  {
    keywords: ['study', 'studying', 'homework', 'read', 'learning'],
    title: 'Study session',
    emoji: '📚',
    type: 'event',
    color: '#DCCFEA',
    durationMinutes: 60,
  },
  {
    keywords: ['shop', 'shopping', 'groceries', 'errands', 'store'],
    title: 'Shopping',
    emoji: '🛒',
    type: 'event',
    color: '#F4D6C8',
    durationMinutes: 60,
  },
  {
    keywords: ['meeting', 'prepare', 'prep', 'presentation', 'call'],
    title: 'Meeting prep',
    emoji: '💼',
    type: 'event',
    color: '#D7EAF5',
    durationMinutes: 45,
  },
  {
    keywords: ['workout', 'exercise', 'gym', 'run', 'walk'],
    title: 'Workout',
    emoji: '🏃',
    type: 'event',
    color: '#CFE8CE',
    durationMinutes: 45,
  },
  {
    keywords: ['email', 'admin', 'paperwork', 'organize', 'tidy'],
    title: 'Admin time',
    emoji: '📝',
    type: 'task',
    color: '#F7E7C6',
    durationMinutes: 30,
  },
];

const DEFAULT_SLOT_START_HOUR = 9;
const DEFAULT_SLOT_END_HOUR = 18;

function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function getOccupiedRanges(events: CalendarEvent[]): Array<{ start: number; end: number }> {
  return events
    .map((event) => {
      const start = parseTimeToMinutes(event.startTime);
      const end = parseTimeToMinutes(event.endTime);
      if (end <= start) return null;
      return { start, end };
    })
    .filter((range): range is { start: number; end: number } => range !== null)
    .sort((a, b) => a.start - b.start);
}

function isSlotFree(
  start: number,
  end: number,
  occupied: Array<{ start: number; end: number }>,
): boolean {
  return !occupied.some(
    (range) => start < range.end && end > range.start,
  );
}

function findNextFreeSlot(
  durationMinutes: number,
  occupied: Array<{ start: number; end: number }>,
  usedSlots: Array<{ start: number; end: number }>,
): { start: number; end: number } | null {
  const dayStart = DEFAULT_SLOT_START_HOUR * 60;
  const dayEnd = DEFAULT_SLOT_END_HOUR * 60;

  for (let start = dayStart; start + durationMinutes <= dayEnd; start += 30) {
    const end = start + durationMinutes;
    if (isSlotFree(start, end, occupied) && isSlotFree(start, end, usedSlots)) {
      return { start, end };
    }
  }

  return null;
}

function extractActivities(message: string): typeof ACTIVITY_PATTERNS {
  const lower = message.toLowerCase();
  const matched = ACTIVITY_PATTERNS.filter((pattern) =>
    pattern.keywords.some((keyword) => lower.includes(keyword)),
  );

  if (matched.length > 0) {
    return matched.slice(0, 3);
  }

  const fragments = lower
    .split(/,| and |&|\n/)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 3);

  if (fragments.length === 0) {
    return [
      {
        keywords: [],
        title: 'Focused work block',
        emoji: '✨',
        type: 'event',
        color: DEFAULT_EVENT_COLOR,
        durationMinutes: 60,
      },
      {
        keywords: [],
        title: 'Personal errand',
        emoji: '📌',
        type: 'task',
        color: DEFAULT_TASK_COLOR,
        durationMinutes: 45,
      },
    ];
  }

  return fragments.map((fragment, index) => ({
    keywords: [],
    title: fragment.charAt(0).toUpperCase() + fragment.slice(1),
    emoji: index === 0 ? '✨' : '📌',
    type: index % 2 === 0 ? 'event' : 'task',
    color: index % 2 === 0 ? DEFAULT_EVENT_COLOR : DEFAULT_TASK_COLOR,
    durationMinutes: 60,
  }));
}

function markConflicts(
  suggestions: SuggestedItem[],
  existingEvents: CalendarEvent[],
): SuggestedItem[] {
  const savedEvents: CalendarEvent[] = [...existingEvents];

  return suggestions.map((item) => {
    if (item.type !== 'event') {
      return item;
    }

    const conflicts = hasEventTimeConflict(
      item.date,
      item.startTime,
      item.endTime,
      savedEvents,
    );

    if (conflicts) {
      return {
        ...item,
        hasConflict: true,
        conflictReason: 'This time overlaps an existing event.',
      };
    }

    savedEvents.push({
      id: item.id,
      title: item.title,
      date: item.date,
      startTime: item.startTime,
      endTime: item.endTime,
      color: item.color,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { ...item, hasConflict: false };
  });
}

/**
 * TODO: Replace this mock with a backend API call.
 * The real OpenAI integration should live on the server, e.g. POST /api/assistant/plan
 * with { message, date, events, tasks } and return structured suggestions.
 */
export async function generateMockPlan(
  userMessage: string,
  date: string,
  existingEvents: CalendarEvent[],
  existingTasks: Task[],
): Promise<AssistantPlanResponse> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const activities = extractActivities(userMessage);
  const occupied = getOccupiedRanges(existingEvents);
  const usedSlots: Array<{ start: number; end: number }> = [];
  const notes: string[] = [];
  const rawSuggestions: SuggestedItem[] = [];

  if (existingEvents.length > 0) {
    notes.push(
      `You already have ${existingEvents.length} event${existingEvents.length === 1 ? '' : 's'} on this day.`,
    );
  }

  if (existingTasks.length > 0) {
    notes.push(
      `${existingTasks.length} task${existingTasks.length === 1 ? '' : 's'} due this day.`,
    );
  }

  for (const activity of activities) {
    const slot = findNextFreeSlot(activity.durationMinutes, occupied, usedSlots);

    if (!slot) {
      const alternateDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
      notes.push(
        `Could not find open time for "${activity.title}" today. Consider moving it to ${alternateDate}.`,
      );
      continue;
    }

    usedSlots.push(slot);

    rawSuggestions.push({
      id: uuidv4(),
      type: activity.type,
      title: activity.title,
      date,
      startTime: minutesToTime(slot.start),
      endTime: minutesToTime(slot.end),
      color: activity.color,
      emoji: activity.emoji,
      notes: `Suggested by your planning assistant.`,
      hasConflict: false,
    });
  }

  if (rawSuggestions.length === 0) {
    const alternateDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    notes.push(
      `Your schedule looks full today. I could not place new items without conflicts.`,
    );

    return {
      summary:
        'Your day is pretty packed. I could not find open slots for new items today.',
      notes,
      suggestions: [],
      approvalPrompt: `Would you like to try planning for ${alternateDate} instead?`,
    };
  }

  const suggestions = markConflicts(rawSuggestions, existingEvents);
  const conflictCount = suggestions.filter((item) => item.hasConflict).length;

  if (conflictCount > 0) {
    notes.push(
      `${conflictCount} suggestion${conflictCount === 1 ? '' : 's'} overlap existing events and will not be added unless you adjust the time.`,
    );
  }

  const summary =
    suggestions.length === 1
      ? `Here is one idea for ${format(parseISO(date), 'EEEE, MMMM d')}.`
      : `Here is a draft plan with ${suggestions.length} items for ${format(parseISO(date), 'EEEE, MMMM d')}.`;

  return {
    summary,
    notes,
    suggestions,
    approvalPrompt: 'Do you want me to add these to your calendar?',
  };
}

export function buildPlanningContext(
  date: string,
  existingEvents: CalendarEvent[],
  existingTasks: Task[],
): PlanningContext {
  return {
    date,
    dateLabel: format(parseISO(date), 'EEEE, MMMM d, yyyy'),
    existingEventCount: existingEvents.length,
    existingTaskCount: existingTasks.length,
  };
}
