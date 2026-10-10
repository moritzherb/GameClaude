import { useEffect, useRef } from 'react';
import GameCard from '../components/GameCard';
import TopBar from '../components/TopBar';
import { GAMES } from '../games/registry';
import { CATEGORIES, type CategoryId } from '../games/types';
import { t } from '../i18n';
import { buzz, sfx } from '../lib/fx';
import { navigate, paths } from '../lib/router';

export default function Library({ category }: { category: CategoryId | null }) {
  // Playable games first, "coming soon" ones after.
  const games = GAMES.filter((g) => !category || g.categories.includes(category)).sort(
    (a, b) => Number(!a.component && !a.online) - Number(!b.component && !b.online),
  );
  const current = CATEGORIES.find((c) => c.id === category);

  // Bring the picked category into view. Only the strip scrolls: scrollIntoView would also move
  // the whole page on iPhones.
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const box = strip.current;
    const on = box?.querySelector<HTMLElement>('.chip.active');
    if (!box || !on) return;
    const left = on.offsetLeft - box.offsetLeft;
    if (left < box.scrollLeft || left + on.offsetWidth > box.scrollLeft + box.clientWidth) {
      box.scrollTo({ left: left - (box.clientWidth - on.offsetWidth) / 2, behavior: 'smooth' });
    }
  }, [category]);

  const chip = (id: CategoryId | null, label: string) => (
    <button
      key={id ?? 'all'}
      type="button"
      className={`chip${category === id ? ' active' : ''}`}
      onClick={() => {
        sfx.pop();
        buzz();
        navigate(paths.games(id ?? undefined));
      }}
    >
      {label}
    </button>
  );

  return (
    <main className="screen">
      <TopBar onBack={() => navigate(paths.home)} />
      <h1 className="large-title">{current ? t(current.label) : t('All games')}</h1>

      <div className="chips" ref={strip}>
        {chip(null, t('All'))}
        {CATEGORIES.map((c) => chip(c.id, t(c.label)))}
      </div>

      <div className="ticket-list">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onOpen={() => navigate(paths.game(g.id))} />
        ))}
        <div className="ticket-more">{t('More games on the way')}</div>
      </div>
    </main>
  );
}
