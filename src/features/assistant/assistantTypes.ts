export type SuggestionType = 'event' | 'task';

export interface SuggestedItem {
  id: string;
  type: SuggestionType;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  emoji?: string;
  notes?: string;
  hasConflict: boolean;
  conflictReason?: string;
}

export interface AssistantPlanResponse {
  summary: string;
  notes: string[];
  suggestions: SuggestedItem[];
  approvalPrompt: string;
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
  skipped: number;
  skippedTitles: string[];
}
