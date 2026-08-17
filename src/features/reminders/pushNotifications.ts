import { canEnableIosWebPush, isIosDevice } from '../../utils/pwa';
import { fetchVapidPublicKey, subscribePushApi } from './remindersApi';

export type NotificationPermissionState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied'
  | 'misconfigured'
  | 'error';

export type PushEnableResult = {
  state: NotificationPermissionState;
};

/**
 * Web Push is available when Notifications + service workers exist.
 * On iOS 16.4+ Home Screen PWAs, PushManager may only exist on the SW registration.
 */
export function isPushApiAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (!('serviceWorker' in window.navigator)) return false;

  if ('PushManager' in window) return true;

  // iOS installed PWA — push is exposed via registration.pushManager after SW is ready.
  if (isIosDevice() && canEnableIosWebPush()) return true;

  return false;
}

export function getNotificationPermissionState(): NotificationPermissionState {
  if (!isPushApiAvailable()) {
    return 'unsupported';
  }
  return Notification.permission;
}

export async function enableReminderNotifications(): Promise<PushEnableResult> {
  if (!isPushApiAvailable()) {
    return { state: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { state: permission };
  }

  try {
    const registration = await window.navigator.serviceWorker.ready;

    if (!registration.pushManager) {
      return { state: 'unsupported' };
    }

    let publicKey: string;
    try {
      publicKey = await fetchVapidPublicKey();
    } catch {
      return { state: 'misconfigured' };
    }

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    await subscribePushApi(subscription.toJSON());
    return { state: 'granted' };
  } catch {
    return { state: 'error' };
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
