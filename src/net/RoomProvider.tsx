import Peer, { type DataConnection, type PeerError, type PeerOptions } from 'peerjs';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { load } from '../lib/storage';
import { newRoomCode, peerIdFor, type Member, type Profile, type ToGuest, type ToHost } from './protocol';

export type RoomStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'error' | 'closed';

export interface Cheers {
  key: number;
  name: string;
}

type GameListener = (data: unknown, fromId: string | null) => void;

interface RoomState {
  status: RoomStatus;
  role: 'host' | 'guest' | null;
  code: string | null;
  members: Member[];
  /** Human-readable reason for 'error' / 'closed'. */
  message: string | null;
  /** The latest cheers, for the toast. */
  cheers: Cheers | null;
  /** Game the host is running for the whole room (null = lobby). */
  game: string | null;
  /** Host: start a game for everyone in the room (their phones open it too). */
  startGame: (id: string) => void;
  /** Host: back to the lobby for everyone. */
  endGame: () => void;
  /** This phone's member id. */
  myId: string | null;
  host: (profile: Profile, preferredCode?: string) => void;
  join: (code: string, profile: Profile) => void;
  leave: () => void;
  removeMember: (id: string) => void;
  sendCheers: () => void;
  /** For games: guest → host. */
  /** Returns false if there is no open connection to the host right now. */
  sendToHost: (data: unknown) => boolean;
  /** For games: host → every guest. */
  broadcast: (data: unknown) => void;
  /** For games: host → one guest (e.g. a private hand). */
  sendTo: (memberId: string, data: unknown) => void;
  /** For games: hear game messages. Returns an unsubscribe function. */
  onGame: (listener: GameListener) => () => void;
}

const Ctx = createContext<RoomState | null>(null);

const GUEST_RETRY_MS = 2500;
const GUEST_GIVE_UP_MS = 90_000;
const HOST_SAME_CODE_TRIES = 8;

// The room this tab is in, so a reload (phones do that in the background) rejoins it.
const SESSION_KEY = 'prost:room';
type SavedRoom = { role: 'host' | 'guest'; code: string; game?: string | null };
function saveRoom(room: SavedRoom | null) {
  try {
    if (room) sessionStorage.setItem(SESSION_KEY, JSON.stringify(room));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage blocked */
  }
}
function savedRoom(): SavedRoom | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedRoom) : null;
  } catch {
    return null;
  }
}

/**
 * Optional own signalling server (used for local testing). Without it, PeerJS uses its
 * free public cloud server. Phones then talk to each other directly over WebRTC.
 */
function peerOptions(): PeerOptions {
  const env = import.meta.env;
  if (!env.VITE_PEER_HOST) return { debug: 0 };
  return {
    host: env.VITE_PEER_HOST,
    port: Number(env.VITE_PEER_PORT || 443),
    path: env.VITE_PEER_PATH || '/',
    secure: env.VITE_PEER_SECURE !== 'false',
    debug: 0,
  };
}

function friendlyError(err: PeerError<string>, code: string | null) {
  switch (err.type) {
    case 'peer-unavailable':
      return t('No room with code {code}. Check the code or ask the host to open the room again.', { code: code ?? '' });
    case 'browser-incompatible':
    case 'webrtc':
      return t('This browser can’t connect phones. Open the app in Safari or Chrome (not inside another app).');
    case 'network':
    case 'server-error':
    case 'socket-error':
    case 'socket-closed':
      return t('No connection to the room server. Check your internet and try again.');
    default:
      return t('Something went wrong with the connection. Try again.');
  }
}

