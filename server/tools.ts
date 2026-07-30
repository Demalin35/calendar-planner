import { randomUUID } from 'node:crypto';
import type { FunctionTool } from 'openai/resources/responses/responses';
import {
  DEFAULT_EVENT_COLOR,
  DEFAULT_WORK_DAY_END,
  DEFAULT_WORK_DAY_START,
  describeGapBeforeConflict,
  findFreeSlots,
  hasEventTimeConflict,
  minutesToTime,
  parseTimeToMinutes,
} from './scheduling.js';
import type {
  CalendarEventDto,
  SuggestedItemDto,
  TaskDto,
} from './types.js';

export interface ToolContext {
  events: CalendarEventDto[];
  tasks: TaskDto[];
  workDayStart: string;
  workDayEnd: string;
  proposals: SuggestedItemDto[];
  notes: string[];
}

export const ASSISTANT_TOOLS: FunctionTool[] = [
  {
    type: 'function',
    name: 'get_events_for_date',
    description: 'List calendar events for a specific date (yyyy-MM-dd).',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in yyyy-MM-dd format' },
      },
      required: ['date'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'get_tasks_for_date',
    description: 'List tasks due on a specific date (yyyy-MM-dd).',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in yyyy-MM-dd format' },
      },
      required: ['date'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'check_overlap',
    description:
      'Deterministically check whether a proposed time range overlaps existing events. Always call this before proposing a create or update.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        startTime: { type: 'string', description: 'HH:mm' },
        endTime: { type: 'string', description: 'HH:mm' },
        excludeEventId: {
          type: ['string', 'null'],
          description: 'Event id to ignore when checking (for moves/updates)',
        },
      },
      required: ['date', 'startTime', 'endTime', 'excludeEventId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'find_free_slots',
    description:
      'Find free time slots of a given duration within work hours on a date.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        durationMinutes: { type: 'number' },
        preferAfter: {
          type: ['string', 'null'],
          description: 'Optional HH:mm earliest start',
        },
        preferBefore: {
          type: ['string', 'null'],
          description: 'Optional HH:mm latest end',
        },
      },
      required: ['date', 'durationMinutes', 'preferAfter', 'preferBefore'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'analyze_requested_slot',
    description:
      'Analyze a requested start/end: report whether it fits, available minutes before the next event, and alternatives.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        excludeEventId: { type: ['string', 'null'] },
      },
      required: ['date', 'startTime', 'endTime', 'excludeEventId'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_create',
    description:
      'Propose creating an event or task. Does NOT save. User must approve later.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['event', 'task'] },
        title: { type: 'string' },
        date: { type: 'string' },
        startTime: { type: 'string' },
        endTime: { type: 'string' },
        color: { type: ['string', 'null'] },
        emoji: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
      },
      required: [
        'type',
        'title',
        'date',
        'startTime',
        'endTime',
        'color',
        'emoji',
        'notes',
      ],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_update',
    description:
      'Propose updating/moving an existing event. Does NOT save. User must approve later.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string' },
        title: { type: ['string', 'null'] },
        date: { type: ['string', 'null'] },
        startTime: { type: ['string', 'null'] },
        endTime: { type: ['string', 'null'] },
        notes: { type: ['string', 'null'] },
      },
      required: ['eventId', 'title', 'date', 'startTime', 'endTime', 'notes'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'propose_delete',
    description:
      'Propose deleting an existing event. Does NOT save. User must approve later.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        eventId: { type: 'string' },
        reason: { type: ['string', 'null'] },
      },
      required: ['eventId', 'reason'],
      additionalProperties: false,
    },
  },
  {
    type: 'function',
    name: 'add_note',
    description: 'Add a short note the user should see with the proposal.',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        note: { type: 'string' },
      },
      required: ['note'],
      additionalProperties: false,
    },
  },
];

function nullishString(value: unknown): string | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  return String(value);
}

