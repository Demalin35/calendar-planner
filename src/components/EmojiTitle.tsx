import clsx from 'clsx';

interface EmojiTitleProps {
  title: string;
  emoji?: string;
  completed?: boolean;
  compact?: boolean;
  className?: string;
  titleClassName?: string;
}

export function EmojiTitle({
  title,
  emoji,
  completed = false,
  compact = false,
  className,
  titleClassName,
}: EmojiTitleProps) {
  return (
    <span
      className={clsx(
        'flex min-w-0 items-center',
        compact ? 'gap-0.5' : 'gap-1.5',
        className,
      )}
    >
      {emoji && (
        <span
          className={clsx(
            'shrink-0 leading-none',
            compact ? 'text-[11px] sm:text-xs' : 'text-base',
          )}
          aria-hidden="true"
        >
          {emoji}
        </span>
      )}
      <span
        className={clsx(
          'min-w-0 truncate',
          completed && 'opacity-60 line-through',
          titleClassName,
        )}
      >
        {title}
      </span>
    </span>
  );
}
