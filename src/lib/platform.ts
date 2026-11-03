import { native } from './native';

/** Which phone's home screen the new look shows: an iPhone's or an Android phone's. */
export type Platform = 'ios' | 'android';
/** The setting: follow the phone, or always one of the two. */
export type PhoneSetting = 'auto' | Platform;
/** The app's look: the new one (home like a phone's home screen) or the classic one. */
export type Look = 'pop' | 'classic';

/**
 * The phone the app runs on. The store app says so itself; in a browser the user agent tells. A
 * computer (or anything else) gets the iPhone look.
 */
export function detectPlatform(info = native, ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''): Platform {
  if (info) return info.platform;
  return /android/i.test(ua) ? 'android' : 'ios';
}

/** What the setting means on this phone. */
export function platformFor(phone: PhoneSetting | undefined, detected: Platform = detectPlatform()): Platform {
  return phone === 'ios' || phone === 'android' ? phone : detected;
}

/** The look in use: the new one unless the classic one was picked. */
export function lookFor(look: Look | undefined): Look {
  return look === 'classic' ? 'classic' : 'pop';
}
