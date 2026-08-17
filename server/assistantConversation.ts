import { addDays, format, nextDay, parseISO } from 'date-fns';
import { hasEventTimeConflict, minutesToTime, parseTimeToMinutes } from './scheduling.js';
import type {
  CalendarEventDto,
  PendingActionDto,
  SuggestedItemDto,
} from './types.js';

export type ClientIntent =
  | 'message'
  | 'confirm_pending'
  | 'reject_pending'
  | 'modify_pending';

export type AssistantLanguage = 'en' | 'ru';

const AFFIRMATION_RE =
  /^(?:yes|yep|yeah|yup|ok(?:ay)?|sure|confirm|do it|go ahead|please do|add it|apply(?: it)?|sounds good|that works|давай|да|ок(?:ей)?|хорошо|подтверждаю|добав(?:ь|ляй)|сделай)(?:[.!?,\s]+|$)/i;

const REJECTION_RE =
  /^(?:no|nope|nah|cancel|stop|don't|do not|never mind|nevermind|skip|not now|нет|не надо|отмена|не нужно)(?:[.!?,\s]+|$)/i;

const EXPLICIT_CREATE_RE =
  /\b(?:add|create|schedule|book|put|set up|set-up|insert|make)\b|\bcan you add\b|\bcould you add\b|\bplease add\b|\badd it\b|\bдобав(?:ь|ить|ляй)\b|\bзапланиру(?:й|йте)\b|\bпостав(?:ь|ьте)\b|\bсоздай\b/i;

const MODIFY_TIME_RE =
  /\b(?:make it|change (?:it )?to|move (?:it )?to|instead|rather|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b|\b(?:сделай|перенес(?:и|ите)|в)\s+(\d{1,2})(?::(\d{2}))?\s*(?:утра|вечера|am|pm)?\b/i;

const MODIFY_DATE_RE =
  /\b(tomorrow|today|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))\b|\b(завтра|сегодня|в\s+(?:понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье))\b/i;

const WEEKDAY_MAP: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
  'воскресенье': 0,
  'понедельник': 1,
  'вторник': 2,
  'среду': 3,
  'четверг': 4,
  'пятницу': 5,
  'субботу': 6,
};

export function isAffirmation(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return AFFIRMATION_RE.test(trimmed);
}

export function isRejection(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed) return false;
  return REJECTION_RE.test(trimmed);
}

export function isExplicitCreateIntent(message: string): boolean {
  return EXPLICIT_CREATE_RE.test(message);
}

export function detectClientIntent(
  message: string,
  hasPendingAction: boolean,
): ClientIntent {
  if (!hasPendingAction) return 'message';

  const trimmed = message.trim();
  if (isAffirmation(trimmed)) return 'confirm_pending';
  if (isRejection(trimmed)) return 'reject_pending';
  if (looksLikePendingModification(trimmed)) return 'modify_pending';

  return 'message';
}

function looksLikePendingModification(message: string): boolean {
  if (MODIFY_TIME_RE.test(message)) return true;
  if (MODIFY_DATE_RE.test(message)) return true;
  if (/^\d{1,2}(?::\d{2})?\s*(?:am|pm)?$/i.test(message.trim())) return true;
  return false;
}

