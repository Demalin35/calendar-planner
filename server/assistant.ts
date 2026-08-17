import OpenAI from 'openai';
import type {
  ResponseInputItem,
  EasyInputMessage,
} from 'openai/resources/responses/responses';
import {
  applyPendingModification,
  buildApprovalPrompt,
  buildDoneSummary,
  createPendingAction,
  detectClientIntent,
  getActionableSuggestions,
  isExplicitCreateIntent,
  requiresConfirmationForProposals,
  validatePendingSuggestions,
} from './assistantConversation.js';
import {
  ASSISTANT_TOOLS,
  createToolContext,
  executeTool,
} from './tools.js';
import type {
  AssistantPlanResponseDto,
  PlanRequestBody,
} from './types.js';

const MAX_TOOL_ROUNDS = 6;
const OPENAI_TIMEOUT_MS = 45_000;
const MAX_HISTORY_TURNS = 8;

function buildInstructions(params: {
  selectedDate: string;
  language: 'en' | 'ru';
  workDayStart: string;
  workDayEnd: string;
  explicitCreate: boolean;
}): string {
  const lines = [
    'You are a personal calendar planning assistant.',
    'Interpret the user request, inspect calendar data with tools, and propose safe schedule changes.',
    'Always use check_overlap or analyze_requested_slot before propose_create / propose_update for timed events.',
    'If a requested slot conflicts, explain the conflict clearly and offer alternatives:',
    '- a shorter session that fits before the next event;',
    '- an earlier time;',
    '- the next free slot of the requested duration.',
    'Use find_free_slots for open-time requests (e.g. "90 minutes tomorrow evening").',
    'Use propose_update for moves/reschedules and propose_delete for cancellations.',
    'Work hours are ' +
      params.workDayStart +
      '–' +
      params.workDayEnd +
      ' unless the user asks otherwise.',
    '"After work" means after ' +
      params.workDayEnd +
      ' when no Work event is found; otherwise after the Work event ends.',
    'Respond in ' + (params.language === 'ru' ? 'Russian' : 'English') + '.',
    'Selected / reference date for relative terms like today: ' +
      params.selectedDate +
      '.',
    'Resolve relative dates (today, tomorrow, Friday, next Monday) to absolute yyyy-MM-dd using the selected date as anchor.',
    'When the user explicitly asks to add/create/schedule something and the slot is valid, call propose_create immediately with the resolved absolute date and time.',
    'Do not ask "Would you like me to add it?" when the user already explicitly requested creation and you have enough details.',
    'Ask for confirmation only when you are proposing a change the user did not explicitly request (conflict alternatives, moves, deletes, uncertain bulk edits).',
    'If information is missing (e.g. duration when no default applies), ask a specific clarification question — not a generic confirmation.',
    'Keep the final message concise and helpful.',
  ];

  if (params.explicitCreate) {
    lines.push(
      'The current message is an explicit create/schedule request. Propose the item with propose_create when details are sufficient.',
    );
  } else {
    lines.push(
      'If you made proposals that need user approval (conflict alternatives, moves, deletes), end by asking whether to apply them.',
    );
  }

  return lines.join(' ');
}

