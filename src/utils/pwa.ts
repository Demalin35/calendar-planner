export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;

  // iPadOS 13+ may report as MacIntel.
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };

  // iOS Add to Home Screen
  if (nav.standalone === true) return true;

  // Standard / iOS 16.4+ PWA display modes
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;

  // Android installed PWA / TWA
  if (
    typeof document !== 'undefined' &&
    document.referrer.startsWith('android-app://')
  ) {
    return true;
  }

  return false;
}

/**
 * Safari (or WebKit) on iPhone/iPad while still in the browser — not the Home Screen app.
 */
export function isIosSafariBrowser(): boolean {
  if (!isIosDevice()) return false;
  if (isStandaloneMode()) return false;

  const { userAgent } = window.navigator;
  const isAppleWebKit = /AppleWebKit/.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isAppleWebKit && !isOtherIosBrowser;
}

/** @deprecated Prefer {@link isIosSafariBrowser} */
export function isIosSafari(): boolean {
  return isIosSafariBrowser();
}

export function isIosStandalonePwa(): boolean {
  return isIosDevice() && isStandaloneMode();
}
