import clsx from 'clsx';

interface EmojiTitleProps {
  title: string;
  emoji?: string;
  completed?: boolean;
  className?: string;
  titleClassName?: string;
}

export function EmojiTitle({
  title,
  emoji,
  completed = false,
  className,
  titleClassName,
}: EmojiTitleProps) {
  return (
    <span className={clsx('flex min-w-0 items-center gap-1.5', className)}>
      {emoji && (
        <span className="shrink-0 text-base leading-none" aria-hidden="true">
          {emoji}
        </span>
      )}
      <span
        className={clsx(
          'min-w-0 truncate',
          completed && 'text-gray-400 line-through',
          titleClassName,
        )}
      >
        {title}
      </span>
    </span>
  );
}
