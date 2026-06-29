import { create } from 'zustand';
import type { CalendarView } from '../types';

interface UIState {
  selectedDate: Date;
  currentView: CalendarView;
  isEventModalOpen: boolean;
  editingEventId: string | null;
  isTaskModalOpen: boolean;
  editingTaskId: string | null;
  suggestedStartTime: string | null;
  suggestedEndTime: string | null;
  setSelectedDate: (date: Date) => void;
  setCurrentView: (view: CalendarView) => void;
  openEventModal: (
    date?: Date,
    eventId?: string,
    startTime?: string,
    endTime?: string,
  ) => void;
  closeEventModal: () => void;
  openTaskModal: (taskId?: string) => void;
  closeTaskModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedDate: new Date(),
  currentView: 'month',
  isEventModalOpen: false,
  editingEventId: null,
  isTaskModalOpen: false,
  editingTaskId: null,
  suggestedStartTime: null,
  suggestedEndTime: null,

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

  openTaskModal: (taskId) =>
    set({
      isTaskModalOpen: true,
      editingTaskId: taskId ?? null,
    }),

  closeTaskModal: () =>
    set({ isTaskModalOpen: false, editingTaskId: null }),
}));
