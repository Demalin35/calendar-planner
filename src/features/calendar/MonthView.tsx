import { DesktopMonthGrid } from './DesktopMonthGrid';
import { MobileWeekCalendar } from './MobileWeekCalendar';

export function MonthView() {
  return (
    <>
      <div className="md:hidden">
        <MobileWeekCalendar />
      </div>
      <div className="hidden md:block">
        <DesktopMonthGrid />
      </div>
    </>
  );
}
