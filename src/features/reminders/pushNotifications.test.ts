import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getNotificationPermissionState,
  isPushApiAvailable,
} from './pushNotifications';

function mockPushEnvironment(options: {
  notification?: boolean;
  serviceWorker?: boolean;
  pushManagerOnWindow?: boolean;
  permission?: NotificationPermission;
  iosStandalone?: boolean;
}) {
  const {
    notification = true,
    serviceWorker = true,
    pushManagerOnWindow = true,
    permission = 'default',
    iosStandalone = false,
  } = options;

  const userAgent = iosStandalone
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Macintosh; Intel Mac OS X) AppleWebKit/537.36 Chrome/120 Safari/537.36';

  const navigator = {
    userAgent,
    platform: iosStandalone ? 'iPhone' : 'MacIntel',
    maxTouchPoints: iosStandalone ? 5 : 0,
    standalone: iosStandalone,
    serviceWorker: serviceWorker ? {} : undefined,
  };

  const windowObj: Record<string, unknown> = {
    navigator,
    matchMedia: (query: string) => ({
      matches: iosStandalone && query === '(display-mode: standalone)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
    document: { referrer: '' },
  };

  if (notification) {
    const notificationApi = { permission };
    windowObj.Notification = notificationApi;
    vi.stubGlobal('Notification', notificationApi);
  }

  if (pushManagerOnWindow) {
    windowObj.PushManager = function PushManager() {};
  }

  vi.stubGlobal('window', windowObj);
  vi.stubGlobal('document', windowObj.document);
}

describe('pushNotifications capability detection', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reports unsupported when Notification API is missing', () => {
    mockPushEnvironment({ notification: false });
    expect(isPushApiAvailable()).toBe(false);
    expect(getNotificationPermissionState()).toBe('unsupported');
  });

  it('supports Chromium when PushManager is on window', () => {
    mockPushEnvironment({ pushManagerOnWindow: true });
    expect(isPushApiAvailable()).toBe(true);
    expect(getNotificationPermissionState()).toBe('default');
  });

  it('supports iOS Home Screen PWA without PushManager on window', () => {
    mockPushEnvironment({
      pushManagerOnWindow: false,
      iosStandalone: true,
    });
    expect(isPushApiAvailable()).toBe(true);
    expect(getNotificationPermissionState()).toBe('default');
  });

  it('does not treat iPhone Safari browser as push-capable without PushManager', () => {
    mockPushEnvironment({
      pushManagerOnWindow: false,
      iosStandalone: false,
    });

    vi.stubGlobal('window', {
      navigator: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        platform: 'iPhone',
        maxTouchPoints: 5,
        standalone: false,
        serviceWorker: {},
      },
      Notification: { permission: 'default' },
      matchMedia: () => ({
        matches: false,
        media: '',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
      document: { referrer: '' },
    });

    expect(isPushApiAvailable()).toBe(false);
  });
});