export function executeTool(
  name: string,
  rawArgs: string,
  context: ToolContext,
): string {
  const args = JSON.parse(rawArgs || '{}') as Record<string, unknown>;

  switch (name) {
    case 'get_events_for_date': {
      const date = String(args.date);
      const events = context.events.filter((event) => event.date === date);
      return JSON.stringify({ date, events });
    }

    case 'get_tasks_for_date': {
      const date = String(args.date);
      const tasks = context.tasks.filter((task) => task.date === date);
      return JSON.stringify({ date, tasks });
    }

    case 'check_overlap': {
      const date = String(args.date);
      const startTime = String(args.startTime);
      const endTime = String(args.endTime);
      const excludeEventId = nullishString(args.excludeEventId) ?? null;
      const result = hasEventTimeConflict(
        date,
        startTime,
        endTime,
        context.events,
        excludeEventId,
      );
      return JSON.stringify({
        conflict: result.conflict,
        conflictingEvents: result.conflictingEvents.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
        })),
      });
    }

    case 'find_free_slots': {
      const date = String(args.date);
      const durationMinutes = Number(args.durationMinutes);
      const slots = findFreeSlots({
        date,
        durationMinutes,
        events: context.events,
        workDayStart: context.workDayStart,
        workDayEnd: context.workDayEnd,
        preferAfter: nullishString(args.preferAfter),
        preferBefore: nullishString(args.preferBefore),
      });
      return JSON.stringify({
        date,
        durationMinutes,
        workDayStart: context.workDayStart,
        workDayEnd: context.workDayEnd,
        slots,
      });
    }

    case 'analyze_requested_slot': {
      const date = String(args.date);
      const startTime = String(args.startTime);
      const endTime = String(args.endTime);
      const excludeEventId = nullishString(args.excludeEventId) ?? null;
      const overlap = hasEventTimeConflict(
        date,
        startTime,
        endTime,
        context.events,
        excludeEventId,
      );
      const gap = describeGapBeforeConflict({
        date,
        startTime,
        endTime,
        events: context.events.filter((event) => event.id !== excludeEventId),
      });
      const duration =
        parseTimeToMinutes(endTime) - parseTimeToMinutes(startTime);
      const alternatives = findFreeSlots({
        date,
        durationMinutes: duration,
        events: context.events.filter((event) => event.id !== excludeEventId),
        workDayStart: context.workDayStart,
        workDayEnd: context.workDayEnd,
      });

      return JSON.stringify({
        fits: !overlap.conflict,
        conflict: overlap.conflict,
        conflictingEvents: overlap.conflictingEvents,
        availableMinutesBeforeNextEvent: gap.availableMinutes,
        nextEvent: gap.nextEvent
          ? {
              id: gap.nextEvent.id,
              title: gap.nextEvent.title,
              startTime: gap.nextEvent.startTime,
              endTime: gap.nextEvent.endTime,
            }
          : null,
        shorterOption:
          gap.availableMinutes && gap.availableMinutes > 0
            ? {
                startTime,
                endTime: minutesToTime(
                  parseTimeToMinutes(startTime) + gap.availableMinutes,
                ),
                durationMinutes: gap.availableMinutes,
              }
            : null,
        alternativeSlots: alternatives,
      });
    }

    case 'propose_create': {
      const type = args.type === 'task' ? 'task' : 'event';
      const date = String(args.date);
      const startTime = String(args.startTime);
      const endTime = String(args.endTime);
      const title = String(args.title);
      const overlap =
        type === 'event'
          ? hasEventTimeConflict(date, startTime, endTime, context.events)
          : { conflict: false, conflictingEvents: [] };

      const item: SuggestedItemDto = {
        id: randomUUID(),
        action: 'create',
        type,
        title,
        date,
        startTime,
        endTime,
        color: nullishString(args.color) ?? DEFAULT_EVENT_COLOR,
        emoji: nullishString(args.emoji),
        notes: nullishString(args.notes),
        hasConflict: overlap.conflict,
        conflictReason: overlap.conflict
          ? `Overlaps with: ${overlap.conflictingEvents
              .map((event) => `${event.title} (${event.startTime}–${event.endTime})`)
              .join(', ')}`
          : undefined,
      };

      context.proposals.push(item);
      return JSON.stringify({
        accepted: true,
        proposalId: item.id,
        hasConflict: item.hasConflict,
        conflictReason: item.conflictReason ?? null,
      });
    }

    case 'propose_update': {
      const eventId = String(args.eventId);
      const existing = context.events.find((event) => event.id === eventId);
      if (!existing) {
        return JSON.stringify({
          accepted: false,
          error: `Event not found: ${eventId}`,
        });
      }

      const date = nullishString(args.date) ?? existing.date;
      const startTime = nullishString(args.startTime) ?? existing.startTime;
      const endTime = nullishString(args.endTime) ?? existing.endTime;
      const title = nullishString(args.title) ?? existing.title;
      const overlap = hasEventTimeConflict(
        date,
        startTime,
        endTime,
        context.events,
        eventId,
      );

      const item: SuggestedItemDto = {
        id: randomUUID(),
        action: 'update',
        type: 'event',
        title,
        date,
        startTime,
        endTime,
        color: existing.color ?? DEFAULT_EVENT_COLOR,
        emoji: existing.emoji,
        notes:
          nullishString(args.notes) ??
          `Move from ${existing.date} ${existing.startTime}–${existing.endTime}`,
        targetEventId: eventId,
        hasConflict: overlap.conflict,
        conflictReason: overlap.conflict
          ? `Overlaps with: ${overlap.conflictingEvents
              .map((event) => `${event.title} (${event.startTime}–${event.endTime})`)
              .join(', ')}`
          : undefined,
      };

      context.proposals.push(item);
      return JSON.stringify({
        accepted: true,
        proposalId: item.id,
        hasConflict: item.hasConflict,
        conflictReason: item.conflictReason ?? null,
      });
    }

    case 'propose_delete': {
      const eventId = String(args.eventId);
      const existing = context.events.find((event) => event.id === eventId);
      if (!existing) {
        return JSON.stringify({
          accepted: false,
          error: `Event not found: ${eventId}`,
        });
      }

      const item: SuggestedItemDto = {
        id: randomUUID(),
        action: 'delete',
        type: 'event',
        title: existing.title,
        date: existing.date,
        startTime: existing.startTime,
        endTime: existing.endTime,
        color: existing.color ?? DEFAULT_EVENT_COLOR,
        emoji: existing.emoji,
        notes: nullishString(args.reason) ?? 'Proposed deletion',
        targetEventId: eventId,
        hasConflict: false,
      };

      context.proposals.push(item);
      return JSON.stringify({ accepted: true, proposalId: item.id });
    }

    case 'add_note': {
      const note = String(args.note);
      context.notes.push(note);
      return JSON.stringify({ accepted: true });
    }

    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}

export function createToolContext(
  events: CalendarEventDto[],
  tasks: TaskDto[],
  workDayStart = DEFAULT_WORK_DAY_START,
  workDayEnd = DEFAULT_WORK_DAY_END,
): ToolContext {
  return {
    events,
    tasks,
    workDayStart,
    workDayEnd,
    proposals: [],
    notes: [],
  };
}
