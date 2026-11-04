import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react';
import { SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { CATEGORIES, type Category, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import type { Player } from '../state/AppState';
import { useTopTint } from '../lib/useTopTint';
import { GameApp, GameGlyph, IconArt } from './AppIcon';
import { useHomeEdit, type Pager } from './useHomeEdit';
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
/** A finger this far sideways (more than up or down) is turning the page. */
const TURN = 10;
/** Let go past this share of the width, or this fast (px/ms), and the next page comes. */
const PAST = 0.25;
const FAST = 0.3;
/** The pages settling, as an iPhone's do. */
const SETTLE = 'transform 0.38s cubic-bezier(0.2, 0.8, 0.25, 1)';

/** The page home showed last (-1: the App Library): back from a game, it shows again. */
let lastPage = 0;

/**
 * The iPhone home screen: the crew and the last game as widgets, four rows of games under them,
 * the rest on the next page and the App Library last. Above the dock, the page dots. Pulling home
 * down brings the search, as on an iPhone: its field comes down from the top with the finger.
 *
 * The pages turn the phone's way, one per swipe: they follow the finger, and a short flick (or
 * past a quarter of the width) brings the next one, never further, never past the last.
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
  const count = pages.length + 1;

  const viewport = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  // Back from a game: the page it was opened on (the second, the App Library) again.
  const want = useRef(returning ? lastPage : 0);
  const [page, setPage] = useState(() => Math.max(0, want.current));
  const pageRef = useRef(page);
  const countRef = useRef(count);
  countRef.current = count;
  useEffect(
    () => () => {
      lastPage = pageRef.current === countRef.current - 1 ? -1 : pageRef.current;
    },
    [],
  );

  /** To page `n` (one of them), sliding there or at once. */
  const go = useCallback((n: number, slide = true) => {
    const el = strip.current;
    const to = Math.max(0, Math.min(countRef.current - 1, n));
    pageRef.current = to;
    want.current = to === countRef.current - 1 ? -1 : to;
    setPage(to);
    if (!el) return;
    el.style.transition = slide ? SETTLE : 'none';
    el.style.transform = `translate3d(${-to * 100}%, 0, 0)`;
  }, []);
  // Once the rows are measured (and with fewer pages, games taken off): the page wanted, if there.
  useLayoutEffect(() => {
    const w = want.current;
    go(w === -1 ? count - 1 : Math.min(w, count - 1), false);
  }, [go, count]);

  const pager = useMemo<Pager>(() => ({ page: () => pageRef.current, last: () => countRef.current - 2, go }), [go]);
  const edit = useHomeEdit(main, games.map((g) => g.id), onOrder, { pager, onRemove });
  const [folder, setFolder] = useState<Category | null>(null);

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
  const showPull = (dy: number) => {
    const el = peek.current;
    const pg = viewport.current;
    if (!el || !pg) return;
    const k = Math.min(1, dy / PULL);
    el.style.transform = `translateY(${Math.min(0, dy - PULL)}px)`;
    el.style.opacity = String(k);
    pg.style.transform = dy ? `translateY(${dy * 0.2}px)` : '';
    pg.style.opacity = dy ? String(1 - k * 0.25) : '';
  };
  const endPull = (open: boolean) => {
    for (const el of [peek.current, viewport.current]) if (el) el.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
    showPull(0);
    window.setTimeout(() => [peek.current, viewport.current].forEach((el) => el && (el.style.transition = '')), 260);
    if (open) onSearch();
  };

  /**
   * One finger on the pages: sideways turns them, down brings the search (not in the App Library,
   * which scrolls, nor while moving apps). A finger holding or moving an app is the app's.
   */
  const swipe = useRef<{ x: number; y: number; mode?: 'page' | 'pull' | 'none'; dx: number; dy: number; lib: boolean; trail: [number, number][] } | null>(null);
  const turnTo = (dx: number) => {
    const el = strip.current;
    const w = viewport.current?.clientWidth ?? 1;
    if (!el) return;
    const at = pageRef.current;
    // Past the first or the last page it gives only a little, as on the phone.
    const edge = (at === 0 && dx > 0) || (at === countRef.current - 1 && dx < 0);
    el.style.transform = `translate3d(${-at * w + (edge ? dx * 0.3 : dx)}px, 0, 0)`;
  };
  const onTouchStart = (e: ReactTouchEvent) => {
    const t0 = e.touches[0];
    swipe.current =
      e.touches.length > 1 ? null : { x: t0.clientX, y: t0.clientY, dx: 0, dy: 0, lib: !!(e.target as Element).closest('.sb-library'), trail: [[Date.now(), t0.clientX]] };
  };
  const onTouchMove = (e: ReactTouchEvent) => {
    const s = swipe.current;
    if (!s) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    s.dx = x - s.x;
    s.dy = y - s.y;
    if (!s.mode) {
      if (edit.holds()) return;
      if (Math.abs(s.dx) > TURN && Math.abs(s.dx) > Math.abs(s.dy)) {
        s.mode = 'page';
        if (strip.current) strip.current.style.transition = 'none';
        // From here the page follows the finger exactly.
        s.x = x;
        s.dx = 0;
      } else if (s.dy > 12 && !s.lib && !edit.editing) s.mode = 'pull';
      else if (Math.abs(s.dy) > 12) s.mode = 'none';
      else return;
    }
    if (s.mode === 'page') {
      if (edit.holds()) {
        // The finger took an app after all: the pages back where they were.
        s.mode = 'none';
        return go(pageRef.current);
      }
      s.trail.push([Date.now(), x]);
      if (s.trail.length > 6) s.trail.shift();
      turnTo(s.dx);
    } else if (s.mode === 'pull') {
      if (edit.editing) {
        // Held until the apps wiggle: this finger moves an app now.
        s.mode = 'none';
        return endPull(false);
      }
      const p = Math.max(0, s.dy - 12) * GIVE;
      for (const el of [peek.current, viewport.current]) if (el) el.style.transition = 'none';
      showPull(p);
    }
  };
  const onTouchEnd = () => {
    const s = swipe.current;
    swipe.current = null;
    if (s?.mode === 'page') {
      const w = viewport.current?.clientWidth ?? 1;
      // How fast it went at the end (the last few moves).
      const [t1, x1] = s.trail[0];
      const [t2, x2] = s.trail[s.trail.length - 1];
      const v = (x2 - x1) / Math.max(1, t2 - t1);
      const dir = Math.abs(v) > FAST ? -Math.sign(v) : Math.abs(s.dx) > w * PAST ? -Math.sign(s.dx) : 0;
      go(pageRef.current + dir);
    } else if (s?.mode === 'pull') endPull(Math.max(0, s.dy - 12) * GIVE >= PULL);
  };
  const onTouchCancel = () => {
    const s = swipe.current;
    swipe.current = null;
    if (s?.mode === 'page') go(pageRef.current);
    else if (s?.mode === 'pull') endPull(false);
  };

  // Without a finger: a sideways wheel or trackpad swipe turns a page, one at a time.
  const wheel = useRef(0);
  const onWheel = (e: ReactWheelEvent) => {
    if (Math.abs(e.deltaX) < 20 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
    const now = Date.now();
    if (now - wheel.current < 500) return;
    wheel.current = now;
    go(pageRef.current + Math.sign(e.deltaX));
  };

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
        ref={viewport}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
        onWheel={onWheel}
        // Tabbing into another page: that page shows (and nothing scrolls the pages by itself).
        onFocus={(e) => {
          const at = [...(strip.current?.children ?? [])].findIndex((c) => c.contains(e.target));
          if (viewport.current) viewport.current.scrollLeft = 0;
          if (at >= 0 && at !== pageRef.current) go(at);
        }}
      >
        <div className="sb-strip" ref={strip}>
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
                <LibraryGroup key={c.id} category={c} onOpen={() => setFolder(c)} />
              ))}
            </div>
          </section>
        </div>
      </div>
      {/* Above the dock just the page dots (a tap on one turns to it); while moving apps, Done there. */}
      {edit.editing ? (
        <button type="button" className="sb-search os-done" onClick={edit.done}>
          {t('Done')}
        </button>
      ) : (
        <div className="sb-dots-bar" aria-label={t('Page {n}', { n: page + 1 })}>
          <span className="sb-dots">
            {Array.from({ length: count }, (_, i) => (
              <button key={i} type="button" className={i === page ? 'on' : ''} onClick={() => go(i)} aria-label={t('Page {n}', { n: i + 1 })} />
            ))}
          </span>
        </div>
      )}
      <nav className="sb-dock" aria-label={t('Dock')}>
        {dock}
      </nav>
      {folder && <LibraryFolder category={folder} onClose={() => setFolder(null)} />}
    </main>
  );
}

