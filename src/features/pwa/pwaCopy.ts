export type PwaLanguage = 'en' | 'ru';

type PwaCopyKey =
  | 'installApp'
  | 'installTitle'
  | 'iosStepShare'
  | 'iosStepAddToHome'
  | 'iosStepAdd'
  | 'close';

const COPY: Record<PwaLanguage, Record<PwaCopyKey, string>> = {
  en: {
    installApp: 'Install App',
    installTitle: 'Install Calendar Planner',
    iosStepShare: 'Tap the Share button in Safari',
    iosStepAddToHome: 'Choose “Add to Home Screen”',
    iosStepAdd: 'Tap “Add”',
    close: 'Close',
  },
  ru: {
    installApp: 'Установить',
    installTitle: 'Установить Calendar Planner',
    iosStepShare: 'Нажмите «Поделиться» в Safari',
    iosStepAddToHome: 'Выберите «На экран „Домой“»',
    iosStepAdd: 'Нажмите «Добавить»',
    close: 'Закрыть',
  },
};

export function getPwaLanguage(): PwaLanguage {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

export function pwaT(lang: PwaLanguage, key: PwaCopyKey): string {
  return COPY[lang][key];
}
