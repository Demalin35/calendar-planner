import clsx from 'clsx';
import { Bell, CalendarDays, CheckSquare, LayoutGrid } from 'lucide-react';
import { themeClasses } from '../constants/theme';
import { useUIStore } from '../store/uiStore';
import type { CalendarView } from '../types';

const TABS: { view: CalendarView; label: string; icon: typeof Bell }[] = [
  { view: 'month', label: 'Month', icon: CalendarDays },
  { view: 'planner', label: 'Planner', icon: LayoutGrid },
  { view: 'tasks', label: 'Tasks', icon: CheckSquare },
  { view: 'reminders', label: 'Reminders', icon: Bell },
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
            'flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition sm:flex-1',
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
