const CYRILLIC_PATTERN = /[а-яё]/i;

export function detectRussianInput(message: string): boolean {
  return CYRILLIC_PATTERN.test(message);
}

export type AssistantLanguage = 'en' | 'ru';

export function getAssistantLanguage(message: string): AssistantLanguage {
  return detectRussianInput(message) ? 'ru' : 'en';
}
