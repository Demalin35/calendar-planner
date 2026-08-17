import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  isIosDevice,
  isIosSafariBrowser,
  isIosStandalonePwa,
  isStandaloneMode,
} from './pwa';

function mockBrowserEnvironment(options: {
  userAgent: string;
  platform: string;
  maxTouchPoints?: number;
  standalone?: boolean;
  displayModes?: Record<string, boolean>;
  referrer?: string;
}) {
  const {
    userAgent,
    platform,
    maxTouchPoints = 0,
    standalone = false,
    displayModes = {},
    referrer = '',
  } = options;

  const navigator = {
    userAgent,
    platform,
    maxTouchPoints,
    standalone,
  };

  const matchMedia = (query: string) => ({
    matches: displayModes[query] ?? false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  vi.stubGlobal('window', {
    navigator,
    matchMedia,
    document: { referrer },
  });
  vi.stubGlobal('document', { referrer });
}

describe('pwa detection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('detects iPhone Safari browser (not installed)', () => {
    mockBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: false,
      displayModes: { '(display-mode: standalone)': false },
    });

    expect(isIosDevice()).toBe(true);
    expect(isStandaloneMode()).toBe(false);
    expect(isIosSafariBrowser()).toBe(true);
    expect(isIosStandalonePwa()).toBe(false);
  });

  it('detects iPhone Home Screen PWA via navigator.standalone', () => {
    mockBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: true,
      displayModes: { '(display-mode: standalone)': false },
    });

    expect(isStandaloneMode()).toBe(true);
    expect(isIosSafariBrowser()).toBe(false);
    expect(isIosStandalonePwa()).toBe(true);
  });

  it('detects iPhone Home Screen PWA via display-mode standalone', () => {
    mockBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      platform: 'iPhone',
      maxTouchPoints: 5,
      standalone: false,
      displayModes: { '(display-mode: standalone)': true },
    });

    expect(isStandaloneMode()).toBe(true);
    expect(isIosSafariBrowser()).toBe(false);
    expect(isIosStandalonePwa()).toBe(true);
  });

  it('detects desktop Chrome as neither iOS Safari browser nor iOS standalone', () => {
    mockBrowserEnvironment({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'MacIntel',
      maxTouchPoints: 0,
      standalone: false,
      displayModes: { '(display-mode: standalone)': false },
    });

    expect(isIosDevice()).toBe(false);
    expect(isIosSafariBrowser()).toBe(false);
    expect(isStandaloneMode()).toBe(false);
  });
});
