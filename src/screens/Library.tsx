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

      <div className="chips">
        {chip(null, t('All'))}
        {CATEGORIES.map((c) => chip(c.id, `${c.emoji} ${t(c.label)}`))}
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
