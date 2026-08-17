export type SuggestionAction = 'create' | 'update' | 'delete';
export type SuggestionType = 'event' | 'task';

export interface CalendarEventDto {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color?: string;
  emoji?: string;
  notes?: string;
}

export interface TaskDto {
  id: string;
  title: string;
  date?: string;
  notes?: string;
  color?: string;
  emoji?: string;
  completed?: boolean;
}

export interface SuggestedItemDto {
  id: string;
  action: SuggestionAction;
  type: SuggestionType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  emoji?: string;
  notes?: string;
  targetEventId?: string;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface PendingActionDto {
  id: string;
  createdAt: string;
  suggestions: SuggestedItemDto[];
  sourceMessage?: string;
}

export interface ConversationTurnDto {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantPlanResponseDto {
  summary: string;
  notes: string[];
  suggestions: SuggestedItemDto[];
  approvalPrompt: string;
  pendingAction?: PendingActionDto | null;
  autoApply?: boolean;
  executedActionId?: string;
}

export interface PlanRequestBody {
  message: string;
  selectedDate: string;
  language?: 'en' | 'ru';
  events: CalendarEventDto[];
  tasks: TaskDto[];
  conversationHistory?: ConversationTurnDto[];
  pendingAction?: PendingActionDto | null;
  lastExecutedActionId?: string;
}
