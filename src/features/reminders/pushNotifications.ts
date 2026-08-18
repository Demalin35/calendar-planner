import { canEnableIosWebPush, isIosDevice } from '../../utils/pwa';
import {
  fetchPushSubscriptionStatus,
  fetchVapidPublicKey,
  subscribePushApi,
} from './remindersApi';

export type NotificationPermissionState =
  | 'unsupported'
  | 'default'
  | 'granted'
  | 'denied'
  | 'misconfigured'
  | 'error';

export type ReminderPushStatus =
  | NotificationPermissionState
  | 'registered'
  | 'needs_registration';

export type PushEnableResult = {
  state: ReminderPushStatus;
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

async function registerBrowserSubscriptionWithServer(): Promise<boolean> {
  const registration = await window.navigator.serviceWorker.ready;
  if (!registration.pushManager) return false;

  let publicKey: string;
  try {
    publicKey = await fetchVapidPublicKey();
  } catch {
    return false;
  }

  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }));

  await subscribePushApi(subscription.toJSON());
  return true;
}

export async function resolveReminderPushStatus(): Promise<ReminderPushStatus> {
  const permission = getNotificationPermissionState();
  if (permission !== 'granted') {
    return permission;
  }

  if (!navigator.onLine) {
    return 'needs_registration';
  }

  try {
    const serverStatus = await fetchPushSubscriptionStatus();
    if (!serverStatus.pushConfigured) {
      return 'misconfigured';
    }
    if (serverStatus.subscribed) {
      return 'registered';
    }
  } catch {
    return 'needs_registration';
  }

  try {
    const synced = await registerBrowserSubscriptionWithServer();
    return synced ? 'registered' : 'needs_registration';
  } catch {
    return 'needs_registration';
  }
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
    await fetchVapidPublicKey();
  } catch {
    return { state: 'misconfigured' };
  }

  try {
    const registered = await registerBrowserSubscriptionWithServer();
    return { state: registered ? 'registered' : 'error' };
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
