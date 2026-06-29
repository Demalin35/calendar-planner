import { themeClasses } from '../constants/theme';

interface PlaceholderViewProps {
  title: string;
  description: string;
}

export function PlaceholderView({ title, description }: PlaceholderViewProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-16 text-center ${themeClasses.card}`}
    >
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>
    </div>
  );
}
