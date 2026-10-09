import { useCallback, useEffect, useRef } from 'react';
import { useRoom } from './RoomProvider';

/** How often a guest phone asks the host for the current state, just in case. */
export const RESYNC_MS = 5000;

/**
 * Guest phones: ask the host for the current state again whenever an update could have been
 * missed – after a reconnect, when the phone comes back from the background, and every few
 * seconds as a safety net. Guests ignore an answer that's the same as what they already show.
 */
export function useResync(active: boolean, ask: () => void) {
  const { status } = useRoom();
  useEffect(() => {
    if (!active) return;
    const onVisible = () => document.visibilityState === 'visible' && ask();
    document.addEventListener('visibilitychange', onVisible);
    const id = window.setInterval(ask, RESYNC_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(id);
    };
  }, [active, ask]);
  // Back online after a dropped connection: catch up right away.
  useEffect(() => {
    if (active && status === 'open') ask();
  }, [active, status, ask]);
}

/** Guest phones: only take a state that differs from the one already shown. */
export function useChanged<T>(set: (value: T) => void) {
  const last = useRef('');
  return useCallback(
    (value: T) => {
      const json = JSON.stringify(value);
      if (json === last.current) return false;
      last.current = json;
      set(value);
      return true;
    },
    [set],
  );
}

/**
 * Numbers a guest's moves so the host applies each one once, even if it arrives twice (a move is
 * sent again when no answer came back). Starts from the clock so a reloaded phone stays ahead.
 */
export function useMoveNumbers() {
  const next = useRef(Date.now());
  return useCallback(() => ++next.current, []);
}

/** Host side of useMoveNumbers: remembers each phone's last move and says whether a move is new. */
export function useFreshMoves() {
  const seen = useRef(new Map<string, number>());
  return useCallback((from: string, n: number | undefined) => {
    if (n == null) return true;
    if (n <= (seen.current.get(from) ?? 0)) return false;
    seen.current.set(from, n);
    return true;
  }, []);
}

/**
 * Guest phones: a move made while the connection is down is kept and sent once it's back,
 * instead of getting lost.
 */
export function useQueuedSend<T>(send: (data: T) => boolean) {
  const { status } = useRoom();
  const queue = useRef<T[]>([]);
  useEffect(() => {
    if (status !== 'open' || !queue.current.length) return;
    const waiting = queue.current;
    queue.current = [];
    for (const data of waiting) if (!send(data)) queue.current.push(data);
  }, [status, send]);
  return useCallback(
    (data: T) => {
      if (!send(data)) queue.current.push(data);
    },
    [send],
  );
}
