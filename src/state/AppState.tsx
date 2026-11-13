import { createContext, useContext, useLayoutEffect, useMemo, type ReactNode } from 'react';
import { setLang, tx, type Lang } from '../i18n';
import { fxSettings } from '../lib/fx';
import { pick } from '../lib/random';
import { lookFor, platformFor, type Look, type PhoneSetting } from '../lib/platform';
import { usePersistentState } from '../lib/storage';
import { GROUND, setThemeColor } from '../lib/themeColor';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  /** A small photo, shown instead of the emoji (people added from a room, or this phone's own profile). */
  photo?: string;
  /** Who this is when it's someone from a room (their phone's id) or this phone's owner: their numbers are kept. */
  personId?: string;
}

/** Someone with a profile who can join the crew: a person met in a room, or this phone's owner. */
export interface CrewProfile {
  personId: string;
  name: string;
  avatar: string;
  color: string;
  photo?: string;
}

export interface Settings {
  sound: boolean;
  haptics: boolean;
  /** Everything gets even bigger. For later in the night. */
  bigMode: boolean;
  /** In games, only the table and the buttons you need: no status lines, counters or explanations. */
  clean?: boolean;
  /** The group knows the games: no tutorials or explanations in any game (the rules stay behind ?). */
  knowAll?: boolean;
  /** Older saves: games marked known one by one (still honoured; Settings now has the one switch). */
  known?: string[];
  /** App language. English is the default (and missing in older saves). */
  lang?: Lang;
  /** The app's look: the new one (missing: new) or the classic one. Only the look: games play the same. */
  look?: Look;
  /** In the new look, whose home screen: the phone's own (missing: auto), or always iPhone / Android. */
  phone?: PhoneSetting;
  /** The home screen's wallpaper (new look): a made one's id, 'photo', or missing for the plain ground. */
  wallpaper?: string;
}


export const AVATARS = [
  '🦄', '🐸', '🐙', '🦊', '🐼', '🐯', '🦖', '🐵', '🐧', '🦩', '🐨', '🦁', '🐷', '🐻', '🦆', '🐶', '🐱', '🐰',
  '🐮', '🐔', '🦉', '🐢', '🦈', '🐲', '👽', '🤖', '👻', '💀', '🎃', '🤠', '🥸', '😎', '🤡', '👑', '🍕', '🌮',
];
export const PLAYER_COLORS = ['#ff8a3d', '#ffc83d', '#6b95ff', '#3ddc97', '#ff7ac6', '#b49cff', '#ff5a4e', '#5fd3f3'];
/** What each of the players' colours is called (for screen readers). English; translate with t(). */
export const COLOR_NAMES: Record<string, string> = {
  '#ff8a3d': tx('Orange'),
  '#ffc83d': tx('Yellow'),
  '#6b95ff': tx('Blue'),
  '#3ddc97': tx('Green'),
  '#ff7ac6': tx('Pink'),
  '#b49cff': tx('Purple'),
  '#ff5a4e': tx('Red'),
  '#5fd3f3': tx('Turquoise'),
};
export const MAX_PLAYERS = 20;

interface AppState {
  players: Player[];
  addPlayer: (name: string) => void;
  removePlayer: (id: string) => void;
  /** Change a player's name and/or avatar. A name that's empty or taken by someone else is ignored. */
  updatePlayer: (id: string, patch: { name?: string; avatar?: string }) => void;
  clearPlayers: () => void;
  /** Add someone with a profile. Already in the crew: nothing happens. A player with the same name and
   *  no profile yet becomes them (their photo and numbers). */
  addProfile: (profile: CrewProfile) => void;
  /** Replace the whole list, e.g. with everyone in a room. */
  replacePlayers: (list: Omit<Player, 'id'>[]) => void;
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  /** True when the players know the games, or play with a clean table: tutorials and explanations
   *  stay hidden. */
  knows: (gameId: string) => boolean;
  ageConfirmed: boolean;
  confirmAge: () => void;
}

const Ctx = createContext<AppState | null>(null);

const DEFAULT_SETTINGS: Settings = { sound: true, haptics: true, bigMode: false };
const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Stored players, keeping only complete entries (damaged storage must never break the app). */
function cleanPlayers(raw: unknown): Player[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (p): p is Player =>
        isObject(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.avatar === 'string' && typeof p.color === 'string',
    )
    .map(({ id, name, avatar, color, photo, personId }) => ({
      id,
      name,
      avatar,
      color,
      ...(okPhoto(photo) ? { photo } : {}),
      ...(typeof personId === 'string' && personId ? { personId } : {}),
    }));
}

const okPhoto = (p: unknown): p is string => typeof p === 'string' && p.startsWith('data:image/') && p.length < 20_000;
const newId = () => crypto.randomUUID?.() ?? String(Date.now() + Math.random());

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
  // Also before the children render (and measure themselves): the look, and whose home screen.
  // Light or dark is the phone's own setting (the system's): the app has no switch of its own.
  if (typeof document !== 'undefined') {
    document.documentElement.dataset.look = lookFor(settings.look);
    document.documentElement.dataset.os = platformFor(settings.phone);
  }

  // The browser's bar (Android) and the strip under the clock take the look's ground colour
  // (index.html has the new look's).
  const look = lookFor(settings.look);
  useLayoutEffect(() => setThemeColor(GROUND[look][0], GROUND[look][1]), [look]);

  // Before the screen is drawn: with big text on, the first picture mustn't show it small.
  useLayoutEffect(() => {
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
              id: newId(),
              name: clean,
              avatar: pick(freeAvatars.length ? freeAvatars : AVATARS),
              color: PLAYER_COLORS[list.length % PLAYER_COLORS.length],
            },
          ];
        }),
      removePlayer: (id) => setPlayers((list) => list.filter((p) => p.id !== id)),
      updatePlayer: (id, patch) =>
        setPlayers((list) =>
          list.map((p) => {
            if (p.id !== id) return p;
            const name = patch.name?.trim().slice(0, 18);
            const nameOk = !!name && !list.some((o) => o.id !== id && o.name.toLowerCase() === name.toLowerCase());
            // Picking an emoji shows the emoji: the photo goes.
            return { ...p, ...(nameOk ? { name } : {}), ...(patch.avatar ? { avatar: patch.avatar, photo: undefined } : {}) };
          }),
        ),
      clearPlayers: () => setPlayers([]),
      addProfile: (pr) =>
        setPlayers((list) => {
          if (list.some((p) => p.personId === pr.personId)) return list;
          const fields = { name: pr.name.trim().slice(0, 18), avatar: pr.avatar, color: pr.color, photo: okPhoto(pr.photo) ? pr.photo : undefined, personId: pr.personId };
          const same = list.find((p) => !p.personId && p.name.toLowerCase() === fields.name.toLowerCase());
          if (same) return list.map((p) => (p === same ? { ...p, ...fields } : p));
          if (!fields.name || list.length >= MAX_PLAYERS) return list;
          // Someone else already goes by this name: a number tells them apart.
          let name = fields.name;
          for (let n = 2; list.some((p) => p.name.toLowerCase() === name.toLowerCase()); n++) name = `${fields.name.slice(0, 15)} ${n}`;
          return [...list, { id: newId(), ...fields, name }];
        }),
      replacePlayers: (list) => setPlayers(list.slice(0, MAX_PLAYERS).map((p) => ({ ...p, id: newId() }))),
      settings,
      updateSettings: (patch) => setSettings((s) => ({ ...s, ...patch })),
      knows: (gameId) => !!settings.clean || !!settings.knowAll || !!settings.known?.includes(gameId),
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