const inCategory = (category: Category) => GAMES.filter((g) => g.categories.includes(category.id));

/** One folder of the App Library: three games big, the rest small in the fourth corner (a tap opens them all). */
export function LibraryGroup({ category, onOpen }: { category: Category; onOpen: () => void }) {
  const list = inCategory(category);
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
          <Tap className="lib-more" onClick={onOpen} ariaLabel={`${t(category.label)}: ${t('All games')}`}>
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

/**
 * A folder of the App Library opened: all its games over the blurred home screen, as the iPhone
 * opens one. A tap beside it (or Escape) closes it.
 */
function LibraryFolder({ category, onClose }: { category: Category; onClose: () => void }) {
  const [closing, setClosing] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useTopTint(wrap);
  const close = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, 180);
  }, [onClose]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);
  return (
    <div ref={wrap} className={`sb-folder-wrap${closing ? ' closing' : ''}`} onClick={(e) => e.target === e.currentTarget && close()}>
      <h2 className="sb-folder-title" onClick={close}>
        {t(category.label)}
      </h2>
      <div className="sb-folder" role="dialog" aria-modal="true" aria-label={t(category.label)} style={{ '--k': category.color } as CSSProperties}>
        <div className="os-grid sb-folder-grid">
          {inCategory(category).map((g) => (
            <GameApp key={g.id} game={g} />
          ))}
        </div>
      </div>
    </div>
  );
}
