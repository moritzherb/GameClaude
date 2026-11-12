import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { GAMES } from '../games/registry';
import { CATEGORIES, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import { useTopTint } from '../lib/useTopTint';
import { GameApp } from './AppIcon';
import { searchGames } from './search';
import type { HomeProps } from './Springboard';
import { useHomeEdit } from './useHomeEdit';
import { useRows } from './useRows';
import { CrewCookie, LastWidget } from './Widgets';

/**
 * The Android home screen (a Pixel's): the date and the crew at a glance, the shuffle on a cookie
 * and the last game as widgets, four rows of games, the dock and the search bar at the bottom.
 * All games sit in the drawer: a swipe up opens it, the search bar opens it searching.
 */
export default function Launcher({
  players,
  recent,
  favorites,
  onOrder,
  onRemove,
  returning,
  dock,
  wall,
  date,
  onShuffle,
}: Omit<HomeProps, 'games'> & { favorites: GameDefinition[]; date: string }) {
  /** The drawer: shut, open, or open with its search field ready to type in. */
  const [drawer, setDrawer] = useState<false | 'open' | 'search'>(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  const rows = useRows(grid, 2, 4);
  const main = useRef<HTMLElement>(null);
  const edit = useHomeEdit(main, favorites.map((g) => g.id), onOrder, { onRemove });

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
        if (s && !edit.editing && s.y - e.clientY > 70 && Math.abs(e.clientX - s.x) < 60) setDrawer('open');
        edit.handlers.onPointerUp(e);
      }}
    >
      <header className="la-glance">
        <span className="la-date">{date}</span>
      </header>
      <div className="la-widgets">
        <CrewCookie players={players} />
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
          <GameApp key={g.id} game={g} returning={g.id === returning} removable />
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
        <button type="button" className="la-search" onClick={() => setDrawer('search')}>
          <span className="la-mark" aria-hidden>
            p!
          </span>
          <span className="la-search-text">{t('Search games')}</span>
          <SearchIcon />
        </button>
      )}
      {drawer && <Drawer onClose={() => setDrawer(false)} searching={drawer === 'search'} returning={returning} />}
    </main>
  );
}

/**
 * All games, A to Z, in a sheet from the bottom, like the app drawer, with its search field on top:
 * typing there narrows the games right here. Swiping it down closes it (from anywhere on it while
 * the games are scrolled to the top).
 */
function Drawer({ onClose, searching, returning }: { onClose: () => void; searching: boolean; returning: string | null }) {
  const [closing, setClosing] = useState(false);
  const [query, setQuery] = useState('');
  const sheet = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  // The dim is its own layer, so closing can fade it while the sheet slides down (and the strip under
  // the clock goes along with it).
  const dim = useRef<HTMLDivElement>(null);
  useTopTint(dim);
  useEffect(() => {
    // Without scrolling: a phone would push the page up to show the field.
    if (searching) input.current?.focus({ preventScroll: true });
  }, [searching]);
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
  const shown = query.trim()
    ? searchGames(query, sorted, (g) => [t(g.name), t(g.tagline), ...g.categories.map((c) => t(CATEGORIES.find((x) => x.id === c)?.label ?? ''))])
    : sorted;
  return (
    <div ref={wrap} className={`sheet-backdrop la-drawer-wrap${closing ? ' closing' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <div ref={dim} className="la-drawer-dim" aria-hidden />
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
            input.current?.blur();
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
        <label className="la-drawer-search">
          <SearchIcon />
          <input
            ref={input}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            placeholder={t('Search games')}
            aria-label={t('Search games')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {shown.length ? (
          <div className="os-grid la-drawer-grid" ref={list}>
            {shown.map((g) => (
              <GameApp key={g.id} game={g} returning={g.id === returning} />
            ))}
          </div>
        ) : (
          <p className="la-drawer-none">{t('No game called “{q}”', { q: query.trim() })}</p>
        )}
      </div>
    </div>
  );
}
