import { useEffect, useRef, useState } from 'react';
import { SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { GAMES } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { GameApp } from './AppIcon';
import type { HomeProps } from './Springboard';
import { useRows } from './useRows';
import { CookieWidget, CrewChip, LastWidget } from './Widgets';

/**
 * The Android home screen (a Pixel's): the date and the crew at a glance, the shuffle on a cookie
 * and the last game as widgets, four rows of games, the dock and the search bar at the bottom.
 * All games sit in the drawer: the search bar opens it, and so does a swipe up.
 */
export default function Launcher({
  players,
  recent,
  favorites,
  returning,
  dock,
  date,
  onSearch,
  onShuffle,
}: HomeProps & { favorites: GameDefinition[]; date: string }) {
  const [drawer, setDrawer] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const rows = useRows(grid, 2, 4);

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
      <header className="la-glance">
        <span className="la-date">{date}</span>
        <CrewChip players={players} />
      </header>
      <div className="la-widgets">
        <CookieWidget onShuffle={onShuffle} />
        {recent[0] ? (
          <LastWidget game={recent[0]} onShuffle={onShuffle} />
        ) : (
          <Tap className="widget w-last w-together" onClick={() => navigate(paths.room)} ariaLabel={t('Together')}>
            <span className="w-kicker">{t('Together')}</span>
            <span className="w-pop" aria-hidden>
              📱
            </span>
            <span className="w-title">{t('Every phone joins')}</span>
          </Tap>
        )}
      </div>
      <div className="os-grid la-grid" ref={grid}>
        {favorites.slice(0, rows * 4).map((g) => (
          <GameApp key={g.id} game={g} returning={g.id === returning} />
        ))}
      </div>
      <nav className="la-dock" aria-label={t('Dock')}>
        {dock}
      </nav>
      <button type="button" className="la-search" onClick={() => setDrawer(true)}>
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
