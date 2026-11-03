import { lookFor, platformFor, type Look, type Platform } from '../lib/platform';
import { useApp } from '../state/AppState';

/** Whose home screen the new look shows: the phone's own, or the one picked in Settings. */
export function usePlatform(): Platform {
  return platformFor(useApp().settings.phone);
}

/** The app's look right now: the new one, or the classic one. */
export function useLook(): Look {
  return lookFor(useApp().settings.look);
}
