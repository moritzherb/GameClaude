import { useEffect } from 'react';

/** Keeps the phone screen on while a game is open, so nobody has to unlock it every round. */
export function useWakeLock() {
  useEffect(() => {
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
