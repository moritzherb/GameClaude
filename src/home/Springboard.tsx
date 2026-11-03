import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  /** The games in the order the user arranged them, and how to keep a new order. */
  games: GameDefinition[];
  onOrder: (ids: string[]) => void;
}

/**
 * The iPhone home screen: the crew and the last game as widgets, four rows of games under them,
 * the rest on the next page and the App Library last. The search pill sits above the dock and
 * shows the page dots while swiping.
 */
export default function Springboard({ players, recent, returning, dock, onSearch, onShuffle, games, onOrder }: HomeProps) {
  const grid = useRef<HTMLDivElement>(null);
  const rows = useRows(grid, 2, 4);
  const first = rows * 4;
  const pages = [games.slice(0, first), games.slice(first)].filter((p, i) => i === 0 || p.length);
  const pager = useRef<HTMLDivElement>(null);
  const main = useRef<HTMLElement>(null);
  const edit = useHomeEdit(main, games.map((g) => g.id), onOrder, pager);
  const [page, setPage] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const idle = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(idle.current), []);

  // Back from a game on the second page: that page again.
  useLayoutEffect(() => {
    const at = games.findIndex((g) => g.id === returning);
    const el = pager.current;
    if (el && at >= first) el.scrollLeft = el.clientWidth;
  }, [first, returning]);

  const onScroll = () => {
    const el = pager.current;
    if (!el) return;
    setPage(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    setSwiping(true);
    window.clearTimeout(idle.current);
    idle.current = window.setTimeout(() => setSwiping(false), 900);
  };
  const count = pages.length + 1;

  return (
    <main ref={main} className={`screen os-home ios${returning ? ' back' : ''}${edit.editing ? ' editing' : ''}`} {...edit.handlers}>
      <div className="sb-pages" ref={pager} onScroll={onScroll}>
        {pages.map((list, i) => (
          <section key={i} className="sb-page" aria-label={t('Page {n}', { n: i + 1 })}>
            {i === 0 && (
              <div className="sb-widgets">
                <CrewWidget players={players} />
                <LastWidget game={recent[0] ?? null} onShuffle={onShuffle} />
              </div>
            )}
            <div className="os-grid movable" ref={i === 0 ? grid : undefined}>
              {list.map((g) => (
                <GameApp key={g.id} game={g} returning={g.id === returning} />
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
      {/* While moving apps, Done takes the search pill's place. */}
      {edit.editing ? (
        <button type="button" className="sb-search os-done" onClick={edit.done}>
          {t('Done')}
        </button>
      ) : (
        <button type="button" className={`sb-search${swiping ? ' paging' : ''}`} onClick={onSearch} aria-label={t('Search')}>
          <span className="sb-search-label">
            <SearchIcon />
            {t('Search')}
          </span>
          <span className="sb-dots" aria-hidden>
            {Array.from({ length: count }, (_, i) => (
              <i key={i} className={i === page ? 'on' : ''} />
            ))}
          </span>
        </button>
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
