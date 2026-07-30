import type { CalendarEvent, Task } from '../../types';
import type { AssistantLanguage } from './detectLanguage';
import type { AssistantPlanResponse } from './assistantTypes';
import { generateMockPlan } from './mockAssistant';

export interface PlanAssistantRequest {
  message: string;
  selectedDate: string;
  language: AssistantLanguage;
  events: CalendarEvent[];
  tasks: Task[];
}

function toDtoEvent(event: CalendarEvent) {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    startTime: event.startTime,
    endTime: event.endTime,
    color: event.color,
    emoji: event.emoji,
    notes: event.notes,
  };
}

function toDtoTask(task: Task) {
  return {
    id: task.id,
    title: task.title,
    date: task.date,
    notes: task.notes,
    color: task.color,
    emoji: task.emoji,
    completed: task.completed,
  };
}

/**
 * Calls the local server OpenAI endpoint.
 * Falls back to the mock planner only when the server is unreachable.
 * Conflict validation still happens on save.
 */
export async function requestAssistantPlan(
  request: PlanAssistantRequest,
): Promise<AssistantPlanResponse> {
  let response: Response;

  try {
    response = await fetch('/api/assistant/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: request.message,
        selectedDate: request.selectedDate,
        language: request.language,
        events: request.events.map(toDtoEvent),
        tasks: request.tasks.map(toDtoTask),
      }),
    });
  } catch (error) {
    console.warn(
      '[assistant] Server unreachable — using mock planner:',
      error instanceof Error ? error.message : error,
    );
    return generateMockPlan(
      request.message,
      request.selectedDate,
      request.events,
      request.tasks,
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      payload?.error || `Assistant API failed (${response.status})`,
    );
  }

  return (await response.json()) as AssistantPlanResponse;
}