export function RoomProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [role, setRole] = useState<'host' | 'guest' | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [cheers, setCheers] = useState<Cheers | null>(null);
  const [game, setGame] = useState<string | null>(null);
  const gameRef = useRef<string | null>(null);

  // Live connection objects live in refs: they change without needing a re-render.
  const peer = useRef<Peer | null>(null);
  const toHost = useRef<DataConnection | null>(null);
  const guests = useRef(new Map<string, DataConnection>()); // memberId → connection (host only)
  const membersRef = useRef<Member[]>([]);
  const codeRef = useRef<string | null>(null);
  const profileRef = useRef<Profile | null>(null);
  const listeners = useRef(new Set<GameListener>());
  const retry = useRef<{ timer?: number; since?: number }>({});
  const everConnected = useRef(false);
  const cheersKey = useRef(0);

  const showCheers = useCallback((name: string) => {
    setCheers({ key: ++cheersKey.current, name });
    sfx.pop();
    buzz([40, 50, 40]);
  }, []);

  const setAllMembers = (list: Member[]) => {
    membersRef.current = list;
    setMembers(list);
  };

  const emitGame = (data: unknown, fromId: string | null) => listeners.current.forEach((l) => l(data, fromId));

  const teardown = useCallback(() => {
    window.clearTimeout(retry.current.timer);
    retry.current = {};
    toHost.current?.close();
    toHost.current = null;
    guests.current.forEach((c) => c.close());
    guests.current.clear();
    peer.current?.destroy();
    peer.current = null;
  }, []);

  /* ---------------- Host ---------------- */

  const broadcastLobby = useCallback(() => {
    const msg: ToGuest = { t: 'lobby', code: codeRef.current ?? '', members: membersRef.current, game: gameRef.current };
    guests.current.forEach((c) => c.open && c.send(msg));
  }, []);

  const hostSend = (memberId: string, msg: ToGuest) => {
    const c = guests.current.get(memberId);
    if (c?.open) c.send(msg);
  };

  const host = useCallback(
    (profile: Profile, preferredCode?: string, attempt = 0) => {
      teardown();
      profileRef.current = profile;
      setRole('host');
      setStatus('connecting');
      setMessage(null);
      const roomCode = preferredCode ?? newRoomCode();
      if (!preferredCode) {
        gameRef.current = null;
        setGame(null);
      }
      codeRef.current = roomCode;
      setCode(roomCode);
      const p = new Peer(peerIdFor(roomCode), peerOptions());
      peer.current = p;

      p.on('open', () => {
        setStatus('open');
        saveRoom({ role: 'host', code: roomCode, game: gameRef.current });
        setAllMembers([{ id: profile.clientId, name: profile.name, avatar: profile.avatar, color: profile.color, host: true, online: true }]);
      });

      p.on('connection', (conn) => {
        let memberId: string | null = null;
        conn.on('data', (raw) => {
          const msg = raw as ToHost;
          if (msg.t === 'hello') {
            const pr = msg.profile;
            memberId = pr.clientId;
            // Same phone again (reconnect): replace the old connection, keep the seat.
            const old = guests.current.get(pr.clientId);
            if (old && old !== conn) old.close();
            guests.current.set(pr.clientId, conn);
            const others = membersRef.current.filter((m) => m.id !== pr.clientId);
            const existing = membersRef.current.find((m) => m.id === pr.clientId);
            const member: Member = { id: pr.clientId, name: pr.name, avatar: pr.avatar, color: pr.color, host: false, online: true };
            setAllMembers(existing ? membersRef.current.map((m) => (m.id === pr.clientId ? member : m)) : [...others, member]);
            if (!existing) {
              sfx.tick();
              buzz(20);
            }
            broadcastLobby();
          } else if (msg.t === 'cheers' && memberId) {
            const from = membersRef.current.find((m) => m.id === memberId)?.name ?? t('Someone');
            showCheers(from);
            guests.current.forEach((c) => c.open && c.send({ t: 'cheers', from } satisfies ToGuest));
          } else if (msg.t === 'game' && memberId) {
            emitGame(msg.data, memberId);
          }
        });
        conn.on('close', () => {
          if (!memberId || guests.current.get(memberId) !== conn) return;
          guests.current.delete(memberId);
          setAllMembers(membersRef.current.map((m) => (m.id === memberId ? { ...m, online: false } : m)));
          broadcastLobby();
        });
      });

      // Lost the signalling server (phone slept, network hiccup): reconnect, data links stay up.
      p.on('disconnected', () => {
        if (!p.destroyed) window.setTimeout(() => !p.destroyed && p.reconnect(), 1500);
      });

      p.on('error', (err) => {
        if (err.type === 'unavailable-id') {
          // Reopening our own room after a reload: the server may still hold the old
          // connection for a few seconds, so keep trying the same code (guests are waiting
          // on it). Otherwise someone else has this code: pick another one.
          if (preferredCode && attempt < HOST_SAME_CODE_TRIES) {
            p.destroy();
            window.setTimeout(() => host(profile, preferredCode, attempt + 1), 2000);
          } else host(profile);
          return;
        }
        if (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error') {
          if (membersRef.current.length) return; // room already running; 'disconnected' handles it
        }
        saveRoom(null);
        setStatus('error');
        setMessage(friendlyError(err, roomCode));
      });
    },
    [teardown, broadcastLobby, showCheers],
  );

  /* ---------------- Guest ---------------- */

  const connectToHost = useCallback(() => {
    const p = peer.current;
    const roomCode = codeRef.current;
    const profile = profileRef.current;
    if (!p || p.destroyed || !roomCode || !profile) return;
    if (p.disconnected) p.reconnect();
    const conn = p.connect(peerIdFor(roomCode), { reliable: true });
    toHost.current = conn;

    conn.on('open', () => {
      everConnected.current = true;
      saveRoom({ role: 'guest', code: roomCode });
      retry.current.since = undefined;
      conn.send({ t: 'hello', profile } satisfies ToHost);
      setStatus('open');
      setMessage(null);
    });

    conn.on('data', (raw) => {
      const msg = raw as ToGuest;
      if (msg.t === 'lobby') {
        setAllMembers(msg.members);
        gameRef.current = msg.game;
        setGame(msg.game);
      }
      else if (msg.t === 'cheers') showCheers(msg.from);
      else if (msg.t === 'game') emitGame(msg.data, null);
      else if (msg.t === 'bye') {
        teardown();
        saveRoom(null);
        setStatus('closed');
        setMessage(msg.reason === 'removed' ? t('The host removed you from the room.') : t('The host closed the room.'));
      }
    });

    conn.on('close', () => {
      if (toHost.current !== conn || !peer.current) return;
      scheduleRetry();
    });
  }, [teardown, showCheers]);

  const scheduleRetry = useCallback(() => {
    if (!peer.current) return;
    const since = (retry.current.since ??= Date.now());
    if (Date.now() - since > GUEST_GIVE_UP_MS) {
      teardown();
      saveRoom(null);
      setStatus('error');
      setMessage(t('Lost the connection to the host. Ask them to keep the app open, then join again.'));
      return;
    }
    setStatus('reconnecting');
    window.clearTimeout(retry.current.timer);
    retry.current.timer = window.setTimeout(connectToHost, GUEST_RETRY_MS);
  }, [teardown, connectToHost]);

  const join = useCallback(
    (roomCode: string, profile: Profile) => {
      teardown();
      profileRef.current = profile;
      codeRef.current = roomCode;
      everConnected.current = false;
      setCode(roomCode);
      setRole('guest');
      setStatus('connecting');
      setMessage(null);
      setAllMembers([]);
      const p = new Peer(peerOptions());
      peer.current = p;
      p.on('open', connectToHost);
      p.on('disconnected', () => {
        if (!p.destroyed) window.setTimeout(() => !p.destroyed && p.disconnected && p.reconnect(), 1500);
      });
      p.on('error', (err) => {
        if (err.type === 'peer-unavailable' && everConnected.current) {
          scheduleRetry(); // host is briefly gone (phone locked): keep trying
          return;
        }
        if (everConnected.current && (err.type === 'network' || err.type === 'server-error' || err.type === 'socket-error')) {
          scheduleRetry();
          return;
        }
        teardown();
        saveRoom(null);
        setStatus('error');
        setMessage(friendlyError(err, roomCode));
      });
    },
    [teardown, connectToHost, scheduleRetry],
  );

  // Coming back to the app after the phone was locked: reconnect right away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || !peer.current) return;
      if (peer.current.disconnected) peer.current.reconnect();
      if (role === 'guest' && !toHost.current?.open) {
        window.clearTimeout(retry.current.timer);
        retry.current.since = Date.now();
        connectToHost();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [role, connectToHost]);

  // After a reload: go straight back into the room this tab was in.
  useEffect(() => {
    const saved = savedRoom();
    const profile = load<Profile | null>('me', null);
    if (!saved || !profile?.name) return;
    if (saved.role === 'host') {
      // Reopen the room with the game that was running, so it can pick up where it was.
      gameRef.current = saved.game ?? null;
      setGame(saved.game ?? null);
      host(profile, saved.code);
    }
    else join(saved.code, profile);
  }, []);

  useEffect(() => teardown, [teardown]);

  const value = useMemo<RoomState>(
    () => ({
      status,
      role,
      code,
      members,
      message,
      cheers,
      host,
      join,
      leave: () => {
        saveRoom(null);
        if (role === 'host') guests.current.forEach((c) => c.open && c.send({ t: 'bye', reason: 'closed' } satisfies ToGuest));
        // Give the goodbye a moment to go out before the connections close.
        window.setTimeout(teardown, role === 'host' ? 300 : 0);
        setStatus('idle');
        setRole(null);
        setCode(null);
        setAllMembers([]);
        setMessage(null);
        gameRef.current = null;
        setGame(null);
      },
      game,
      myId: profileRef.current?.clientId ?? null,
      startGame: (id) => {
        if (role !== 'host') return;
        gameRef.current = id;
        setGame(id);
        saveRoom({ role: 'host', code: codeRef.current ?? '', game: id });
        broadcastLobby();
      },
      endGame: () => {
        if (role !== 'host') return;
        gameRef.current = null;
        setGame(null);
        saveRoom({ role: 'host', code: codeRef.current ?? '' });
        broadcastLobby();
      },
      removeMember: (id) => {
        if (role !== 'host') return;
        hostSend(id, { t: 'bye', reason: 'removed' });
        const c = guests.current.get(id);
        guests.current.delete(id);
        window.setTimeout(() => c?.close(), 300);
        setAllMembers(membersRef.current.filter((m) => m.id !== id));
        broadcastLobby();
      },
      sendCheers: () => {
        if (role === 'host') {
          const from = profileRef.current?.name ?? t('Host');
          showCheers(from);
          guests.current.forEach((c) => c.open && c.send({ t: 'cheers', from } satisfies ToGuest));
        } else if (toHost.current?.open) {
          toHost.current.send({ t: 'cheers' } satisfies ToHost);
        }
      },
      sendToHost: (data) => {
        if (!toHost.current?.open) return false;
        toHost.current.send({ t: 'game', data } satisfies ToHost);
        return true;
      },
      broadcast: (data) => guests.current.forEach((c) => c.open && c.send({ t: 'game', data } satisfies ToGuest)),
      sendTo: (memberId, data) => hostSend(memberId, { t: 'game', data }),
      onGame: (listener) => {
        listeners.current.add(listener);
        return () => listeners.current.delete(listener);
      },
    }),
    [status, role, code, members, message, cheers, game, host, join, teardown, broadcastLobby, showCheers],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useRoom() {
  const room = useContext(Ctx);
  if (!room) throw new Error('useRoom must be used inside <RoomProvider>');
  return room;
}
