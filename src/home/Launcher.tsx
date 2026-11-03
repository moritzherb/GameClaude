import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { GAMES } from '../games/registry';
import type { GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { GameApp } from './AppIcon';
import type { HomeProps } from './Springboard';
import { useHomeEdit } from './useHomeEdit';
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
  onOrder,
  returning,
  dock,
  wall,
  date,
  onSearch,
  onShuffle,
}: Omit<HomeProps, 'games'> & { favorites: GameDefinition[]; date: string }) {
  const [drawer, setDrawer] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const rows = useRows(grid, 2, 4);
  const main = useRef<HTMLElement>(null);
  const edit = useHomeEdit(main, favorites.map((g) => g.id), onOrder);

  return (
    <main
      ref={main}
      className={`screen os-home android${returning ? ' back' : ''}${edit.editing ? ' editing' : ''}${wall.background ? ' has-wall' : ''}${wall.photo ? ' wall-photo' : ''}`}
      style={wall.background ? { background: wall.background } : undefined}
      {...edit.handlers}
      onPointerDown={(e) => {
        start.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY };
        edit.handlers.onPointerDown(e);
      }}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        // Swiping up opens all games (not while moving apps).
        if (s && !edit.editing && s.y - e.clientY > 70 && Math.abs(e.clientX - s.x) < 60) setDrawer(true);
        edit.handlers.onPointerUp(e);
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
      <div className="os-grid la-grid movable" ref={grid}>
        {favorites.slice(0, rows * 4).map((g) => (
          <GameApp key={g.id} game={g} returning={g.id === returning} />
        ))}
      </div>
      <nav className="la-dock" aria-label={t('Dock')}>
        {dock}
      </nav>
      {/* While moving apps, Done takes the search bar's place. */}
      {edit.editing ? (
        <button type="button" className="la-search os-done" onClick={edit.done}>
          {t('Done')}
        </button>
      ) : (
        <button type="button" className="la-search" onClick={() => setDrawer(true)}>
          <span className="la-mark" aria-hidden>
            p!
          </span>
          <span className="la-search-text">{t('Search games')}</span>
          <SearchIcon />
        </button>
      )}
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

/**
 * All games, A to Z, in a sheet from the bottom, like the app drawer. Swiping it down closes it
 * (from anywhere on it while the games are scrolled to the top).
 */
function Drawer({ onClose, onSearch, returning }: { onClose: () => void; onSearch: () => void; returning: string | null }) {
  const [closing, setClosing] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const pull = useRef<{ y: number; t: number; dy: number; on: boolean } | null>(null);
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 230);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  const sorted = [...GAMES].sort((a, b) => t(a.name).localeCompare(t(b.name)));
  return (
    <div className={`sheet-backdrop la-drawer-wrap${closing ? ' closing' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div
        ref={sheet}
        className="la-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={t('All games')}
        onTouchStart={(e) => {
          const scrolled = (list.current?.scrollTop ?? 0) > 0 && list.current?.contains(e.target as Node);
          pull.current = scrolled ? null : { y: e.touches[0].clientY, t: Date.now(), dy: 0, on: false };
        }}
        onTouchMove={(e) => {
          const p = pull.current;
          const el = sheet.current;
          if (!p || !el) return;
          const dy = e.touches[0].clientY - p.y;
          if (!p.on) {
            // Up is scrolling the games; down, past a little, pulls the drawer.
            if (dy < -6) pull.current = null;
            if (dy < 8) return;
            p.on = true;
          }
          p.dy = Math.max(0, dy - 8);
          el.style.transition = 'none';
          el.style.transform = `translateY(${p.dy}px)`;
        }}
        onTouchEnd={() => {
          const p = pull.current;
          const el = sheet.current;
          pull.current = null;
          if (!p?.on || !el) return;
          el.style.transition = '';
          const fast = p.dy / Math.max(1, Date.now() - p.t) > 0.5;
          if (p.dy > 110 || fast) {
            el.style.transform = '';
            close();
          } else el.style.transform = '';
        }}
      >
        <button type="button" className="la-handle" onClick={close} aria-label={t('Close')} />
        <Tap className="la-drawer-search" onClick={onSearch}>
          <SearchIcon />
          <span>{t('Search games')}</span>
        </Tap>
        <div className="os-grid la-drawer-grid" ref={list}>
          {sorted.map((g) => (
            <GameApp key={g.id} game={g} returning={g.id === returning} />
          ))}
        </div>
      </div>
    </div>
  );
}
