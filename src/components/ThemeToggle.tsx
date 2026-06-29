import { Moon, Sun } from 'lucide-react';
import { themeClasses } from '../constants/theme';
import { useUIStore } from '../store/uiStore';

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);
  const isNight = theme === 'night';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={themeClasses.themeToggle}
      aria-label={isNight ? 'Switch to day mode' : 'Switch to night mode'}
      title={isNight ? 'Day mode' : 'Night mode'}
    >
      {isNight ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
