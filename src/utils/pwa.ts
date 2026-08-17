export function isIosDevice(): boolean {
  if (typeof window === 'undefined') return false;

  const { userAgent, platform, maxTouchPoints } = window.navigator;
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;

  // iPadOS 13+ may report as MacIntel.
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

function isAppleWebKitSafari(): boolean {
  const { userAgent } = window.navigator;
  const isAppleWebKit = /AppleWebKit/.test(userAgent);
  const isOtherIosBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isAppleWebKit && !isOtherIosBrowser;
}

/**
 * True when the page runs as an installed iOS web app (Home Screen), not a Safari tab.
 */
export function isIosStandalonePwa(): boolean {
  if (!isIosDevice()) return false;
  return isStandaloneMode();
}

export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  const nav = window.navigator as Navigator & { standalone?: boolean };

  // iOS Add to Home Screen (classic signal)
  if (nav.standalone === true) return true;

  // Standard / iOS 16.4+ PWA display modes
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if (window.matchMedia('(display-mode: fullscreen)').matches) return true;
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true;

  // iOS fallback: Home Screen apps are not "browser" display mode
  if (
    isIosDevice() &&
    !window.matchMedia('(display-mode: browser)').matches
  ) {
    return true;
  }

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
 * Safari on iPhone/iPad while still in the browser tab — not the Home Screen app.
 * Safari tabs show browser chrome; the installed app does not.
 */
export function isIosSafariBrowser(): boolean {
  if (!isIosDevice()) return false;
  if (isStandaloneMode()) return false;
  return isAppleWebKitSafari();
}

/** @deprecated Prefer {@link isIosSafariBrowser} */
export function isIosSafari(): boolean {
  return isIosSafariBrowser();
}

/**
 * Whether reminder push can be enabled on this iOS session.
 * Requires the Home Screen app — not a Safari browser tab.
 */
export function canEnableIosWebPush(): boolean {
  return isIosStandalonePwa();
}
