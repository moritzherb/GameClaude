import GameCard from '../components/GameCard';
import TopBar from '../components/TopBar';
import { GAMES } from '../games/registry';
import { CATEGORIES, type CategoryId } from '../games/types';
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
      <h1 className="large-title">{current ? `${current.label} ${current.emoji}` : 'All games'}</h1>

      <div className="chips">
        {chip(null, 'All')}
        {CATEGORIES.map((c) => chip(c.id, `${c.emoji} ${c.label}`))}
      </div>

      <div className="game-grid">
        {games.map((g) => (
          <GameCard key={g.id} game={g} onOpen={() => navigate(paths.game(g.id))} />
        ))}
        <div className="game-card placeholder">
          <span className="game-card-emoji">＋</span>
          <span className="game-card-body">
            <span className="game-card-name">More soon</span>
            <span className="game-card-tagline">New games are on the way.</span>
          </span>
        </div>
      </div>
    </main>
  );
}
