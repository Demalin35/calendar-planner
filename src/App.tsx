import { useEffect } from 'react';
import { AIAssistantButton } from './features/assistant';
import { NavTabs } from './components/NavTabs';
import { PwaInstallButton } from './components/PwaInstall';
import { ThemeToggle } from './components/ThemeToggle';
import { themeClasses } from './constants/theme';
import { PlannerView } from './features/planner';
import { RemindersView } from './features/reminders';
import { TaskForm, TasksView } from './features/tasks';
import { EventForm } from './features/calendar/EventForm';
import { MonthView } from './features/calendar/MonthView';
import { useUIStore } from './store/uiStore';

function App() {
  const currentView = useUIStore((s) => s.currentView);
  const isEventModalOpen = useUIStore((s) => s.isEventModalOpen);
  const isTaskModalOpen = useUIStore((s) => s.isTaskModalOpen);
  const setCurrentView = useUIStore((s) => s.setCurrentView);
  const setFocusedReminderId = useUIStore((s) => s.setFocusedReminderId);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'reminders') {
      setCurrentView('reminders');
      const reminderId = params.get('reminderId');
      if (reminderId) {
        setFocusedReminderId(reminderId);
      }
    }
  }, [setCurrentView, setFocusedReminderId]);

  return (
    <div className={themeClasses.page}>
      <div className="safe-area-page mx-auto flex min-h-screen w-full min-w-0 max-w-5xl flex-col sm:px-0">
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
            <div className="flex shrink-0 items-center gap-2">
              <PwaInstallButton />
              <ThemeToggle />
            </div>
          </div>
        </header>

        <NavTabs />

        <main className="mt-4 min-w-0 flex-1">
          {currentView === 'month' && <MonthView />}
          {currentView === 'planner' && <PlannerView />}
          {currentView === 'tasks' && <TasksView />}
          {currentView === 'reminders' && <RemindersView />}
        </main>
      </div>

      {isEventModalOpen && <EventForm />}
      {isTaskModalOpen && <TaskForm />}
      <AIAssistantButton />
    </div>
  );
}

export default App;
