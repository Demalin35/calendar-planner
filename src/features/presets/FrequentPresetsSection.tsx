import clsx from 'clsx';

interface FrequentPresetsSectionProps {
  presets: Array<{ label: string }>;
  onSelect: (index: number) => void;
}

export function FrequentPresetsSection({
  presets,
  onSelect,
}: FrequentPresetsSectionProps) {
  if (presets.length === 0) return null;

  return (
    <div aria-label="Frequently used presets">
      <p className="mb-2 text-xs font-medium text-muted">Frequently used</p>
      <div className="flex min-w-0 flex-wrap gap-2">
        {presets.map((preset, index) => (
          <button
            key={`${preset.label}-${index}`}
            type="button"
            title={`Use preset: ${preset.label}`}
            aria-label={`Use preset: ${preset.label}`}
            onClick={() => onSelect(index)}
            className={clsx(
              'max-w-full truncate rounded-xl border border-border bg-surface-soft px-3 py-1.5 text-xs font-medium text-foreground',
              'transition hover:bg-surface focus:outline-none focus:ring-2 focus:ring-primary-soft',
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
