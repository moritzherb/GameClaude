/*
 * The store app (mobile/, React Native) shows this same web app in a WebView. Before the page loads
 * it sets window.__PROST_NATIVE__; from then on the two talk in small JSON messages. The page asks
 * for what a WebView can't do well (real haptics on iPhones, keeping the screen on, the share sheet,
 * ads at a natural pause), and the app tells the page about the Android back button.
 *
 * In a plain browser none of this exists and every function here does nothing.
 */

export interface NativeInfo {
  platform: 'ios' | 'android';
  /** The store app's version, e.g. "1.0.0". */
  version: string;
  /** Leave out what the app stores don't take (tobacco). */
  storeSafe: boolean;
}

export type ToNative =
  /** A vibration pattern like navigator.vibrate takes: on, off, on, … in ms. */
  | { type: 'haptic'; pattern: number[] }
  | { type: 'awake'; on: boolean }
  | { type: 'share'; title: string; text: string; url: string }
  /** Which screen is showing (a running game or not). */
  | { type: 'screen'; route: string; playing: boolean }
  /** A natural pause: a game just ended. The app may show an ad here (it decides how often). */
  | { type: 'break' }
  /** Open the ad privacy choices (the consent form). */
  | { type: 'privacy' }
  /** Open a link in the phone's browser. */
  | { type: 'open'; url: string }
  /** The back button on the home screen: close the app. */
  | { type: 'exit' }
  | { type: 'ready' };

export type FromNative = { type: 'back' } | { type: 'ads'; privacyOptions: boolean };

declare global {
  interface Window {
    __PROST_NATIVE__?: NativeInfo;
    /** The app calls this with its messages. */
    __prostNative?: (msg: FromNative) => void;
    ReactNativeWebView?: { postMessage(msg: string): void };
  }
}

export const native: NativeInfo | null = typeof window !== 'undefined' ? (window.__PROST_NATIVE__ ?? null) : null;
export const isNative = native != null;
/** The store app: no tobacco on any field or card. */
export const storeSafe = !!native?.storeSafe;

export function toNative(msg: ToNative) {
  if (!isNative) return;
  try {
    window.ReactNativeWebView?.postMessage(JSON.stringify(msg));
  } catch {
    /* the app is gone (closing) */
  }
}

const listeners = new Set<(msg: FromNative) => void>();
/** Hear what the app says; returns the way to stop listening. */
export function onNative(fn: (msg: FromNative) => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** Whether the app offers the ad privacy choices (only where the law asks for them, e.g. in the EU). */
export let privacyOptions = false;

/**
 * The Android back button, as the thumb would do it: close an open sheet, else press the
 * escape button top-left (in a game that asks before ending it), else on the home screen close
 * the app.
 */
export function goBack(home: boolean) {
  if (document.querySelector('.sheet-backdrop, .crop-backdrop')) {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    return 'sheet';
  }
  const escape = document.querySelector<HTMLButtonElement>('.top-bar .top-bar-side:not(.right) .round-btn');
  if (escape) {
    escape.click();
    return 'escape';
  }
  if (home) {
    toNative({ type: 'exit' });
    return 'exit';
  }
  history.back();
  return 'history';
}

if (isNative) {
  window.__prostNative = (msg) => {
    if (msg.type === 'ads') privacyOptions = msg.privacyOptions;
    if (msg.type === 'back') {
      const hash = window.location.hash.replace(/^#/, '');
      goBack(hash === '' || hash === '/');
    }
    listeners.forEach((fn) => fn(msg));
  };
  document.documentElement.classList.add('native', `native-${native!.platform}`);
}

const playing = (hash: string) => /^#\/(play|online)\//.test(hash);

/** Tell the app which screen shows, and when a game has just ended (a natural pause). */
export function watchScreens() {
  let last = window.location.hash;
  const report = () => {
    const now = window.location.hash;
    toNative({ type: 'screen', route: now.replace(/^#/, '') || '/', playing: playing(now) });
    if (playing(last) && !playing(now)) toNative({ type: 'break' });
    last = now;
  };
  window.addEventListener('hashchange', report);
  report();
}
