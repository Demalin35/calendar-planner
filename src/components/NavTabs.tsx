import clsx from 'clsx';
import { CalendarDays, CheckSquare, LayoutGrid, Sun } from 'lucide-react';
import { useUIStore } from '../store/uiStore';
import type { CalendarView } from '../types';

const TABS: { view: CalendarView; label: string; icon: typeof Sun }[] = [
  { view: 'month', label: 'Month', icon: CalendarDays },
  { view: 'day', label: 'Day', icon: Sun },
  { view: 'planner', label: 'Planner', icon: LayoutGrid },
  { view: 'tasks', label: 'Tasks', icon: CheckSquare },
];

export function NavTabs() {
  const currentView = useUIStore((s) => s.currentView);
  const setCurrentView = useUIStore((s) => s.setCurrentView);

  return (
    <nav className="grid w-full min-w-0 grid-cols-2 gap-1 rounded-2xl bg-white p-1 shadow-sm ring-1 ring-gray-100 sm:flex sm:gap-1">
      {TABS.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          onClick={() => setCurrentView(view)}
          className={clsx(
            'flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 sm:text-sm',
            currentView === view
              ? 'bg-sky-100 text-sky-700'
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
          )}
        >
          <Icon size={18} className="shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </nav>
  );
}
