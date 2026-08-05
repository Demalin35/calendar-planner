import type { CalendarEvent, Task } from '../../types';
import { DEFAULT_EVENT_COLOR } from '../calendar/constants';
import { DEFAULT_TASK_COLOR } from '../tasks/constants';

export const MIN_PRESET_OCCURRENCES = 3;
export const MAX_PRESETS = 4;

/** Trim, collapse whitespace, compare case-insensitively for grouping. */
export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Returns display title: trimmed with collapsed whitespace, preserving casing. */
export function displayTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ');
}

export function normalizeEmoji(emoji?: string): string {
  return emoji?.trim() ?? '';
}

/** Normalize to HH:mm or null when missing/invalid. */
export function normalizeTime(time?: string): string | null {
  if (!time?.trim()) return null;
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export interface EventPreset {
  title: string;
  emoji: string;
  startTime: string;
  endTime: string;
  color: string;
  count: number;
  lastUsedAt: Date;
  label: string;
}

export interface TaskPreset {
  title: string;
  emoji: string;
  color: string;
  count: number;
  lastUsedAt: Date;
  label: string;
}

interface PatternGroup<T> {
  count: number;
  lastUsedAt: Date;
  mostRecent: T;
}

function getRecordTimestamp(record: { createdAt: Date; updatedAt: Date }): Date {
  return record.updatedAt ?? record.createdAt;
}

function rankGroups<T>(
  groups: Map<string, PatternGroup<T>>,
): PatternGroup<T>[] {
  return [...groups.values()]
    .filter((group) => group.count >= MIN_PRESET_OCCURRENCES)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastUsedAt.getTime() - a.lastUsedAt.getTime();
    })
    .slice(0, MAX_PRESETS);
}

export function eventPatternKey(
  event: Pick<CalendarEvent, 'title' | 'emoji' | 'startTime' | 'endTime'>,
): string | null {
  const title = normalizeTitle(event.title);
  if (!title) return null;

  const startTime = normalizeTime(event.startTime);
  const endTime = normalizeTime(event.endTime);
  if (!startTime || !endTime) return null;

  const emoji = normalizeEmoji(event.emoji);
  return `${title}\0${emoji}\0${startTime}\0${endTime}`;
}

export function taskPatternKey(
  task: Pick<Task, 'title' | 'emoji'>,
): string | null {
  const title = normalizeTitle(task.title);
  if (!title) return null;

  const emoji = normalizeEmoji(task.emoji);
  return `${title}\0${emoji}`;
}

function formatTimeRange(startTime: string, endTime: string): string {
  return `${startTime}–${endTime}`;
}

function formatPresetLabel(
  title: string,
  emoji: string,
  timeRange?: string,
): string {
  const prefix = emoji ? `${emoji} ` : '';
  const base = `${prefix}${displayTitle(title)}`;
  return timeRange ? `${base} · ${timeRange}` : base;
}

export function getFrequentEventPresets(events: CalendarEvent[]): EventPreset[] {
  const groups = new Map<string, PatternGroup<CalendarEvent>>();

  for (const event of events) {
    const key = eventPatternKey(event);
    if (!key) continue;

    const usedAt = getRecordTimestamp(event);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { count: 1, lastUsedAt: usedAt, mostRecent: event });
      continue;
    }

    existing.count += 1;
    if (usedAt >= existing.lastUsedAt) {
      existing.lastUsedAt = usedAt;
      existing.mostRecent = event;
    }
  }

  return rankGroups(groups).map((group) => {
    const event = group.mostRecent;
    const emoji = normalizeEmoji(event.emoji);
    const startTime = normalizeTime(event.startTime)!;
    const endTime = normalizeTime(event.endTime)!;

    return {
      title: displayTitle(event.title),
      emoji,
      startTime,
      endTime,
      color: event.color || DEFAULT_EVENT_COLOR,
      count: group.count,
      lastUsedAt: group.lastUsedAt,
      label: formatPresetLabel(
        event.title,
        emoji,
        formatTimeRange(startTime, endTime),
      ),
    };
  });
}

export function getFrequentTaskPresets(tasks: Task[]): TaskPreset[] {
  const groups = new Map<string, PatternGroup<Task>>();

  for (const task of tasks) {
    const key = taskPatternKey(task);
    if (!key) continue;

    const usedAt = getRecordTimestamp(task);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, { count: 1, lastUsedAt: usedAt, mostRecent: task });
      continue;
    }

    existing.count += 1;
    if (usedAt >= existing.lastUsedAt) {
      existing.lastUsedAt = usedAt;
      existing.mostRecent = task;
    }
  }

  return rankGroups(groups).map((group) => {
    const task = group.mostRecent;
    const emoji = normalizeEmoji(task.emoji);

    return {
      title: displayTitle(task.title),
      emoji,
      color: task.color || DEFAULT_TASK_COLOR,
      count: group.count,
      lastUsedAt: group.lastUsedAt,
      label: formatPresetLabel(task.title, emoji),
    };
  });
}
