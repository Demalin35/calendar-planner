import { NavTabs } from './components/NavTabs';
import { ThemeToggle } from './components/ThemeToggle';
import { themeClasses } from './constants/theme';
import { PlannerView } from './features/planner';
import { TaskForm, TasksView } from './features/tasks';
import { DayView } from './features/calendar/DayView';
import { EventForm } from './features/calendar/EventForm';
import { MonthView } from './features/calendar/MonthView';
import { useUIStore } from './store/uiStore';

function App() {
  const currentView = useUIStore((s) => s.currentView);
  const isEventModalOpen = useUIStore((s) => s.isEventModalOpen);
  const isTaskModalOpen = useUIStore((s) => s.isTaskModalOpen);

  return (
    <div className={themeClasses.page}>
      <div className="mx-auto flex min-h-screen w-full min-w-0 max-w-5xl flex-col px-3 py-4 sm:px-6 sm:py-6">
        <header className="mb-4 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Calendar
              </h1>
              <p className="mt-1 text-sm text-muted">
                Your local planner — no account needed
              </p>
            </div>
            <ThemeToggle />
          </div>
        </header>

        <NavTabs />

        <main className="mt-4 min-w-0 flex-1">
          {currentView === 'month' && <MonthView />}
          {currentView === 'day' && <DayView />}
          {currentView === 'planner' && <PlannerView />}
          {currentView === 'tasks' && <TasksView />}
        </main>
      </div>

      {isEventModalOpen && <EventForm />}
      {isTaskModalOpen && <TaskForm />}
    </div>
  );
}

export default App;
