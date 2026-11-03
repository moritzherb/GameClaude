import { useEffect, useRef, useState } from 'react';
import AppDie from '../components/AppDie';
import { ChevronUpIcon, SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { GAMES } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { GameApp, IconArt } from './AppIcon';
import type { HomeProps } from './Springboard';
import { CrewWidget, LastWidget } from './Widgets';

/** A Material "cookie": a circle with nine soft bumps, as a clip-path. */
const COOKIE = `polygon(${Array.from({ length: 72 }, (_, i) => {
  const a = (i / 72) * Math.PI * 2;
  const r = 46 + 4 * Math.cos(9 * a);
  return `${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`;
}).join(', ')})`;

/**
 * The Android home screen (a Pixel's): the date at a glance, Material widgets, a row or two of
 * favourite games, the dock and the search bar at the bottom. All games sit in the drawer:
 * swipe up (or tap the arrow) to open it.
 */
export default function Launcher({
  players,
  recent,
  favorites,
  returning,
  dock,
  date,
  headline,
  onSearch,
  onShuffle,
}: HomeProps & { favorites: GameDefinition[]; date: string; headline: string }) {
  const [drawer, setDrawer] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);

  return (
    <main
      className={`screen os-home android${returning ? ' back' : ''}`}
      onPointerDown={(e) => {
        start.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (s && s.y - e.clientY > 70 && Math.abs(e.clientX - s.x) < 60) setDrawer(true);
      }}
    >
      <div className="wallpaper" aria-hidden />
      <header className="la-glance">
        <span className="la-date">{date}</span>
        <span className="la-line">{headline}</span>
      </header>
      <div className="la-widgets">
        <CrewWidget players={players} />
        <Tap className="widget w-cookie" onClick={onShuffle} ariaLabel={t('Shuffle')}>
          <span className="w-cookie-shape" style={{ clipPath: COOKIE }} aria-hidden />
          <AppDie size={54} />
          <span className="w-cookie-label">{t('Shuffle')}</span>
        </Tap>
        {recent[0] ? (
          <LastWidget game={recent[0]} onShuffle={onShuffle} />
        ) : (
          <Tap className="widget w-last" onClick={() => navigate(paths.room)} ariaLabel={t('Together')}>
            <span className="w-pop">
              <IconArt color="#2a9d8f" size="lg">
                📱
              </IconArt>
            </span>
            <span className="w-kicker">{t('Together')}</span>
            <span className="w-title">{t('Every phone joins')}</span>
          </Tap>
        )}
      </div>
      <div className="os-grid la-grid">
        {favorites.map((g) => (
          <GameApp key={g.id} game={g} returning={g.id === returning} />
        ))}
      </div>
      <button type="button" className="la-up" onClick={() => setDrawer(true)}>
        <ChevronUpIcon />
        <span>{t('All games')}</span>
      </button>
      <nav className="la-dock" aria-label={t('Dock')}>
        {dock}
      </nav>
      <button type="button" className="la-search" onClick={onSearch}>
        <span className="la-mark" aria-hidden>
          p!
        </span>
        <span className="la-search-text">{t('Search games')}</span>
        <SearchIcon />
      </button>
      {drawer && (
        <Drawer
          onClose={() => setDrawer(false)}
          onSearch={() => {
            setDrawer(false);
            onSearch();
          }}
          returning={returning}
        />
      )}
    </main>
  );
}

/** All games, A to Z, in a sheet from the bottom, like the app drawer. */
function Drawer({ onClose, onSearch, returning }: { onClose: () => void; onSearch: () => void; returning: string | null }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const sorted = [...GAMES].sort((a, b) => t(a.name).localeCompare(t(b.name)));
  return (
    <div className="sheet-backdrop la-drawer-wrap" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="la-drawer" role="dialog" aria-modal="true" aria-label={t('All games')}>
        <button type="button" className="la-handle" onClick={onClose} aria-label={t('Close')} />
        <Tap className="la-drawer-search" onClick={onSearch}>
          <SearchIcon />
          <span>{t('Search games')}</span>
        </Tap>
        <div className="os-grid la-drawer-grid">
          {sorted.map((g) => (
            <GameApp key={g.id} game={g} returning={g.id === returning} />
          ))}
        </div>
      </div>
    </div>
  );
}
