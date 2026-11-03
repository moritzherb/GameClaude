import { platformFor, type Platform } from '../lib/platform';
import { useApp } from '../state/AppState';

/** The look the app wears right now: the phone's own, or the one picked in Settings. */
export function usePlatform(): Platform {
  return platformFor(useApp().settings.look);
}