export function resolveRelativeDatePhrase(
  phrase: string,
  selectedDate: string,
): string | null {
  const lower = phrase.toLowerCase().trim();
  const base = parseISO(selectedDate);

  if (lower === 'today' || lower === 'сегодня') {
    return selectedDate;
  }
  if (lower === 'tomorrow' || lower === 'завтра') {
    return format(addDays(base, 1), 'yyyy-MM-dd');
  }

  const nextMatch = lower.match(
    /^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  );
  if (nextMatch) {
    const target = WEEKDAY_MAP[nextMatch[1]];
    const candidate = nextDay(base, target as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    return format(candidate, 'yyyy-MM-dd');
  }

  const weekdayMatch = lower.match(
    /^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/,
  );
  if (weekdayMatch) {
    const target = WEEKDAY_MAP[weekdayMatch[1]];
    let candidate = nextDay(base, target as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    if (candidate <= base) {
      candidate = addDays(candidate, 7);
    }
    return format(candidate, 'yyyy-MM-dd');
  }

  const ruWeekdayMatch = lower.match(
    /^(?:в\s+)?(понедельник|вторник|среду|четверг|пятницу|субботу|воскресенье)$/,
  );
  if (ruWeekdayMatch) {
    const target = WEEKDAY_MAP[ruWeekdayMatch[1]];
    let candidate = nextDay(base, target as 0 | 1 | 2 | 3 | 4 | 5 | 6);
    if (candidate <= base) {
      candidate = addDays(candidate, 7);
    }
    return format(candidate, 'yyyy-MM-dd');
  }

  return null;
}

export function resolveDateFromMessage(
  message: string,
  selectedDate: string,
): string {
  const lower = message.toLowerCase();
  if (/\btomorrow\b|\bзавтра\b/.test(lower)) {
    return resolveRelativeDatePhrase('tomorrow', selectedDate) ?? selectedDate;
  }
  if (/\btoday\b|\bсегодня\b/.test(lower)) {
    return selectedDate;
  }

  const nextWeekday = lower.match(
    /\bnext\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (nextWeekday) {
    return (
      resolveRelativeDatePhrase(`next ${nextWeekday[1]}`, selectedDate) ??
      selectedDate
    );
  }

  const weekday = lower.match(
    /\b(?:on\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/,
  );
  if (weekday) {
    return resolveRelativeDatePhrase(weekday[1], selectedDate) ?? selectedDate;
  }

  return selectedDate;
}

export function createPendingAction(
  suggestions: SuggestedItemDto[],
  sourceMessage?: string,
): PendingActionDto {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    suggestions: suggestions.map((item) => ({ ...item })),
    sourceMessage,
  };
}

export function validatePendingSuggestions(
  suggestions: SuggestedItemDto[],
  events: CalendarEventDto[],
): SuggestedItemDto[] {
  const workingEvents = [...events];

  return suggestions.map((item) => {
    if (item.type !== 'event' || item.action === 'delete') {
      return { ...item };
    }

    const excludeId =
      item.action === 'update' ? item.targetEventId : undefined;
    const overlap = hasEventTimeConflict(
      item.date,
      item.startTime,
      item.endTime,
      workingEvents,
      excludeId,
    );

    const validated: SuggestedItemDto = {
      ...item,
      hasConflict: overlap.conflict,
      conflictReason: overlap.conflict
        ? `Overlaps with: ${overlap.conflictingEvents
            .map(
              (event) =>
                `${event.title} (${event.startTime}–${event.endTime})`,
            )
            .join(', ')}`
        : undefined,
    };

    if (!validated.hasConflict && item.action === 'create') {
      workingEvents.push({
        id: item.id,
        title: item.title,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        color: item.color,
        emoji: item.emoji,
        notes: item.notes,
      });
    }

    return validated;
  });
}

export function getActionableSuggestions(
  suggestions: SuggestedItemDto[],
): SuggestedItemDto[] {
  return suggestions.filter(
    (item) => !item.hasConflict || item.action === 'delete',
  );
}

export function requiresConfirmationForProposals(
  suggestions: SuggestedItemDto[],
  explicitCreate: boolean,
): boolean {
  if (suggestions.length === 0) return false;

  const actionable = getActionableSuggestions(suggestions);
  if (actionable.length === 0) return true;

  const hasDestructiveOrUpdate = actionable.some(
    (item) => item.action === 'delete' || item.action === 'update',
  );
  if (hasDestructiveOrUpdate) return true;

  const hasConflictProposal = suggestions.some((item) => item.hasConflict);
  if (hasConflictProposal) return true;

  if (
    explicitCreate &&
    actionable.every((item) => (item.action ?? 'create') === 'create')
  ) {
    return false;
  }

  return true;
}

export function buildDoneSummary(
  suggestions: SuggestedItemDto[],
  language: AssistantLanguage,
): string {
  const primary = suggestions[0];
  if (!primary) {
    return language === 'ru'
      ? 'Готово — изменения применены.'
      : 'Done — changes applied.';
  }

  const emojiPrefix = primary.emoji ? `${primary.emoji} ` : '';
  const action = primary.action ?? 'create';

  if (language === 'ru') {
    if (action === 'delete') {
      return `Готово — удалено: ${emojiPrefix}${primary.title}.`;
    }
    if (action === 'update') {
      return `Готово — перенесено: ${emojiPrefix}${primary.title} на ${primary.date} ${primary.startTime}.`;
    }
    return `Готово — добавлено: ${emojiPrefix}${primary.title} ${primary.date} в ${primary.startTime}.`;
  }

  if (action === 'delete') {
    return `Done — deleted ${emojiPrefix}${primary.title}.`;
  }
  if (action === 'update') {
    return `Done — moved ${emojiPrefix}${primary.title} to ${primary.date} at ${primary.startTime}.`;
  }
  return `Done — I added ${emojiPrefix}${primary.title} on ${primary.date} at ${primary.startTime}.`;
}

function parseModifiedTime(message: string): string | null {
  const match = message.match(
    /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b|\b(\d{1,2})\s*(утра|вечера)\b/i,
  );
  if (!match) return null;

  const hours = Number.parseInt(match[1] ?? match[4], 10);
  const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
  const period = (match[3] ?? match[5])?.toLowerCase();

  let h = hours;
  if (period === 'pm' || period === 'вечера') {
    if (h < 12) h += 12;
  } else if (period === 'am' || period === 'утра') {
    if (h === 12) h = 0;
  }

  return minutesToTime(h * 60 + minutes);
}

export function applyPendingModification(
  message: string,
  pending: PendingActionDto,
  selectedDate: string,
): PendingActionDto | null {
  if (pending.suggestions.length === 0) return null;

  const nextSuggestions = pending.suggestions.map((item) => ({ ...item }));
  const primary = nextSuggestions[0];
  let changed = false;

  const dateMatch = message.match(MODIFY_DATE_RE);
  if (dateMatch) {
    const phrase = (dateMatch[1] ?? dateMatch[2]).toLowerCase();
    const resolved = resolveRelativeDatePhrase(phrase, selectedDate);
    if (resolved) {
      for (const item of nextSuggestions) {
        item.date = resolved;
      }
      changed = true;
    }
  }

  const newStart = parseModifiedTime(message);
  if (newStart) {
    const duration =
      parseTimeToMinutes(primary.endTime) -
      parseTimeToMinutes(primary.startTime);
    const endMinutes = Math.min(
      parseTimeToMinutes(newStart) + Math.max(duration, 30),
      23 * 60 + 59,
    );

    for (const item of nextSuggestions) {
      item.startTime = newStart;
      item.endTime = minutesToTime(endMinutes);
    }
    changed = true;
  }

  if (!changed) return null;

  return {
    ...pending,
    suggestions: nextSuggestions,
  };
}

export function buildApprovalPrompt(
  suggestions: SuggestedItemDto[],
  language: AssistantLanguage,
): string {
  const hasActionable = suggestions.some((item) => !item.hasConflict);
  if (suggestions.length === 0) {
    return language === 'ru'
      ? 'Уточните время или длительность, и я предложу вариант.'
      : 'Please clarify the time or duration and I can suggest an option.';
  }
  if (hasActionable) {
    return language === 'ru'
      ? 'Применить эти изменения?'
      : 'Shall I apply these changes?';
  }
  return language === 'ru'
    ? 'Есть конфликты. Выберите другое время или более короткий вариант.'
    : 'There are conflicts. Choose another time or a shorter option.';
}
