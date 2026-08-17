import clsx from 'clsx';
import { Modal } from '../../components/Modal';
import { themeClasses } from '../../constants/theme';
import { getRemindersLanguage, rt } from './remindersCopy';
import type { ReminderDraft } from './types';

interface CompleteReminderDialogProps {
  dueDate: string;
  draft: ReminderDraft;
  onConfirm: () => void;
  onChangeDate: () => void;
  onDismiss: () => void;
}

export function CompleteReminderDialog({
  dueDate,
  draft,
  onConfirm,
  onChangeDate,
  onDismiss,
}: CompleteReminderDialogProps) {
  const lang = getRemindersLanguage();

  return (
    <Modal title={rt(lang, 'reminderCompleted')} onClose={onDismiss}>
      <p className="text-sm text-foreground">
        {rt(lang, 'createNextPrompt', { date: dueDate })}
      </p>

      <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={onConfirm}
          className={clsx('w-full sm:w-auto', themeClasses.primaryBtn)}
        >
          {rt(lang, 'yes')}
        </button>
        <button
          type="button"
          onClick={onChangeDate}
          className="w-full rounded-xl border border-border px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-soft sm:w-auto"
        >
          {rt(lang, 'changeDate')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="w-full rounded-xl px-4 py-2 text-sm font-medium text-muted transition hover:bg-surface-soft sm:w-auto"
        >
          {rt(lang, 'noThanks')}
        </button>
      </div>

      <p className="mt-4 text-xs text-muted">
        {draft.emoji ? `${draft.emoji} ` : ''}
        {draft.title}
      </p>
    </Modal>
  );
}
