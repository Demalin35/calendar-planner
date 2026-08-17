export type SuggestionType = 'event' | 'task';
export type SuggestionAction = 'create' | 'update' | 'delete';

export interface SuggestedItem {
  id: string;
  action?: SuggestionAction;
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

export interface PendingAction {
  id: string;
  createdAt: string;
  suggestions: SuggestedItem[];
  sourceMessage?: string;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AssistantPlanResponse {
  summary: string;
  notes: string[];
  suggestions: SuggestedItem[];
  approvalPrompt: string;
  pendingAction?: PendingAction | null;
  autoApply?: boolean;
  executedActionId?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  plan?: AssistantPlanResponse;
}

export interface PlanningContext {
  date: string;
  dateLabel: string;
  existingEventCount: number;
  existingTaskCount: number;
}

export interface SaveSuggestionsResult {
  savedEvents: number;
  savedTasks: number;
  updatedEvents: number;
  deletedEvents: number;
  skipped: number;
  skippedTitles: string[];
}
