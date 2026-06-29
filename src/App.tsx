import { NavTabs } from './components/NavTabs';
import { PlaceholderView } from './components/PlaceholderView';
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
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Your local planner — no account needed
          </p>
        </header>

        <NavTabs />

        <main className="mt-4 flex-1">
          {currentView === 'month' && <MonthView />}
          {currentView === 'day' && <DayView />}
          {currentView === 'planner' && (
            <PlaceholderView
              title="Planner"
              description="Weekly planning board coming soon."
            />
          )}
          {currentView === 'tasks' && <TasksView />}
        </main>
      </div>

      {isEventModalOpen && <EventForm />}
      {isTaskModalOpen && <TaskForm />}
    </div>
  );
}

export default App;
