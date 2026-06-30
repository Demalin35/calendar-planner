import { addDays, format, parseISO } from 'date-fns';
import { enUS, ru } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import type { CalendarEvent, Task } from '../../types';
import { DEFAULT_EVENT_COLOR } from '../calendar/constants';
import { hasEventTimeConflict } from '../calendar/eventConflicts';
import { parseTimeToMinutes } from '../calendar/utils';
import { DEFAULT_TASK_COLOR } from '../tasks/constants';
import { t } from './assistantCopy';
import type { AssistantLanguage } from './detectLanguage';
import { getAssistantLanguage } from './detectLanguage';
import {
  extractTimeFromMessage,
  stripTimeFromMessage,
} from './extractTimeFromMessage';
import type {
  AssistantPlanResponse,
  PlanningContext,
  SuggestedItem,
} from './assistantTypes';

interface ActivityPattern {
  keywords: string[];
  title: Record<AssistantLanguage, string>;
  emoji: string;
  type: 'event' | 'task';
  color: string;
  durationMinutes: number;
}

const ACTIVITY_PATTERNS: ActivityPattern[] = [
  {
    keywords: [
      'study',
      'studying',
      'homework',
      'read',
      'learning',
      'учёба',
      'учеба',
      'занятия',
      'учиться',
      'домашн',
      'читать',
    ],
    title: { en: 'Study session', ru: 'Занятие' },
    emoji: '📚',
    type: 'event',
    color: '#DCCFEA',
    durationMinutes: 60,
  },
  {
    keywords: [
      'shop',
      'shopping',
      'groceries',
      'errands',
      'store',
      'покуп',
      'магазин',
      'продукт',
      'поход',
    ],
    title: { en: 'Shopping', ru: 'Покупки' },
    emoji: '🛒',
    type: 'event',
    color: '#F4D6C8',
    durationMinutes: 60,
  },
  {
    keywords: [
      'meeting',
      'prepare',
      'prep',
      'presentation',
      'call',
      'встреч',
      'подготов',
      'созвон',
      'презентац',
    ],
    title: { en: 'Meeting prep', ru: 'Подготовка к встрече' },
    emoji: '💼',
    type: 'event',
    color: '#D7EAF5',
    durationMinutes: 45,
  },
  {
    keywords: [
      'workout',
      'exercise',
      'gym',
      'run',
      'walk',
      'трениров',
      'спорт',
      'зал',
      'пробеж',
      'прогул',
    ],
    title: { en: 'Workout', ru: 'Тренировка' },
    emoji: '🏃',
    type: 'event',
    color: '#CFE8CE',
    durationMinutes: 45,
  },
  {
    keywords: [
      'email',
      'admin',
      'paperwork',
      'organize',
      'tidy',
      'почт',
      'дела',
      'бумаг',
      'убор',
      'организ',
    ],
    title: { en: 'Admin time', ru: 'Дела по дому' },
    emoji: '📝',
    type: 'task',
    color: '#F7E7C6',
    durationMinutes: 30,
  },
  {
    keywords: [
      'call',
      'remind',
      'phone',
      'позвон',
      'напомни',
      'звонок',
    ],
    title: { en: 'Phone call', ru: 'Звонок' },
    emoji: '📞',
    type: 'task',
    color: '#E6DDF2',
    durationMinutes: 30,
  },
];

const DEFAULT_SLOT_START_HOUR = 9;
const DEFAULT_SLOT_END_HOUR = 18;

function formatPlanDate(date: string, lang: AssistantLanguage): string {
  return format(parseISO(date), 'EEEE, d MMMM', {
    locale: lang === 'ru' ? ru : enUS,
  });
}

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

function extractActivities(
  message: string,
  lang: AssistantLanguage,
): Array<{
  title: string;
  emoji: string;
  type: 'event' | 'task';
  color: string;
  durationMinutes: number;
}> {
  const lower = message.toLowerCase();
  const matched = ACTIVITY_PATTERNS.filter((pattern) =>
    pattern.keywords.some((keyword) => lower.includes(keyword)),
  );

  if (matched.length > 0) {
    return matched.slice(0, 3).map((pattern) => ({
      title: pattern.title[lang],
      emoji: pattern.emoji,
      type: pattern.type,
      color: pattern.color,
      durationMinutes: pattern.durationMinutes,
    }));
  }

  const splitPattern = lang === 'ru' ? /,| and |&|\n| и /i : /,| and |&|\n/i;
  const fragments = lower
    .split(splitPattern)
    .map((part) => part.trim())
    .filter((part) => part.length > 2)
    .slice(0, 3);

  if (fragments.length === 0) {
    return [
      {
        title: lang === 'ru' ? 'Блок сфокусированной работы' : 'Focused work block',
        emoji: '✨',
        type: 'event',
        color: DEFAULT_EVENT_COLOR,
        durationMinutes: 60,
      },
      {
        title: lang === 'ru' ? 'Личное дело' : 'Personal errand',
        emoji: '📌',
        type: 'task',
        color: DEFAULT_TASK_COLOR,
        durationMinutes: 45,
      },
    ];
  }

  return fragments.map((fragment, index) => ({
    title: fragment.charAt(0).toUpperCase() + fragment.slice(1),
    emoji: index === 0 ? '✨' : '📌',
    type: index % 2 === 0 ? 'event' : 'task',
    color: index % 2 === 0 ? DEFAULT_EVENT_COLOR : DEFAULT_TASK_COLOR,
    durationMinutes: 60,
  }));
}

