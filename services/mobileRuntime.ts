import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export const MOBILE_URL_EVENT_NAME = 'sentimospadel:native-url';

const isNativePlatform = () => Capacitor.isNativePlatform();

const buildNextUrl = (incomingUrl: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const incoming = new URL(incomingUrl);
    const current = new URL(window.location.href);
    const nextSearch = incoming.searchParams.toString();
    return `${current.pathname}${nextSearch ? `?${nextSearch}` : ''}${incoming.hash}`;
  } catch (error) {
    console.error('No pudimos interpretar el deep link nativo.', error);
    return null;
  }
};

const applyIncomingUrlToWindow = (incomingUrl: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const nextUrl = buildNextUrl(incomingUrl);
  if (!nextUrl) {
    return;
  }

  window.history.replaceState({}, '', nextUrl);
  window.dispatchEvent(
    new CustomEvent(MOBILE_URL_EVENT_NAME, {
      detail: { url: incomingUrl },
    }),
  );
};

export const syncInitialNativeUrl = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }

  const launch = await CapacitorApp.getLaunchUrl();
  if (launch?.url) {
    applyIncomingUrlToWindow(launch.url);
  }
};

export const installNativeUrlListener = async (): Promise<void> => {
  if (!isNativePlatform()) {
    return;
  }

  await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    if (!url) {
      return;
    }

    applyIncomingUrlToWindow(url);
  });
};
