import { describe, expect, it } from 'vitest';
import type { CalendarEvent } from '../../types';
import { DEFAULT_EVENT_COLOR } from '../calendar/constants';
import { generateMockPlan } from './mockAssistant';
import {
  applyPendingModification,
  createPendingAction,
  detectClientIntent,
  isAffirmation,
  isExplicitCreateIntent,
  isRejection,
  requiresConfirmationForProposals,
  resolveDateFromMessage,
  validatePendingSuggestions,
} from './conversationState';
import type { SuggestedItem } from './assistantTypes';

const SELECTED_DATE = '2026-08-17';

function makeSuggestion(overrides: Partial<SuggestedItem> = {}): SuggestedItem {
  return {
    id: 'suggestion-1',
    action: 'create',
    type: 'event',
    title: 'Swimming',
    date: '2026-08-18',
    startTime: '08:00',
    endTime: '09:00',
    color: DEFAULT_EVENT_COLOR,
    emoji: '🏊',
    hasConflict: false,
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<CalendarEvent> & Pick<CalendarEvent, 'date' | 'startTime' | 'endTime'>,
): CalendarEvent {
  const now = new Date();
  return {
    id: 'event-1',
    title: 'Work',
    color: DEFAULT_EVENT_COLOR,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('conversationState intent detection', () => {
  it('detects explicit create instructions', () => {
    expect(
      isExplicitCreateIntent(
        'I have a plan to go for a swimming tomorrow at 8am can you add it?',
      ),
    ).toBe(true);
    expect(isExplicitCreateIntent('Add swimming tomorrow at 8')).toBe(true);
    expect(isExplicitCreateIntent('I need gym tomorrow evening')).toBe(false);
  });

  it('detects affirmation and rejection replies', () => {
    expect(isAffirmation('Yes')).toBe(true);
    expect(isAffirmation('OK')).toBe(true);
    expect(isAffirmation('Do it')).toBe(true);
    expect(isRejection('No')).toBe(true);
    expect(isRejection('Cancel')).toBe(true);
  });

  it('maps short replies to pending intents only when pending exists', () => {
    expect(detectClientIntent('Yes', false)).toBe('message');
    expect(detectClientIntent('Yes', true)).toBe('confirm_pending');
    expect(detectClientIntent('No', true)).toBe('reject_pending');
    expect(detectClientIntent('Actually make it 9 AM', true)).toBe(
      'modify_pending',
    );
  });
});

describe('conversationState date resolution', () => {
  it('resolves tomorrow relative to selected date', () => {
    expect(resolveDateFromMessage('swimming tomorrow at 8am', SELECTED_DATE)).toBe(
      '2026-08-18',
    );
  });

  it('keeps pending action date on confirmation', () => {
    const pending = createPendingAction([
      makeSuggestion({ date: '2026-08-18', startTime: '08:00' }),
    ]);

    expect(pending.suggestions[0].date).toBe('2026-08-18');
    expect(pending.suggestions[0].startTime).toBe('08:00');
  });
});

describe('conversationState confirmation rules', () => {
  it('skips redundant confirmation for explicit conflict-free creates', () => {
    const suggestions = [makeSuggestion()];
    expect(
      requiresConfirmationForProposals(
        suggestions,
        isExplicitCreateIntent('Add swimming tomorrow at 8 AM'),
      ),
    ).toBe(false);
  });

  it('requires confirmation for conflict alternatives', () => {
    const suggestions = [makeSuggestion({ hasConflict: true })];
    expect(requiresConfirmationForProposals(suggestions, true)).toBe(true);
  });

  it('requires confirmation for destructive actions', () => {
    const suggestions = [makeSuggestion({ action: 'delete', targetEventId: 'e1' })];
    expect(requiresConfirmationForProposals(suggestions, true)).toBe(true);
  });

  it('updates pending proposal time instead of forgetting it', () => {
    const pending = createPendingAction([makeSuggestion()]);
    const modified = applyPendingModification(
      'Actually make it 9 AM',
      pending,
      SELECTED_DATE,
    );

    expect(modified?.suggestions[0].startTime).toBe('09:00');
    expect(modified?.suggestions[0].date).toBe('2026-08-18');
  });
});

describe('conversationState conflict validation', () => {
  it('detects conflicts when confirming pending actions', () => {
    const suggestions = [makeSuggestion()];
    const events = [
      makeEvent({
        date: '2026-08-18',
        startTime: '07:30',
        endTime: '08:30',
        title: 'Work',
      }),
    ];

    const validated = validatePendingSuggestions(suggestions, events);
    expect(validated[0].hasConflict).toBe(true);
  });
});

describe('mock assistant reproduction scenario', () => {
  it('creates swimming tomorrow immediately for explicit add request', async () => {
    const plan = await generateMockPlan({
      message:
        'I have a plan to go for a swimming tomorrow at 8am can you add it?',
      selectedDate: SELECTED_DATE,
      events: [],
      tasks: [],
    });

    expect(plan.autoApply).toBe(true);
    expect(plan.suggestions).toHaveLength(1);
    expect(plan.suggestions[0].date).toBe('2026-08-18');
    expect(plan.suggestions[0].startTime).toBe('08:00');
    expect(plan.summary).toContain('Swimming');
    expect(plan.pendingAction).toBeNull();
  });

  it('executes Yes against pending swimming proposal with preserved date', async () => {
    const pending = createPendingAction([
      makeSuggestion({
        title: 'Swimming',
        date: '2026-08-18',
        startTime: '08:00',
        endTime: '09:00',
      }),
    ]);

    const confirmed = await generateMockPlan({
      message: 'Yes',
      selectedDate: SELECTED_DATE,
      events: [],
      tasks: [],
      pendingAction: pending,
    });

    expect(confirmed.autoApply).toBe(true);
    expect(confirmed.suggestions[0].date).toBe('2026-08-18');
    expect(confirmed.suggestions[0].startTime).toBe('08:00');
    expect(confirmed.executedActionId).toBe(pending.id);
  });

  it('clears pending action on rejection without mutating', async () => {
    const pending = createPendingAction([makeSuggestion()]);
    const rejected = await generateMockPlan({
      message: 'No',
      selectedDate: SELECTED_DATE,
      events: [],
      tasks: [],
      pendingAction: pending,
    });

    expect(rejected.pendingAction).toBeNull();
    expect(rejected.suggestions).toHaveLength(0);
    expect(rejected.autoApply).toBeFalsy();
  });

  it('prevents duplicate execution for the same pending action id', async () => {
    const pending = createPendingAction([makeSuggestion()]);
    const first = await generateMockPlan({
      message: 'Yes',
      selectedDate: SELECTED_DATE,
      events: [],
      tasks: [],
      pendingAction: pending,
    });

    expect(first.autoApply).toBe(true);

    const second = await generateMockPlan({
      message: 'Yes',
      selectedDate: SELECTED_DATE,
      events: [],
      tasks: [],
      pendingAction: pending,
      lastExecutedActionId: pending.id,
    });

    expect(second.autoApply).toBeFalsy();
    expect(second.suggestions).toHaveLength(0);
    expect(second.summary).toContain('already applied');
  });

  it('does not replay old pending action on unrelated Yes', async () => {
    const intent = detectClientIntent('Yes', false);
    expect(intent).toBe('message');
  });
});