function extractOutputText(response: OpenAI.Responses.Response): string {
  if (typeof response.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks: string[] = [];
  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && part.text) {
        chunks.push(part.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

function buildConversationInput(
  body: PlanRequestBody,
  calendarSnapshot: Record<string, unknown>,
): Array<EasyInputMessage | ResponseInputItem> {
  const history = (body.conversationHistory ?? []).slice(-MAX_HISTORY_TURNS);
  const input: Array<EasyInputMessage | ResponseInputItem> = [];

  for (const turn of history) {
    input.push({
      role: turn.role,
      content: turn.content,
    });
  }

  input.push({
    role: 'user',
    content: [
      {
        type: 'input_text',
        text: [
          `User message: ${body.message}`,
          `Selected date: ${body.selectedDate}`,
          `Calendar snapshot JSON:\n${JSON.stringify(calendarSnapshot)}`,
        ].join('\n\n'),
      },
    ],
  });

  return input;
}

function handlePendingConfirmation(
  body: PlanRequestBody,
  language: 'en' | 'ru',
): AssistantPlanResponseDto | null {
  const pending = body.pendingAction;
  if (!pending) return null;

  const intent = detectClientIntent(body.message, true);
  const events = body.events ?? [];

  if (intent === 'reject_pending') {
    return {
      summary:
        language === 'ru'
          ? 'Хорошо, отменено. Скажите, если нужен другой вариант.'
          : 'No problem — cancelled. Tell me if you want a different plan.',
      notes: [],
      suggestions: [],
      approvalPrompt: '',
      pendingAction: null,
    };
  }

  if (intent === 'modify_pending') {
    const modified = applyPendingModification(
      body.message,
      pending,
      body.selectedDate,
    );
    if (!modified) return null;

    const validated = validatePendingSuggestions(
      modified.suggestions,
      events,
    );
    const actionable = getActionableSuggestions(validated);
    const updatedPending = {
      ...modified,
      suggestions: validated,
    };

    if (actionable.length === 0) {
      return {
        summary:
          language === 'ru'
            ? 'Обновлённый вариант конфликтует с существующими событиями.'
            : 'The updated option conflicts with existing events.',
        notes: [],
        suggestions: validated,
        approvalPrompt: buildApprovalPrompt(validated, language),
        pendingAction: updatedPending,
      };
    }

    const primary = actionable[0];
    return {
      summary:
        language === 'ru'
          ? `Обновлено: ${primary.title} ${primary.date} в ${primary.startTime}. Применить?`
          : `Updated: ${primary.title} on ${primary.date} at ${primary.startTime}. Shall I apply this?`,
      notes: [],
      suggestions: validated,
      approvalPrompt: buildApprovalPrompt(validated, language),
      pendingAction: updatedPending,
    };
  }

  if (intent !== 'confirm_pending') return null;

  if (
    body.lastExecutedActionId &&
    body.lastExecutedActionId === pending.id
  ) {
    return {
      summary:
        language === 'ru'
          ? 'Это уже было применено.'
          : 'That was already applied.',
      notes: [],
      suggestions: [],
      approvalPrompt: '',
      pendingAction: null,
      executedActionId: pending.id,
    };
  }

  const validated = validatePendingSuggestions(pending.suggestions, events);
  const actionable = getActionableSuggestions(validated);

  if (actionable.length === 0) {
    return {
      summary:
        language === 'ru'
          ? 'Не могу применить — есть конфликты с существующими событиями.'
          : 'Cannot apply — there are conflicts with existing events.',
      notes: [],
      suggestions: validated,
      approvalPrompt: buildApprovalPrompt(validated, language),
      pendingAction: { ...pending, suggestions: validated },
    };
  }

  return {
    summary: buildDoneSummary(actionable, language),
    notes: [],
    suggestions: actionable,
    approvalPrompt: '',
    pendingAction: null,
    autoApply: true,
    executedActionId: pending.id,
  };
}

export async function runPlanningAssistant(
  body: PlanRequestBody,
): Promise<AssistantPlanResponseDto> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Add it to server/.env (never commit the key).',
    );
  }

  const language = body.language === 'ru' ? 'ru' : 'en';
  const pendingResult = handlePendingConfirmation(body, language);
  if (pendingResult) {
    return pendingResult;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const workDayStart = process.env.WORK_DAY_START || '09:00';
  const workDayEnd = process.env.WORK_DAY_END || '18:00';
  const explicitCreate = isExplicitCreateIntent(body.message);

  const client = new OpenAI({
    apiKey,
    timeout: OPENAI_TIMEOUT_MS,
    maxRetries: 1,
  });
  const context = createToolContext(
    body.events ?? [],
    body.tasks ?? [],
    workDayStart,
    workDayEnd,
  );

  const calendarSnapshot = {
    selectedDate: body.selectedDate,
    workDayStart,
    workDayEnd,
    eventCount: body.events?.length ?? 0,
    taskCount: body.tasks?.length ?? 0,
    events: body.events ?? [],
    tasks: body.tasks ?? [],
  };

  const instructions = buildInstructions({
    selectedDate: body.selectedDate,
    language,
    workDayStart,
    workDayEnd,
    explicitCreate,
  });

  const input = buildConversationInput(body, calendarSnapshot);

  let response = await client.responses.create({
    model,
    instructions,
    tools: ASSISTANT_TOOLS,
    input,
  });

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const functionCalls = (response.output ?? []).filter(
      (item) => item.type === 'function_call',
    );

    if (functionCalls.length === 0) break;

    input.push(...response.output);

    for (const call of functionCalls) {
      if (call.type !== 'function_call') continue;
      const output = executeTool(call.name, call.arguments, context);
      input.push({
        type: 'function_call_output',
        call_id: call.call_id,
        output,
      });
    }

    response = await client.responses.create({
      model,
      instructions,
      tools: ASSISTANT_TOOLS,
      input,
    });
  }

  const summary =
    extractOutputText(response) ||
    (language === 'ru'
      ? 'Я подготовил предложения по расписанию.'
      : 'I prepared scheduling suggestions.');

  const proposals = context.proposals;
  const needsConfirmation = requiresConfirmationForProposals(
    proposals,
    explicitCreate,
  );
  const actionable = getActionableSuggestions(proposals);

  if (!needsConfirmation && actionable.length > 0) {
    return {
      summary: buildDoneSummary(actionable, language),
      notes: context.notes,
      suggestions: actionable,
      approvalPrompt: '',
      pendingAction: null,
      autoApply: true,
    };
  }

  const pendingAction =
    proposals.length > 0
      ? createPendingAction(proposals, body.message)
      : null;

  return {
    summary,
    notes: context.notes,
    suggestions: proposals,
    approvalPrompt: buildApprovalPrompt(proposals, language),
    pendingAction,
    autoApply: false,
  };
}
