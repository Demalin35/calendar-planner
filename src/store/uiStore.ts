import { create } from 'zustand';
import {
  applyTheme,
  getStoredTheme,
  persistTheme,
} from '../constants/theme';
import type { AppTheme } from '../types/theme';
import type { CalendarView } from '../types';

interface UIState {
  theme: AppTheme;
  selectedDate: Date;
  currentView: CalendarView;
  isEventModalOpen: boolean;
  editingEventId: string | null;
  isTaskModalOpen: boolean;
  editingTaskId: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  isAssistantOpen: boolean;
  toggleTheme: () => void;
  setSelectedDate: (date: Date) => void;
  setCurrentView: (view: CalendarView) => void;
  openEventModal: (
    date?: Date,
    eventId?: string,
    startTime?: string,
    endTime?: string,
  ) => void;
  closeEventModal: () => void;
  openTaskModal: (taskId?: string, date?: Date) => void;
  closeTaskModal: () => void;
  openAssistant: () => void;
  closeAssistant: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: getStoredTheme(),
  selectedDate: new Date(),
  currentView: 'month',
  isEventModalOpen: false,
  editingEventId: null,
  isTaskModalOpen: false,
  editingTaskId: null,
  suggestedStartTime: null,
  suggestedEndTime: null,
  isAssistantOpen: false,

  toggleTheme: () =>
    set((state) => {
      const theme: AppTheme = state.theme === 'day' ? 'night' : 'day';
      applyTheme(theme);
      persistTheme(theme);
      return { theme };
    }),

  setSelectedDate: (date) => set({ selectedDate: date }),

  setCurrentView: (view) => set({ currentView: view }),

  openEventModal: (date, eventId, startTime, endTime) =>
    set({
      isEventModalOpen: true,
      editingEventId: eventId ?? null,
      suggestedStartTime: eventId ? null : (startTime ?? null),
      suggestedEndTime: eventId ? null : (endTime ?? null),
      ...(date ? { selectedDate: date } : {}),
    }),

  closeEventModal: () =>
    set({
      isEventModalOpen: false,
      editingEventId: null,
      suggestedStartTime: null,
      suggestedEndTime: null,
    }),

  openTaskModal: (taskId, date) =>
    set({
      isTaskModalOpen: true,
      editingTaskId: taskId ?? null,
      ...(date && !taskId ? { selectedDate: date } : {}),
    }),

  closeTaskModal: () =>
    set({ isTaskModalOpen: false, editingTaskId: null }),

  openAssistant: () => set({ isAssistantOpen: true }),

  closeAssistant: () => set({ isAssistantOpen: false }),
}));
