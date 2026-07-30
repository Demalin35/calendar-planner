import OpenAI from 'openai';
import type {
  ResponseInputItem,
  EasyInputMessage,
} from 'openai/resources/responses/responses';
import {
  ASSISTANT_TOOLS,
  createToolContext,
  executeTool,
} from './tools.js';
import type {
  AssistantPlanResponseDto,
  PlanRequestBody,
} from './types.js';

const MAX_TOOL_ROUNDS = 8;

function buildInstructions(params: {
  selectedDate: string;
  language: 'en' | 'ru';
  workDayStart: string;
  workDayEnd: string;
}): string {
  return [
    'You are a personal calendar planning assistant.',
    'Interpret the user request, inspect calendar data with tools, and propose safe schedule changes.',
    'Never claim that an event was created, updated, or deleted. You only propose changes for later user approval.',
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
    '"After work" means after ' + params.workDayEnd + ' when no Work event is found; otherwise after the Work event ends.',
    'Respond in ' +
      (params.language === 'ru' ? 'Russian' : 'English') +
      '.',
    'Selected / reference date for relative terms like today: ' +
      params.selectedDate +
      '.',
    'Keep the final message concise and helpful.',
    'If you made proposals, end by asking whether the user wants to apply them.',
  ].join(' ');
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

export async function runPlanningAssistant(
  body: PlanRequestBody,
): Promise<AssistantPlanResponseDto> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not configured. Add it to server/.env (never commit the key).',
    );
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
  const workDayStart = process.env.WORK_DAY_START || '09:00';
  const workDayEnd = process.env.WORK_DAY_END || '18:00';
  const language = body.language === 'ru' ? 'ru' : 'en';

  const client = new OpenAI({ apiKey });
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

  const input: Array<EasyInputMessage | ResponseInputItem> = [
    {
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
    },
  ];

  let response = await client.responses.create({
    model,
    instructions: buildInstructions({
      selectedDate: body.selectedDate,
      language,
      workDayStart,
      workDayEnd,
    }),
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
      instructions: buildInstructions({
        selectedDate: body.selectedDate,
        language,
        workDayStart,
        workDayEnd,
      }),
      tools: ASSISTANT_TOOLS,
      input,
    });
  }

  const summary =
    extractOutputText(response) ||
    (language === 'ru'
      ? 'Я подготовил предложения по расписанию.'
      : 'I prepared scheduling suggestions.');

  const hasActionable = context.proposals.some((item) => !item.hasConflict);
  const approvalPrompt =
    context.proposals.length === 0
      ? language === 'ru'
        ? 'Могу предложить другой вариант, если уточните время или длительность.'
        : 'I can suggest another option if you clarify the time or duration.'
      : hasActionable
        ? language === 'ru'
          ? 'Добавить / применить эти изменения?'
          : 'Would you like me to apply these changes?'
        : language === 'ru'
          ? 'Есть конфликты. Выберите другое время или более короткий вариант.'
          : 'There are conflicts. Choose another time or a shorter option.';

  return {
    summary,
    notes: context.notes,
    suggestions: context.proposals,
    approvalPrompt,
  };
}
