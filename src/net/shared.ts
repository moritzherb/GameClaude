import { useCallback, useEffect, useRef, useState } from 'react';
import { load, save } from '../lib/storage';
import { useRoom } from './RoomProvider';
import { savedFor } from './saved';
import { useFreshMoves, useMoveNumbers, useQueuedSend, useResync } from './sync';

/*
 * One state shared by every phone in the room, for turn-based games whose whole state is a plain
 * object (the same game logic as on one phone). The host keeps the truth. A guest changes it right
 * away on its own screen and sends the new state along with the version it was made from; the host
 * takes it only if nothing else happened in between, otherwise the guest gets the host's state back.
 */

interface Box<S> {
  s: S;
  /** Counts up with every change, so a change made from an old state can be told apart. */
  v: number;
}

type Msg<S> =
  | { g: string; type: 'state'; s: S; v: number; /** The guest's last move the host has dealt with. */ ack: number }
  | { g: string; type: 'set'; s: S; base: number; n: number }
  | { g: string; type: 'sync' };

export type SetShared<S> = (next: S | ((prev: S) => S)) => void;

/**
 * `key` tells this game's messages apart (and names its saved copy on the host, so a reloaded host
 * phone carries on where it was).
 */
export function useShared<S>(key: string, initial: S) {
  const room = useRoom();
  const isHost = room.role === 'host';
  const myId = room.myId ?? '';
  const { onGame, sendTo, sendToHost, members, code } = room;
  const isMsg = (d: unknown): d is Msg<S> => typeof d === 'object' && d !== null && (d as Msg<S>).g === key;

  const storeKey = `${key}:shared`;
  // The host's saved copy (after a reload, or coming back to the game), read right away.
  const [box, setBoxState] = useState<Box<S>>(() => savedFor<Box<S>>(storeKey, 'box', isHost, code) ?? { s: initial, v: 0 });
  // Messages can arrive faster than React renders: always build on the latest state.
  const boxRef = useRef(box);
  const setBox = useCallback((b: Box<S>) => {
    boxRef.current = b;
    setBoxState(b);
  }, []);

  /* ---------- Host ---------- */
  const acks = useRef(new Map<string, number>());
  const fresh = useFreshMoves();
  const restored = useRef(isHost && !!code);
  useEffect(() => {
    if (!isHost || !code || restored.current) return;
    restored.current = true;
    const saved = load<{ code: string; box: Box<S> } | null>(storeKey, null);
    if (saved?.code === code) setBox(saved.box);
  }, [isHost, code, storeKey, setBox]);
  useEffect(() => {
    if (isHost && code && restored.current) save(storeKey, { code, box });
  }, [isHost, code, storeKey, box]);

  const stateFor = useCallback(
    (id: string): Msg<S> => ({ g: key, type: 'state', s: boxRef.current.s, v: boxRef.current.v, ack: acks.current.get(id) ?? 0 }),
    [key],
  );

  // Everyone gets every new state (and whoever just came online, the current one).
  useEffect(() => {
    if (!isHost) return;
    for (const m of members) if (m.id !== myId && m.online) sendTo(m.id, stateFor(m.id));
  }, [isHost, box, members, myId, sendTo, stateFor]);

  useEffect(() => {
    if (!isHost) return;
    return onGame((data, fromId) => {
      if (!isMsg(data) || !fromId) return;
      if (data.type === 'sync') return sendTo(fromId, stateFor(fromId));
      if (data.type !== 'set' || !fresh(fromId, data.n)) return;
      acks.current.set(fromId, data.n);
      const cur = boxRef.current;
      if (data.base === cur.v) setBox({ s: data.s, v: cur.v + 1 });
      // Made from an old state: this phone gets the real one back.
      else sendTo(fromId, stateFor(fromId));
    });
    // isMsg only depends on key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, onGame, sendTo, stateFor, fresh, setBox]);

  /* ---------- Guest ---------- */
  const nextMove = useMoveNumbers();
  const lastSent = useRef(0);
  // The latest move the host hasn't confirmed yet: sent again with every resync, so a move made
  // while the host was away (reloading, on another screen) still gets there.
  const pending = useRef<Msg<S> | null>(null);
  const queued = useQueuedSend(sendToHost);
  useEffect(() => {
    if (isHost) return;
    return onGame((data) => {
      if (!isMsg(data) || data.type !== 'state') return;
      // Still waiting for the host to hear this phone's latest move: keep showing it (it's sent
      // again with the next resync).
      if (data.ack < lastSent.current) return;
      pending.current = null;
      const cur = boxRef.current;
      if (data.v === cur.v && JSON.stringify(data.s) === JSON.stringify(cur.s)) return;
      setBox({ s: data.s, v: data.v });
    });
    // isMsg only depends on key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost, onGame, setBox]);
  const ask = useCallback(() => {
    if (pending.current) sendToHost(pending.current);
    sendToHost({ g: key, type: 'sync' } satisfies Msg<S>);
  }, [sendToHost, key]);
  useResync(!isHost, ask);

  const set: SetShared<S> = useCallback(
    (next) => {
      const cur = boxRef.current;
      const s = typeof next === 'function' ? (next as (prev: S) => S)(cur.s) : next;
      if (s === cur.s) return;
      setBox({ s, v: cur.v + 1 });
      if (isHost) return;
      const n = nextMove();
      lastSent.current = n;
      const msg: Msg<S> = { g: key, type: 'set', s, base: cur.v, n };
      pending.current = msg;
      queued(msg);
    },
    [isHost, key, nextMove, queued, setBox],
  );

  return { state: box.s, set, room, isHost, myId };
}
