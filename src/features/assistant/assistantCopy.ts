import type { AssistantLanguage } from './detectLanguage';

type CopyKey =
  | 'welcome'
  | 'loading'
  | 'reject'
  | 'saved'
  | 'savedSkipped'
  | 'approvalPrompt'
  | 'summaryOne'
  | 'summaryMany'
  | 'dayPacked'
  | 'scheduleFull'
  | 'tryAlternateDay'
  | 'existingEvents'
  | 'existingTasks'
  | 'noSlotFor'
  | 'conflictOverlap'
  | 'conflictNote'
  | 'suggestionNote'
  | 'conflictReason'
  | 'approveAll'
  | 'addSelected'
  | 'rejectButton'
  | 'typeEvent'
  | 'typeTask';

const COPY: Record<AssistantLanguage, Record<CopyKey, string>> = {
  en: {
    welcome:
      'Hi! I can help you plan {date}. Tell me what you need to get done, and I will suggest a schedule. Nothing gets added until you approve it.',
    loading: 'Thinking about your day...',
    reject: 'No problem. Tell me if you want a different plan.',
    saved: 'Added {count} item(s) to your calendar.',
    savedSkipped: ' Skipped {count} conflicting item(s).',
    approvalPrompt: 'Do you want me to add these to your calendar?',
    summaryOne: 'Here is one idea for {date}.',
    summaryMany: 'Here is a draft plan with {count} items for {date}.',
    dayPacked:
      'Your day is pretty packed. I could not find open slots for new items today.',
    scheduleFull:
      'Your schedule looks full today. I could not place new items without conflicts.',
    tryAlternateDay: 'Would you like to try planning for {date} instead?',
    existingEvents: 'You already have {count} event(s) on this day.',
    existingTasks: '{count} task(s) due this day.',
    noSlotFor:
      'Could not find open time for "{title}" today. Consider moving it to {date}.',
    conflictOverlap:
      '{count} suggestion(s) overlap existing events and will not be added unless you adjust the time.',
    conflictNote:
      'Your schedule looks full today. I could not place new items without conflicts.',
    suggestionNote: 'Suggested by your planning assistant.',
    conflictReason: 'This time overlaps an existing event.',
    approveAll: 'Approve all',
    addSelected: 'Add selected',
    rejectButton: 'Reject',
    typeEvent: 'event',
    typeTask: 'task',
  },
  ru: {
    welcome:
      'Привет! Я помогу спланировать {date}. Расскажите, что нужно сделать, и я предложу расписание. Ничего не добавится, пока вы не подтвердите.',
    loading: 'Думаю над вашим днём...',
    reject: 'Хорошо. Напишите, если хотите другой план.',
    saved: 'Добавлено в календарь: {count} элемент(ов).',
    savedSkipped: ' Пропущено из‑за конфликта: {count}.',
    approvalPrompt: 'Добавить это в ваш календарь?',
    summaryOne: 'Вот одна идея на {date}.',
    summaryMany: 'Вот черновик плана из {count} пунктов на {date}.',
    dayPacked:
      'День уже довольно плотный. Не нашёл свободных слотов для новых дел сегодня.',
    scheduleFull:
      'Расписание на сегодня заполнено. Не удалось разместить новые пункты без конфликтов.',
    tryAlternateDay: 'Попробовать спланировать на {date}?',
    existingEvents: 'На этот день уже есть событий: {count}.',
    existingTasks: 'Задач на этот день: {count}.',
    noSlotFor:
      'Не нашёл свободное время для «{title}» сегодня. Можно перенести на {date}.',
    conflictOverlap:
      '{count} предложение(й) пересекается с существующими событиями и не будет добавлено без изменения времени.',
    conflictNote:
      'Расписание на сегодня заполнено. Не удалось разместить новые пункты без конфликтов.',
    suggestionNote: 'Предложено планировщиком.',
    conflictReason: 'Это время пересекается с существующим событием.',
    approveAll: 'Добавить всё',
    addSelected: 'Добавить выбранное',
    rejectButton: 'Отклонить',
    typeEvent: 'событие',
    typeTask: 'задача',
  },
};

export function t(
  lang: AssistantLanguage,
  key: CopyKey,
  vars?: Record<string, string | number>,
): string {
  let text = COPY[lang][key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }
  return text;
}
