import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SearchIcon } from '../components/Icons';
import Tap from '../components/Tap';
import { GAMES } from '../games/registry';
import { CATEGORIES, type Category, type GameDefinition } from '../games/types';
import { t } from '../i18n';
import { navigate, paths } from '../lib/router';
import type { Player } from '../state/AppState';
import { GameApp, IconArt } from './AppIcon';
import { CrewWidget, LastWidget } from './Widgets';

/** Rows of icons under the widgets on the first page: as many as fit, three to four. */
const ROWS = [3, 4];

export interface HomeProps {
  players: Player[];
  recent: GameDefinition[];
  /** The game just closed, to let its icon settle back. */
  returning: string | null;
  /** The four apps in the dock. */
  dock: ReactNode;
  onSearch: () => void;
  onShuffle: () => void;
}

/**
 * The iPhone home screen: widgets and icons on pages to swipe through, the App Library as the
 * last page, the search pill above the glass dock. While swiping the pill shows the page dots.
 */
export default function Springboard({ players, recent, returning, dock, onSearch, onShuffle }: HomeProps) {
  const [first, setFirst] = useState(ROWS[0] * 4);
  const pages = [GAMES.slice(0, first), GAMES.slice(first)];
  const pager = useRef<HTMLDivElement>(null);
  const firstPage = useRef<HTMLElement>(null);

  // As many rows as the first page has room for under the widgets (a taller phone shows one more).
  useLayoutEffect(() => {
    const el = firstPage.current;
    const app = el?.querySelector<HTMLElement>('.os-grid .app');
    const widgets = el?.querySelector<HTMLElement>('.sb-widgets');
    if (!el || !app || !widgets) return;
    const room = el.clientHeight - widgets.offsetHeight - 26 - 12;
    const rows = Math.floor((room + 20) / (app.offsetHeight + 20));
    setFirst(Math.max(ROWS[0], Math.min(ROWS[1], rows)) * 4);
  }, []);
  const [page, setPage] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const idle = useRef<number>(undefined);
  useEffect(() => () => window.clearTimeout(idle.current), []);

  // Back from a game on the second page: that page again.
  useLayoutEffect(() => {
    const at = GAMES.findIndex((g) => g.id === returning);
    const el = pager.current;
    if (el && at >= 0) el.scrollLeft = at >= first ? el.clientWidth : 0;
    // Once the first page knows its rows.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [first]);

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
    <main className={`screen os-home ios${returning ? ' back' : ''}`}>
      <div className="wallpaper" aria-hidden />
      <div className="sb-pages" ref={pager} onScroll={onScroll}>
        <section className="sb-page" ref={firstPage} aria-label={t('Page {n}', { n: 1 })}>
          <div className="sb-widgets">
            <CrewWidget players={players} />
            <LastWidget game={recent[0] ?? null} onShuffle={onShuffle} />
          </div>
          <div className="os-grid">
            {pages[0].map((g) => (
              <GameApp key={g.id} game={g} returning={g.id === returning} />
            ))}
          </div>
        </section>
        <section className="sb-page" aria-label={t('Page {n}', { n: 2 })}>
          <div className="os-grid">
            {pages[1].map((g) => (
              <GameApp key={g.id} game={g} returning={g.id === returning} />
            ))}
          </div>
        </section>
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
      <nav className="sb-dock" aria-label={t('Dock')}>
        {dock}
      </nav>
    </main>
  );
}

/** One group of the App Library: three games big, the rest small in the fourth corner. */
export function LibraryGroup({ category }: { category: Category }) {
  const list = GAMES.filter((g) => g.categories.includes(category.id));
  if (!list.length) return null;
  const many = list.length > 4;
  const big = list.slice(0, many ? 3 : 4);
  const rest = many ? list.slice(3, 7) : [];
  return (
    <div className="lib-group">
      <div className="lib-box">
        {big.map((g) => (
          <GameApp key={g.id} game={g} />
        ))}
        {rest.length > 0 && (
          <Tap className="lib-more" onClick={() => navigate(paths.games(category.id))} ariaLabel={`${t(category.label)}: ${t('All games')}`}>
            {rest.map((g) => (
              <IconArt key={g.id} color={g.color} size="sm">
                {g.emoji}
              </IconArt>
            ))}
          </Tap>
        )}
      </div>
      <span className="lib-label">{t(category.label)}</span>
    </div>
  );
}
