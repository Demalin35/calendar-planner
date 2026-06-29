import clsx from 'clsx';
import { CalendarDays, CheckSquare, LayoutGrid, Sun } from 'lucide-react';
import { themeClasses } from '../constants/theme';
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
    <nav
      className={clsx(
        'grid w-full min-w-0 grid-cols-2 gap-1 sm:flex sm:gap-1',
        themeClasses.nav,
      )}
    >
      {TABS.map(({ view, label, icon: Icon }) => (
        <button
          key={view}
          type="button"
          onClick={() => setCurrentView(view)}
          className={clsx(
            'flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-medium transition sm:flex-1 sm:gap-2 sm:py-2.5 sm:text-sm',
            currentView === view
              ? themeClasses.navTabActive
              : themeClasses.navTabInactive,
          )}
        >
          <Icon size={18} className="shrink-0" />
          <span className="truncate">{label}</span>
        </button>
      ))}
    </nav>
  );
}
