import { useEffect } from 'react';
import { isNative, toNative } from './native';

/** Keeps the phone screen on while a game is open, so nobody has to unlock it every round. */
export function useWakeLock() {
  useEffect(() => {
    // In the store app the app itself keeps the screen on (a WebView may not get a wake lock).
    if (isNative) {
      toNative({ type: 'awake', on: true });
      return () => toNative({ type: 'awake', on: false });
    }
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;

    const request = async () => {
      try {
        const next = await navigator.wakeLock?.request('screen');
        if (cancelled) void next?.release();
        else lock = next ?? null;
      } catch {
        /* denied or unsupported – no big deal */
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void request();
    };

    void request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      void lock?.release();
    };
  }, []);
}