function extractCustomTitle(
  message: string,
  fallback: string,
  matchedText: string | undefined,
  lang: AssistantLanguage,
): string {
  let text = stripTimeFromMessage(message, matchedText);

  const prefixPatterns =
    lang === 'ru'
      ? [
          /^(?:я\s+)?хочу\s+(?:пойти\s+)?/i,
          /^напомни(?:ть)?\s+(?:мне\s+)?/i,
          /^мне\s+нужно\s+/i,
        ]
      : [
          /^(?:i\s+)?want\s+to\s+/i,
          /^remind\s+me\s+to\s+/i,
          /^please\s+/i,
        ];

  for (const pattern of prefixPatterns) {
    text = text.replace(pattern, '');
  }

  text = text
    .replace(/\s+(?:today|сегодня|tomorrow|завтра)\s*$/i, '')
    .replace(/[.!?]+$/g, '')
    .trim();

  if (text.length > 2) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  return fallback;
}

function buildTimedSuggestion(
  userMessage: string,
  date: string,
  existingEvents: CalendarEvent[],
  lang: AssistantLanguage,
): AssistantPlanResponse | null {
  const extractedTime = extractTimeFromMessage(userMessage);
  if (!extractedTime.time) return null;

  const activities = extractActivities(userMessage, lang);
  const primary = activities[0];
  const title = extractCustomTitle(
    userMessage,
    primary.title,
    extractedTime.matchedText,
    lang,
  );

  const startMinutes = parseTimeToMinutes(extractedTime.time);
  const endMinutes = Math.min(
    startMinutes + primary.durationMinutes,
    23 * 60 + 59,
  );
  const startTime = extractedTime.time;
  const endTime = minutesToTime(endMinutes);

  const rawSuggestion: SuggestedItem = {
    id: uuidv4(),
    type: primary.type,
    title,
    date,
    startTime,
    endTime,
    color: primary.color,
    emoji: primary.emoji,
    notes: t(lang, 'suggestionNote'),
    hasConflict: false,
  };

  const suggestions = markConflicts([rawSuggestion], existingEvents, lang);
  const notes: string[] = [];

  if (suggestions[0]?.hasConflict) {
    notes.push(t(lang, 'conflictReason'));
  }

  return {
    summary: t(lang, 'timedSummary', { title, time: startTime }),
    notes,
    suggestions,
    approvalPrompt: t(lang, 'timedApproval'),
  };
}

function markConflicts(
  suggestions: SuggestedItem[],
  existingEvents: CalendarEvent[],
  lang: AssistantLanguage,
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
        conflictReason: t(lang, 'conflictReason'),
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
 * Pass `lang` to the API so responses match the user's language.
 */
export async function generateMockPlan(
  userMessage: string,
  date: string,
  existingEvents: CalendarEvent[],
  existingTasks: Task[],
): Promise<AssistantPlanResponse> {
  await new Promise((resolve) => setTimeout(resolve, 700));

  const lang = getAssistantLanguage(userMessage);
  const formattedDate = formatPlanDate(date, lang);

  const timedPlan = buildTimedSuggestion(
    userMessage,
    date,
    existingEvents,
    lang,
  );
  if (timedPlan) {
    return timedPlan;
  }

  const activities = extractActivities(userMessage, lang);
  const occupied = getOccupiedRanges(existingEvents);
  const usedSlots: Array<{ start: number; end: number }> = [];
  const notes: string[] = [];
  const rawSuggestions: SuggestedItem[] = [];

  if (existingEvents.length > 0) {
    notes.push(
      t(lang, 'existingEvents', { count: existingEvents.length }),
    );
  }

  if (existingTasks.length > 0) {
    notes.push(
      t(lang, 'existingTasks', { count: existingTasks.length }),
    );
  }

  for (const activity of activities) {
    const slot = findNextFreeSlot(activity.durationMinutes, occupied, usedSlots);

    if (!slot) {
      const alternateDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
      notes.push(
        t(lang, 'noSlotFor', { title: activity.title, date: alternateDate }),
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
      notes: t(lang, 'suggestionNote'),
      hasConflict: false,
    });
  }

  if (rawSuggestions.length === 0) {
    const alternateDate = format(addDays(parseISO(date), 1), 'yyyy-MM-dd');
    notes.push(t(lang, 'scheduleFull'));

    return {
      summary: t(lang, 'dayPacked'),
      notes,
      suggestions: [],
      approvalPrompt: t(lang, 'tryAlternateDay', { date: alternateDate }),
    };
  }

  const suggestions = markConflicts(rawSuggestions, existingEvents, lang);
  const conflictCount = suggestions.filter((item) => item.hasConflict).length;

  if (conflictCount > 0) {
    notes.push(t(lang, 'conflictOverlap', { count: conflictCount }));
  }

  const summary =
    suggestions.length === 1
      ? t(lang, 'summaryOne', { date: formattedDate })
      : t(lang, 'summaryMany', { date: formattedDate, count: suggestions.length });

  return {
    summary,
    notes,
    suggestions,
    approvalPrompt: t(lang, 'approvalPrompt'),
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
