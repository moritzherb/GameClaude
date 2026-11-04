import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { CATEGORIES, type Category, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import type { Player } from '../state/AppState';
import { GameApp, GameGlyph, IconArt } from './AppIcon';
import { useHomeEdit } from './useHomeEdit';
import { useRows } from './useRows';
import { GAMES } from '../games/registry';
import { CrewWidget, LastWidget } from './Widgets';

export interface HomeProps {
  players: Player[];
  recent: GameDefinition[];
  /** The game just closed, to let its icon settle back. */
  returning: string | null;
  /** The four apps in the dock. */
  dock: ReactNode;
  onSearch: () => void;
  onShuffle: () => void;
  /** The wallpaper (lib/wallpaper.ts). */
  wall: { background?: string; photo: boolean };
  /** The games in the order the user arranged them, and how to keep a new order. */
  games: GameDefinition[];
  onOrder: (ids: string[]) => void;
  /** The "−" on a wiggling app: take it off the home screen (after asking). */
  onRemove: (id: string) => void;
}

/** How far to pull home down before the search opens (px), and how much the finger's way counts. */
const PULL = 70;
const GIVE = 0.6;

/**
 * The iPhone home screen: the crew and the last game as widgets, four rows of games under them,
 * the rest on the next page and the App Library last. Above the dock, the page dots. Pulling home
 * down brings the search, as on an iPhone: its field comes down from the top with the finger.
 */
export default function Springboard({ players, recent, returning, dock, wall, onSearch, onShuffle, games, onOrder, onRemove }: HomeProps) {
  const grid = useRef<HTMLDivElement>(null);
  const rows = useRows(grid, 2, 4);
  const first = rows * 4;
  // The next pages have the first one's grid, from the top (no widgets there): the rows as far
  // apart as on the first page, as many as fit (about two more: the widgets' room).
  const [pitch, setPitch] = useState<{ gap: number; rows: number }>();
  const more = (pitch?.rows ?? rows + 2) * 4;
  const pages = [games.slice(0, first)];
  for (let i = first; i < games.length; i += more) pages.push(games.slice(i, i + more));
  const pager = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const edit = useHomeEdit(main, games.map((g) => g.id), onOrder, { pager, onRemove });
  const [page, setPage] = useState(0);

  useLayoutEffect(() => {
    const el = grid.current;
    const page = el?.closest<HTMLElement>('.sb-page');
    if (!el || !page) return;
    const measure = () => {
      const a = el.querySelectorAll<HTMLElement>('.app');
      if (a.length <= 4) return;
      const h = a[0].offsetHeight;
      const gap = a[4].offsetTop - a[0].offsetTop - h;
      const cs = getComputedStyle(page);
      // The page's height less its padding and the grid's top (6 px, in pop.css).
      const room = page.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 6;
      setPitch({ gap, rows: Math.max(rows, Math.floor((room + gap) / (h + gap))) });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [rows, games.length]);

  // Pulling down: the search field follows the finger from the top, home dims behind it a little.
  const peek = useRef<HTMLDivElement>(null);
  const pull = useRef<{ x: number; y: number; dy: number; on: boolean } | null>(null);
  const showPull = (dy: number) => {
    const el = peek.current;
    const pg = pager.current;
    if (!el || !pg) return;
    const k = Math.min(1, dy / PULL);
    el.style.transform = `translateY(${Math.min(0, dy - PULL)}px)`;
    el.style.opacity = String(k);
    pg.style.transform = dy ? `translateY(${dy * 0.2}px)` : '';
    pg.style.opacity = dy ? String(1 - k * 0.25) : '';
  };
  const endPull = (open: boolean) => {
    for (const el of [peek.current, pager.current]) if (el) el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    showPull(0);
    window.setTimeout(() => [peek.current, pager.current].forEach((el) => el && (el.style.transition = '')), 260);
    if (open) onSearch();
  };

  // Back from a game on the second page: that page again.
  useLayoutEffect(() => {
    const at = games.findIndex((g) => g.id === returning);
    const el = pager.current;
    if (el && at >= first) el.scrollLeft = el.clientWidth * (1 + Math.floor((at - first) / more));
  }, [first, more, returning]);

  const onScroll = () => {
    const el = pager.current;
    if (!el) return;
    setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const count = pages.length + 1;

  return (
    <main
      ref={main}
      className={`screen os-home ios${returning ? ' back' : ''}${edit.editing ? ' editing' : ''}${wall.background ? ' has-wall' : ''}${wall.photo ? ' wall-photo' : ''}`}
      style={{ ...(wall.background ? { background: wall.background } : {}), ...(pitch ? { '--sb-row-gap': `${pitch.gap}px` } : {}) } as CSSProperties}
      {...edit.handlers}
    >
      <div className="sb-peek" ref={peek} aria-hidden>
        <span className="sb-peek-field">
          <SearchIcon />
          {t('Search')}
        </span>
      </div>
      <div
        className="sb-pages"
        ref={pager}
        onScroll={onScroll}
        onTouchStart={(e) => {
          // Not while moving apps, nor in the App Library (it scrolls, and has its own search).
          const lib = (e.target as Element).closest('.sb-library');
          pull.current = edit.editing || lib || e.touches.length > 1 ? null : { x: e.touches[0].clientX, y: e.touches[0].clientY, dy: 0, on: false };
        }}
        onTouchMove={(e) => {
          const p = pull.current;
          if (!p) return;
          // Held until the apps wiggle: this finger moves an app now.
          if (edit.editing) {
            pull.current = null;
            if (p.on) endPull(false);
            return;
          }
          const dx = e.touches[0].clientX - p.x;
          const dy = e.touches[0].clientY - p.y;
          if (!p.on) {
            // Sideways is turning the page; down (more than sideways) is the search.
            if (Math.abs(dx) > 12 && Math.abs(dx) > dy) pull.current = null;
            else if (dy > 12) p.on = true;
            return;
          }
          p.dy = Math.max(0, dy - 12) * GIVE;
          for (const el of [peek.current, pager.current]) if (el) el.style.transition = 'none';
          showPull(p.dy);
        }}
        onTouchEnd={() => {
          const p = pull.current;
          pull.current = null;
          if (p?.on) endPull(p.dy >= PULL);
        }}
        onTouchCancel={() => {
          pull.current = null;
          endPull(false);
        }}
      >
        {pages.map((list, i) => (
          <section key={i} className={`sb-page${i ? ' sb-more' : ''}`} aria-label={t('Page {n}', { n: i + 1 })}>
            {i === 0 && (
              <div className="sb-widgets">
                <CrewWidget players={players} />
                <LastWidget game={recent[0] ?? null} onShuffle={onShuffle} />
              </div>
            )}
            <div className="os-grid movable" ref={i === 0 ? grid : undefined}>
              {list.map((g) => (
                <GameApp key={g.id} game={g} returning={g.id === returning} removable />
              ))}
            </div>
          </section>
        ))}
        <section className="sb-page sb-library" aria-label={t('App Library')}>
          <Tap className="sb-lib-search" onClick={onSearch}>
            <SearchIcon />
            {t('App Library')}
          </Tap>
          <div className="sb-folders">
            {CATEGORIES.map((c) => (
              <LibraryGroup key={c.id} category={c} />
            ))}
          </div>
        </section>
      </div>
      {/* Above the dock just the page dots; while moving apps, Done in their place. */}
      {edit.editing ? (
        <button type="button" className="sb-search os-done" onClick={edit.done}>
          {t('Done')}
        </button>
      ) : (
        <div className="sb-dots-bar" aria-label={t('Page {n}', { n: page + 1 })}>
          <span className="sb-dots" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <i key={i} className={i === page ? 'on' : ''} />
            ))}
          </span>
        </div>
      )}
      <nav className="sb-dock" aria-label={t('Dock')}>
        {dock}
      </nav>
    </main>
  );
}

/** One folder of the App Library: three games big, the rest small in the fourth corner. */
export function LibraryGroup({ category }: { category: Category }) {
  const list = GAMES.filter((g) => g.categories.includes(category.id));
  if (!list.length) return null;
  const many = list.length > 4;
  const big = list.slice(0, many ? 3 : 4);
  const rest = many ? list.slice(3, 7) : [];
  return (
    <div className="lib-group">
      <div className="lib-box" style={{ '--k': category.color } as CSSProperties}>
        {big.map((g) => (
          <GameApp key={g.id} game={g} />
        ))}
        {rest.length > 0 && (
          <Tap className="lib-more" onClick={() => navigate(paths.games(category.id))} ariaLabel={`${t(category.label)}: ${t('All games')}`}>
            {rest.map((g) => (
              <IconArt key={g.id} color={g.color} size="sm">
                <GameGlyph game={g} />
              </IconArt>
            ))}
          </Tap>
        )}
      </div>
      <span className="lib-label">{t(category.label)}</span>
    </div>
  );
}
