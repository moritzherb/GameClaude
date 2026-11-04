import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DiceIcon, PeopleIcon, PersonIcon, SlidersIcon } from '../components/Icons';
import { findGame, GAMES, playableGames } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { getLang, t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { launch, lastLaunched } from '../lib/launch';
import { lineup } from '../lib/lineup';
import { pick } from '../lib/random';
import { recentGames } from '../lib/recent';
import { tintTop } from '../lib/themeColor';
import { useTopTint } from '../lib/useTopTint';
import { loadPhoto, wallpaperFor } from '../lib/wallpaper';
import { navigate, paths } from '../lib/router';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';
import { AppButton, GameGlyph, glyphsOf, IconArt } from './AppIcon';
import Launcher from './Launcher';
import { loadHidden, loadOrder, saveHidden, saveOrder } from './order';
import Search from './Search';
import Springboard from './Springboard';
import { usePlatform } from './usePlatform';

/**
 * Home in the new look: the phone's own home screen, an iPhone's on iPhones and an Android
 * phone's on Android. The games are its apps; opening one grows its page out of the icon.
 */
export default function PopHome() {
  const os = usePlatform();
  const { players, settings } = useApp();
  // The wallpaper; while home shows, the strip under the clock takes the colour of its top edge.
  const [photo] = useState(loadPhoto);
  const wall = wallpaperFor(settings.wallpaper, photo);
  useLayoutEffect(() => (wall.top ? tintTop(wall.top) : undefined), [wall.top]);
  const room = useRoom();
  const inRoom = room.status === 'open' || room.status === 'reconnecting';
  const [searching, setSearching] = useState(false);
  const [rolling, setRolling] = useState<GameDefinition | null>(null);
  const timer = useRef<number>(undefined);
  const landing = useRef<number>(undefined);
  useEffect(
    () => () => {
      window.clearInterval(timer.current);
      window.clearTimeout(landing.current);
    },
    [],
  );

  const [returning] = useState(() => lastLaunched());
  // The last three games played on this phone, newest first.
  const [recent] = useState(() => recentGames().map(findGame).filter((g): g is GameDefinition => !!g));
  // Android shows its favourites on the home screen: the recent games, then the line-up, then the rest.
  const [favorites] = useState(() => {
    const ids = [...recentGames(), ...lineup(GAMES.filter((g) => g.component || g.online).map((g) => g.id)), ...GAMES.map((g) => g.id)];
    return [...new Set(ids)].map(findGame).filter((g): g is GameDefinition => !!g);
  });
  // Where the user put the games (hold one to move them); until then, the order above.
  const all = GAMES.map((g) => g.id);
  const [order, setOrder] = useState(() => loadOrder(os, all) ?? (os === 'android' ? favorites.map((g) => g.id) : all));
  // The games taken off the home screen (still in the App Library, the search and the drawer).
  const [hidden, setHidden] = useState(() => loadHidden(os));
  const [removing, setRemoving] = useState<GameDefinition | null>(null);
  // Over the shuffle and the alert, the strip under the clock dims with them.
  const roulette = useRef<HTMLDivElement>(null);
  const alert = useRef<HTMLDivElement>(null);
  useTopTint(roulette, !!rolling);
  useTopTint(alert, !!removing);
  const ordered = order
    .filter((id) => !hidden.includes(id))
    .map(findGame)
    .filter((g): g is GameDefinition => !!g);
  const keepOrder = useCallback(
    (ids: string[]) => {
      setOrder(ids);
      saveOrder(os, ids);
    },
    [os],
  );
  const remove = (id: string) => {
    const next = [...hidden, id];
    setHidden(next);
    saveHidden(os, next);
    setRemoving(null);
  };

  // The shuffle, as on the classic home: a quick roulette of games, then the picked one opens.
  const shuffle = () => {
    const pool = playableGames();
    if (!pool.length) return navigate(paths.games());
    if (rolling) return;
    const target = pick(pool);
    let n = 0;
    setRolling(pick(GAMES));
    timer.current = window.setInterval(() => {
      n++;
      sfx.tick();
      buzz(5);
      if (n >= 14) {
        window.clearInterval(timer.current);
        setRolling(target);
        // Cleared if home goes away meanwhile (e.g. the host starts a game for the room).
        landing.current = window.setTimeout(() => {
          launch(document.querySelector('.os-roulette .app-icon'), target, () => navigate(paths.game(target.id)), glyphsOf(target));
          setRolling(null);
        }, 650);
      } else setRolling(pick(GAMES));
    }, 90);
  };

  const dock = (
    <>
      <AppButton label={t('Shuffle')} tone="lime" glyph={<DiceIcon />} onOpen={shuffle} />
      <AppButton
        label={(inRoom && room.code) || t('Together')}
        tone="dark"
        glyph={<PeopleIcon />}
        badge={inRoom ? room.members.filter((m) => m.online).length : undefined}
        onOpen={() => navigate(paths.room)}
      />
      <AppButton label={t('Your profile')} tone="dark" glyph={<PersonIcon />} onOpen={() => navigate(paths.profile)} />
      <AppButton label={t('Settings')} tone="dark" glyph={<SlidersIcon />} onOpen={() => navigate(paths.settings)} />
    </>
  );

  const lang = getLang();
  // "Tue 3 Nov" / "Di. 3. Nov."
  const date = new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).replace(',', '');
  const closeSearch = useCallback(() => setSearching(false), []);
  const common = {
    players,
    recent,
    returning,
    dock,
    wall,
    onSearch: () => setSearching(true),
    onShuffle: shuffle,
    onOrder: keepOrder,
    onRemove: (id: string) => setRemoving(findGame(id) ?? null),
  };

  return (
    <>
      {os === 'android' ? <Launcher {...common} favorites={ordered} date={date} /> : <Springboard {...common} games={ordered} />}
      {searching && <Search suggestions={recent.length ? recent : favorites.slice(0, 4)} onClose={closeSearch} />}
      {removing && (
        <div ref={alert} className="sheet-backdrop os-alert-wrap" onClick={(e) => e.target === e.currentTarget && setRemoving(null)}>
          <div className="os-alert" role="alertdialog" aria-modal="true" aria-labelledby="os-alert-title">
            <div className="os-alert-text">
              <h2 id="os-alert-title">{t('Remove “{name}”?', { name: t(removing.name) })}</h2>
              <p>{os === 'android' ? t('It stays with all games and in the search.') : t('It stays in the App Library and in the search.')}</p>
            </div>
            <button type="button" className="os-alert-btn danger" onClick={() => remove(removing.id)}>
              {t('Remove from home screen')}
            </button>
            <button type="button" className="os-alert-btn" onClick={() => setRemoving(null)}>
              {t('Cancel')}
            </button>
          </div>
        </div>
      )}
      {rolling && (
        <div ref={roulette} className="os-roulette" aria-live="polite">
          <div className="os-roulette-card">
            <IconArt color={rolling.color} size="lg">
              <GameGlyph game={rolling} />
            </IconArt>
            <span className="os-roulette-name">{t(rolling.name)}</span>
          </div>
          <span className="os-roulette-caption">{t('Picking your game…')}</span>
        </div>
      )}
    </>
  );
}
