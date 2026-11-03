import { useCallback, useEffect, useRef, useState } from 'react';
import AppDie from '../components/AppDie';
import Avatar from '../components/Avatar';
import { findGame, GAMES, playableGames } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { AppButton, IconArt } from '../home/AppIcon';
import Launcher from '../home/Launcher';
import Search from '../home/Search';
import Springboard from '../home/Springboard';
import { usePlatform } from '../home/usePlatform';
import { getLang, t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { headlineFor } from '../lib/headline';
import { launch, lastLaunched } from '../lib/launch';
import { lineup } from '../lib/lineup';
import { pick } from '../lib/random';
import { recentGames } from '../lib/recent';
import { navigate, paths } from '../lib/router';
import { useProfile } from '../net/profile';
import { useRoom } from '../net/RoomProvider';
import { useApp } from '../state/AppState';

/** The wallpaper's top colour, for the strip under the clock (light, dark). */
const TOP = { ios: ['#1a8a53', '#0c4a2d'], android: ['#3a9c63', '#173f28'] } as const;

/**
 * Home is the phone's own home screen: an iPhone's on iPhones, a Pixel's on Android. The games
 * are its apps; opening one grows its page out of the icon, as opening an app does.
 */
export default function Home() {
  const os = usePlatform();
  const { players } = useApp();
  const { profile } = useProfile();
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

  // The strip under the clock and the browser's bar take the wallpaper's colour while home shows.
  useEffect(() => {
    const metas = [...document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')];
    const before = metas.map((m) => m.content);
    metas.forEach((m) => (m.content = m.media.includes('dark') ? TOP[os][1] : TOP[os][0]));
    return () => metas.forEach((m, i) => (m.content = before[i]));
  }, [os]);

  const [returning] = useState(() => lastLaunched());
  // The last three games played on this phone, newest first.
  const [recent] = useState(() => recentGames().map(findGame).filter((g): g is GameDefinition => !!g));
  // Android shows a couple of rows on the home screen: the recent games, then a few at random.
  const [favorites] = useState(() => {
    const ids = [...recentGames(), ...lineup(GAMES.filter((g) => g.component || g.online).map((g) => g.id)), ...GAMES.map((g) => g.id)];
    return [...new Set(ids)]
      .map(findGame)
      .filter((g): g is GameDefinition => !!g)
      .slice(0, 8);
  });

  const shuffle = () => {
    const pool = playableGames();
    if (!pool.length || rolling) return;
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
          launch(document.querySelector('.os-roulette .app-icon'), target, () => navigate(paths.game(target.id)));
          setRolling(null);
        }, 650);
      } else setRolling(pick(GAMES));
    }, 90);
  };

  const dock = (
    <>
      <AppButton label={t('Shuffle')} color="#1f8f55" glyph={<AppDie size={30} />} onOpen={shuffle} />
      <AppButton
        label={(inRoom && room.code) || t('Together')}
        color="#2a9d8f"
        glyph="📱"
        badge={inRoom ? room.members.filter((m) => m.online).length : undefined}
        onOpen={() => navigate(paths.room)}
      />
      <AppButton label={t('Your profile')} color={profile.color} glyph={<Avatar avatar={profile.avatar} photo={profile.photo} />} onOpen={() => navigate(paths.profile)} />
      <AppButton label={t('Settings')} color="#8e9a93" glyph="⚙️" onOpen={() => navigate(paths.settings)} />
    </>
  );

  const lang = getLang();
  const headline = headlineFor(new Date().getHours(), lang);
  const date = new Date().toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
  const closeSearch = useCallback(() => setSearching(false), []);
  const common = { players, recent, returning, dock, onSearch: () => setSearching(true), onShuffle: shuffle };

  return (
    <>
      {os === 'android' ? (
        <Launcher {...common} favorites={favorites} date={date} headline={`${headline.top} ${headline.sticker}`} />
      ) : (
        <Springboard {...common} />
      )}
      {searching && <Search suggestions={recent.length ? recent : favorites.slice(0, 4)} onClose={closeSearch} />}
      {rolling && (
        <div className="os-roulette" aria-live="polite">
          <div className="os-roulette-card">
            <IconArt color={rolling.color} size="lg">
              {rolling.emoji}
            </IconArt>
            <span className="os-roulette-name">{t(rolling.name)}</span>
          </div>
          <span className="os-roulette-caption">{t('Picking your game…')}</span>
        </div>
      )}
    </>
  );
}
