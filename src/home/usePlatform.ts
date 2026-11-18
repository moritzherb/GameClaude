import { platformFor, type Platform } from '../lib/platform';
import { useApp } from '../state/AppState';

/** Whose home screen the new look shows: the phone's own, or the one picked in Settings. */
export function usePlatform(): Platform {
  return platformFor(useApp().settings.phone);
}

