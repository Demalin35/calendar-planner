export type CalendarView = 'month' | 'day' | 'planner' | 'tasks';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  color: string;
  emoji?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  title: string;
  date?: string;
  notes?: string;
  color: string;
  emoji?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
