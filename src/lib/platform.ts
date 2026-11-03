import { native } from './native';

/** Which phone the app dresses up as: its home screen, its fonts, its buttons. */
export type Platform = 'ios' | 'android';
/** The setting: follow the phone, or always one of the two. */
export type Look = 'auto' | Platform;

/**
 * The phone the app runs on. The store app says so itself; in a browser the user agent tells. A
 * computer (or anything else) gets the iPhone look.
 */
export function detectPlatform(info = native, ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): Platform {
  if (info) return info.platform;
  return /android/i.test(ua) ? 'android' : 'ios';
}

/** What the setting means on this phone. */
export function platformFor(look: Look | undefined, detected: Platform = detectPlatform()): Platform {
  return look === 'ios' || look === 'android' ? look : detected;
}
