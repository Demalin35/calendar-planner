export const IOS_INSTALL_DISMISS_KEY = 'calendar-planner-ios-install-dismissed';

export function isStandaloneMode(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone ===
      true
  );
}

export function isIosSafari(): boolean {
  const { userAgent } = window.navigator;
  const isIos = /iPad|iPhone|iPod/.test(userAgent);
  const isSafari =
    /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIos && isSafari;
}

export function isIosInstallDismissed(): boolean {
  try {
    return localStorage.getItem(IOS_INSTALL_DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissIosInstallHint(): void {
  try {
    localStorage.setItem(IOS_INSTALL_DISMISS_KEY, '1');
  } catch {
    // ignore storage errors
  }
}
