import { Capacitor } from '@capacitor/core';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { backendApi, type PushDevicePlatform } from './backendApi';

const PUSH_INSTALLATION_ID_STORAGE_KEY = 'sentimos.pushInstallationId';
export const PUSH_OPENED_EVENT_NAME = 'sentimospadel:push-opened';

let listenersInstalled = false;
let registrationInFlight = false;

const isNativePlatform = (): boolean => Capacitor.isNativePlatform();

const resolvePlatform = (): PushDevicePlatform | null => {
  const platform = Capacitor.getPlatform();
  if (platform === 'android') return 'ANDROID';
  if (platform === 'ios') return 'IOS';
  return null;
};

const createInstallationId = (): string => {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.randomUUID) {
    return cryptoApi.randomUUID();
  }
  return `push-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const getInstallationId = (): string => {
  const existing = window.localStorage.getItem(PUSH_INSTALLATION_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const next = createInstallationId();
  window.localStorage.setItem(PUSH_INSTALLATION_ID_STORAGE_KEY, next);
  return next;
};

const installListeners = async (): Promise<void> => {
  if (listenersInstalled) {
    return;
  }

  await PushNotifications.addListener('registration', (token: Token) => {
    const platform = resolvePlatform();
    if (!platform) {
      return;
    }

    void backendApi
      .registerPushDevice({
        installationId: getInstallationId(),
        platform,
        pushToken: token.value,
      })
      .catch(error => {
        console.error('No se pudo registrar el dispositivo para push notifications.', error);
      });
  });

  await PushNotifications.addListener('registrationError', error => {
    console.error('No se pudo obtener token nativo de push notifications.', error);
  });

  await PushNotifications.addListener('pushNotificationActionPerformed', notification => {
    window.dispatchEvent(
      new CustomEvent(PUSH_OPENED_EVENT_NAME, {
        detail: notification.notification.data ?? {},
      }),
    );
  });

  listenersInstalled = true;
};

export const registerNativePushDevice = async (): Promise<void> => {
  if (!isNativePlatform() || registrationInFlight) {
    return;
  }

  const platform = resolvePlatform();
  if (!platform) {
    return;
  }

  registrationInFlight = true;
  try {
    await installListeners();
    let permission = await PushNotifications.checkPermissions();
    if (permission.receive === 'prompt') {
      permission = await PushNotifications.requestPermissions();
    }
    if (permission.receive !== 'granted') {
      return;
    }

    await PushNotifications.register();
  } finally {
    registrationInFlight = false;
  }
};

export const unregisterNativePushDevice = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }

  const installationId = window.localStorage.getItem(PUSH_INSTALLATION_ID_STORAGE_KEY);
  if (!installationId) {
    return;
  }

  try {
    await backendApi.unregisterPushDevice({ installationId });
  } finally {
    window.localStorage.removeItem(PUSH_INSTALLATION_ID_STORAGE_KEY);
  }
};
