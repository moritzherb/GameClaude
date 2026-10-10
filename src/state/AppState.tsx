import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { setLang, type Lang } from '../i18n';
import { fxSettings } from '../lib/fx';
import { pick } from '../lib/random';
import { usePersistentState } from '../lib/storage';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Everything gets even bigger. For later in the night. */
  bigMode: boolean;
  /** Games the group already knows: their in-game explanations are hidden. Missing in older saves. */
  known?: string[];
  /** App language. English is the default (and missing in older saves). */
  lang?: Lang;
}

export const AVATARS = ['🦄', '🐸', '🐙', '🦊', '🐼', '🐯', '🦖', '🐵', '🐧', '🦩', '🐨', '🦁', '🐷', '🐻', '🦆', '👽', '🤖', '👻', '🤠', '🥸', '😎', '🤡', '🍕', '🌮'];
export const PLAYER_COLORS = ['#ff8a3d', '#ffc83d', '#6b95ff', '#3ddc97', '#ff7ac6', '#b49cff', '#ff5a4e', '#5fd3f3'];
export const MAX_PLAYERS = 20;

interface AppState {
  players: Player[];
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  rerollAvatar: (id: string) => void;
  clearPlayers: () => void;
  /** Replace the whole list, e.g. with everyone in a room. */
  replacePlayers: (list: Omit<Player, 'id'>[]) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** True when the players marked this game as known, so tutorials and explanations stay hidden. */
  knows: (gameId: string) => boolean;
  setKnown: (gameId: string, known: boolean) => void;
  ageConfirmed: boolean;
  confirmAge: () => void;
}

const Ctx = createContext<AppState | null>(null);

const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, bigMode: false };
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Stored players, keeping only complete entries (damaged storage must never break the app). */
function cleanPlayers(raw: unknown): Player[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Player =>
      isObject(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.avatar === 'string' && typeof p.color === 'string',
  );
}

/** Stored settings over the defaults (missing or damaged values fall back to them). */
function cleanSettings(raw: unknown): Settings {
  if (!isObject(raw)) return DEFAULT_SETTINGS;
  const s = { ...DEFAULT_SETTINGS, ...raw } as Settings;
  return { ...s, known: Array.isArray(s.known) ? s.known.filter((k) => typeof k === 'string') : undefined };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = usePersistentState<Player[]>('players', [], cleanPlayers);
  const [settings, setSettings] = usePersistentState<Settings>('settings', DEFAULT_SETTINGS, cleanSettings);
  const [ageConfirmed, setAgeConfirmed] = usePersistentState('age-ok', false);
  // Set before the children render, so every t() call below uses the chosen language.
  setLang(settings.lang ?? 'en');

  useEffect(() => {
    fxSettings.sound = settings.sound;
    fxSettings.haptics = settings.haptics;
    document.documentElement.classList.toggle('big-mode', settings.bigMode);
  }, [settings]);

  const value = useMemo<AppState>(
    () => ({
      players,
      addPlayer: (name) =>
        setPlayers((list) => {
          const clean = name.trim().slice(0, 18);
          if (!clean || list.length >= MAX_PLAYERS) return list;
          const usedAvatars = new Set(list.map((p) => p.avatar));
          const freeAvatars = AVATARS.filter((a) => !usedAvatars.has(a));
          return [
            ...list,
            {
              id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()),
              name: clean,
              avatar: pick(freeAvatars.length ? freeAvatars : AVATARS),
              color: PLAYER_COLORS[list.length % PLAYER_COLORS.length],
            },
          ];
        }),
      removePlayer: (id) => setPlayers((list) => list.filter((p) => p.id !== id)),
      rerollAvatar: (id) =>
        setPlayers((list) => list.map((p) => (p.id === id ? { ...p, avatar: pick(AVATARS.filter((a) => a !== p.avatar)) } : p))),
      clearPlayers: () => setPlayers([]),
      replacePlayers: (list) =>
        setPlayers(list.slice(0, MAX_PLAYERS).map((p) => ({ ...p, id: crypto.randomUUID?.() ?? String(Date.now() + Math.random()) }))),
      settings,
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
      knows: (gameId) => !!settings.known?.includes(gameId),
      setKnown: (gameId, known) =>
        setSettings((s) => {
          const rest = (s.known ?? []).filter((id) => id !== gameId);
          return { ...s, known: known ? [...rest, gameId] : rest };
        }),
      ageConfirmed,
      confirmAge: () => setAgeConfirmed(true),
    }),
    [players, settings, ageConfirmed, setPlayers, setSettings, setAgeConfirmed],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const state = useContext(Ctx);
  if (!state) throw new Error('useApp must be used inside <AppProvider>');
  return state;
}
