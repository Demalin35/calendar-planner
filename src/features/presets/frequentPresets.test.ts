import { describe, expect, it } from 'vitest';
import type { CalendarEvent, Task } from '../../types';
import {
  getFrequentEventPresets,
  getFrequentTaskPresets,
  MAX_PRESETS,
  MIN_PRESET_OCCURRENCES,
  normalizeTitle,
} from './frequentPresets';

function makeEvent(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'title' | 'date'>,
  index = 0,
): CalendarEvent {
  const createdAt = new Date(`2026-01-${String(index + 1).padStart(2, '0')}T10:00:00`);
  return {
    id: `event-${index}`,
    startTime: '08:00',
    endTime: '17:00',
    color: 'sky',
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

function makeTask(
  overrides: Partial<Task> & Pick<Task, 'title'>,
  index = 0,
): Task {
  const createdAt = new Date(`2026-01-${String(index + 1).padStart(2, '0')}T10:00:00`);
  return {
    id: `task-${index}`,
    color: 'lavender',
    completed: false,
    createdAt,
    updatedAt: createdAt,
    ...overrides,
  };
}

describe('normalizeTitle', () => {
  it('trims, collapses whitespace, and lowercases for grouping', () => {
    expect(normalizeTitle('  Work   Meeting  ')).toBe('work meeting');
  });
});

describe('getFrequentEventPresets', () => {
  it('returns no presets for fewer than 3 matching occurrences', () => {
    const events = [
      makeEvent({ title: 'Work', date: '2026-01-01' }),
      makeEvent({ title: 'Work', date: '2026-01-02' }, 1),
    ];

    expect(getFrequentEventPresets(events)).toEqual([]);
  });

  it('returns one preset after 3 identical occurrences', () => {
    const events = [
      makeEvent({ title: 'Work', emoji: '💼', date: '2026-01-01' }),
      makeEvent({ title: 'Work', emoji: '💼', date: '2026-01-02' }, 1),
      makeEvent({ title: 'Work', emoji: '💼', date: '2026-01-03' }, 2),
    ];

    const presets = getFrequentEventPresets(events);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.count).toBe(3);
    expect(presets[0]?.label).toBe('💼 Work · 08:00–17:00');
  });

  it('groups titles that differ only by case and extra spaces', () => {
    const events = [
      makeEvent({ title: '  work  ', date: '2026-01-01' }),
      makeEvent({ title: 'WORK', date: '2026-01-02' }, 1),
      makeEvent({ title: 'Work', date: '2026-01-03' }, 2),
    ];

    expect(getFrequentEventPresets(events)).toHaveLength(1);
  });

  it('treats different times as different presets', () => {
    const events = [
      makeEvent({ title: 'Gym', startTime: '18:30', endTime: '20:00', date: '2026-01-01' }),
      makeEvent({ title: 'Gym', startTime: '18:30', endTime: '20:00', date: '2026-01-02' }, 1),
      makeEvent({ title: 'Gym', startTime: '18:30', endTime: '20:00', date: '2026-01-03' }, 2),
      makeEvent({ title: 'Gym', startTime: '07:00', endTime: '08:00', date: '2026-01-04' }, 3),
      makeEvent({ title: 'Gym', startTime: '07:00', endTime: '08:00', date: '2026-01-05' }, 4),
      makeEvent({ title: 'Gym', startTime: '07:00', endTime: '08:00', date: '2026-01-06' }, 5),
    ];

    expect(getFrequentEventPresets(events)).toHaveLength(2);
  });

  it('does not split identical patterns across different dates', () => {
    const events = Array.from({ length: 3 }, (_, index) =>
      makeEvent({ title: 'Work', date: `2026-02-${String(index + 1).padStart(2, '0')}` }, index),
    );

    expect(getFrequentEventPresets(events)).toHaveLength(1);
  });

  it('uses the most recent matching color', () => {
    const events = [
      makeEvent({ title: 'Work', color: 'sky', date: '2026-01-01' }),
      makeEvent(
        {
          title: 'Work',
          color: 'rose',
          date: '2026-01-02',
          updatedAt: new Date('2026-01-02T12:00:00'),
        },
        1,
      ),
      makeEvent(
        {
          title: 'Work',
          color: 'mint',
          date: '2026-01-03',
          updatedAt: new Date('2026-01-03T12:00:00'),
        },
        2,
      ),
    ];

    expect(getFrequentEventPresets(events)[0]?.color).toBe('mint');
  });

  it('ranks by count first and recency second', () => {
    const events = [
      ...Array.from({ length: 3 }, (_, index) =>
        makeEvent(
          {
            title: 'Work',
            updatedAt: new Date(`2026-01-${String(index + 1).padStart(2, '0')}T08:00:00`),
            date: `2026-01-${String(index + 1).padStart(2, '0')}`,
          },
          index,
        ),
      ),
      ...Array.from({ length: 4 }, (_, index) =>
        makeEvent(
          {
            title: 'Gym',
            startTime: '18:30',
            endTime: '20:00',
            updatedAt: new Date(`2026-02-${String(index + 1).padStart(2, '0')}T08:00:00`),
            date: `2026-02-${String(index + 1).padStart(2, '0')}`,
          },
          index + 3,
        ),
      ),
    ];

    const presets = getFrequentEventPresets(events);
    expect(presets[0]?.title).toBe('Gym');
    expect(presets[0]?.count).toBe(4);
    expect(presets[1]?.title).toBe('Work');
  });

  it('returns at most 4 presets', () => {
    const events = Array.from({ length: MAX_PRESETS + 2 }, (_, index) =>
      Array.from({ length: MIN_PRESET_OCCURRENCES }, (__, occurrence) =>
        makeEvent(
          {
            title: `Pattern ${index}`,
            startTime: `${String(8 + index).padStart(2, '0')}:00`,
            endTime: `${String(9 + index).padStart(2, '0')}:00`,
            date: `2026-03-${String(occurrence + 1).padStart(2, '0')}`,
          },
          index * 10 + occurrence,
        ),
      ),
    ).flat();

    expect(getFrequentEventPresets(events)).toHaveLength(MAX_PRESETS);
  });

  it('ignores events with invalid times', () => {
    const events = [
      makeEvent({ title: 'Broken', startTime: '', endTime: '17:00', date: '2026-01-01' }),
      makeEvent({ title: 'Broken', startTime: '', endTime: '17:00', date: '2026-01-02' }, 1),
      makeEvent({ title: 'Broken', startTime: '', endTime: '17:00', date: '2026-01-03' }, 2),
    ];

    expect(getFrequentEventPresets(events)).toEqual([]);
  });
});

describe('getFrequentTaskPresets', () => {
  it('returns presets grouped by title and emoji', () => {
    const tasks = [
      makeTask({ title: 'Groceries', emoji: '🛒' }),
      makeTask({ title: 'Groceries', emoji: '🛒' }, 1),
      makeTask({ title: 'Groceries', emoji: '🛒' }, 2),
    ];

    const presets = getFrequentTaskPresets(tasks);
    expect(presets).toHaveLength(1);
    expect(presets[0]?.label).toBe('🛒 Groceries');
  });

  it('uses the most recent color without using color in the grouping key', () => {
    const tasks = [
      makeTask({ title: 'Call', color: 'sky' }),
      makeTask({ title: 'Call', color: 'rose', updatedAt: new Date('2026-02-01T12:00:00') }, 1),
      makeTask({ title: 'Call', color: 'mint', updatedAt: new Date('2026-03-01T12:00:00') }, 2),
    ];

    expect(getFrequentTaskPresets(tasks)[0]?.color).toBe('mint');
  });
});

describe('preset application contract', () => {
  it('does not include notes or date in preset payload', () => {
    const events = Array.from({ length: 3 }, (_, index) =>
      makeEvent(
        {
          title: 'Work',
          notes: `note-${index}`,
          date: `2026-04-${String(index + 1).padStart(2, '0')}`,
        },
        index,
      ),
    );

    const preset = getFrequentEventPresets(events)[0];
    expect(preset).toBeDefined();
    expect(preset).not.toHaveProperty('notes');
    expect(preset).not.toHaveProperty('date');
  });
});
