import Dexie, { type EntityTable } from 'dexie';
import type { CalendarEvent, Task } from '../types';

class CalendarPlannerDB extends Dexie {
  events!: EntityTable<CalendarEvent, 'id'>;
  tasks!: EntityTable<Task, 'id'>;

  constructor() {
    super('CalendarPlannerDB');
    this.version(1).stores({
      events: 'id, date',
      tasks: 'id, date, completed',
    });
  }
}

export const db = new CalendarPlannerDB();
